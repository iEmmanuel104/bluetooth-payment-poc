/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/nfc/service.ts
import { OfflineToken } from '../blockchain/types';

type NFCEventType = 'readingError' | 'tokenReceived' | 'tokenSent' | 'stateChange' | 'permissionNeeded' | 'deviceDetected';
type NFCState = 'inactive' | 'reading' | 'writing';

interface NFCEventMap {
    readingError: Error;
    tokenReceived: OfflineToken;
    tokenSent: OfflineToken;
    stateChange: NFCState;
    permissionNeeded: void;
    deviceDetected: { status: string };
}

export class NFCService {
    private ndef: any;
    private currentState: NFCState = 'inactive';
    private listeners: Map<NFCEventType, Set<(data: any) => void>> = new Map();
    private abortController: AbortController | null = null;
    private readingSetup = false;

    constructor() {
        if ('NDEFReader' in window) {
            this.initializeNFC();
        }
    }

    private async initializeNFC() {
        try {
            this.ndef = new (window as any).NDEFReader();

            // Register for Android intent handling
            if ('launchQueue' in window) {
                (window as any).launchQueue.setConsumer(async (launchParams: any) => {
                    if (launchParams.targetURL) {
                        console.log('Launched from NFC:', launchParams.targetURL);
                    }
                });
            }

            await this.setupReadingListener();
        } catch (error) {
            console.error('Failed to initialize NFC:', error);
        }
    }

    private async setupReadingListener() {
        if (!this.readingSetup && this.ndef) {
            try {
                // Add reading listener with proper error handling
                this.ndef.addEventListener("reading", async ({ message, serialNumber }: any) => {
                    console.log('NFC Device detected!', { serialNumber });
                    this.emit('deviceDetected', { status: 'Device detected' });

                    if (!message || !message.records) {
                        console.warn('No readable message found');
                        return;
                    }

                    try {
                        await this.handleReceivedMessage(message);
                    } catch (error) {
                        console.error('NFC Reading Error:', error);
                        this.emit('readingError', new Error('Failed to process NFC message'));
                    }
                });

                // Handle reading errors more gracefully
                this.ndef.addEventListener("readingerror", (event: any) => {
                    const errorDetails = event?.error || 'Unknown reading error';
                    console.warn('NFC Reading Error Event:', errorDetails);

                    // Don't throw error for common reading issues
                    if (errorDetails?.name === 'NotFoundError') {
                        console.log('Tag moved away too quickly');
                        return;
                    }

                    this.emit('readingError', new Error('Failed to read NFC tag: ' + errorDetails?.message));
                });

                // Set up scanning with more options
                await this.ndef.scan({
                    keepReading: true,
                    signal: this.abortController?.signal
                });

                this.readingSetup = true;
                console.log('NFC reading listener setup complete');
            } catch (error) {
                console.error('Error setting up NFC reading listener:', error);
                throw error;
            }
        }
    }

    async checkAvailability(): Promise<{ available: boolean; enabled: boolean }> {
        const hasNFC = 'NDEFReader' in window;
        if (!hasNFC) {
            return { available: false, enabled: false };
        }

        try {
            await this.requestPermission();
            await this.setupReadingListener();
            return { available: true, enabled: true };
        } catch (error) {
            console.error('NFC availability check error:', error);
            return { available: true, enabled: false };
        }
    }

    private async requestPermission(): Promise<void> {
        if ('permissions' in navigator) {
            try {
                const result = await navigator.permissions.query({ name: 'nfc' as PermissionName });

                // Handle permission states
                switch (result.state) {
                    case 'prompt':
                        this.emit('permissionNeeded', undefined);
                        break;
                    case 'denied':
                        throw new Error('NFC permission denied');
                    case 'granted':
                        // Try to register the website for NFC
                        if ('registerProtocolHandler' in navigator) {
                            try {
                                navigator.registerProtocolHandler(
                                    'web+nfc',
                                    `${window.location.origin}/?nfc=%s`
                                );
                            } catch (e) {
                                console.warn('Failed to register protocol handler:', e);
                            }
                        }
                        break;
                }

                // Listen for permission changes
                result.addEventListener('change', () => {
                    if (result.state === 'denied') {
                        this.updateState('inactive');
                        this.emit('readingError', new Error('NFC permission denied'));
                    }
                });
            } catch (error) {
                console.error('Permission query error:', error);
                throw error;
            }
        }
    }

    async startReading(): Promise<void> {
        if (!this.ndef) throw new Error('NFC not available');

        try {
            await this.requestPermission();
            await this.setupReadingListener();
            this.updateState('reading');
        } catch (error) {
            this.updateState('inactive');
            throw error;
        }
    }

    async stop(): Promise<void> {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.updateState('inactive');
    }

    async sendToken(token: OfflineToken): Promise<void> {
        if (!this.ndef) throw new Error('NFC not available');

        try {
            await this.requestPermission();
            this.updateState('writing');

            const message = this.encodeToken(token);
            const encoder = new TextEncoder();
            const tokenData = encoder.encode(message);

            // Try writing with both record types
            try {
                await this.ndef.write({
                    records: [
                        {
                            recordType: "mime",
                            mediaType: "application/json",
                            data: tokenData
                        },
                        // Fallback text record
                        {
                            recordType: "text",
                            data: message
                        }
                    ]
                });
            } catch (writeError) {
                console.warn('Failed first write attempt, trying alternative format:', writeError);
                // Fallback to simpler format if first attempt fails
                await this.ndef.write({
                    records: [
                        {
                            recordType: "text",
                            data: message
                        }
                    ]
                });
            }

            console.log('Token sent successfully:', token);
            this.emit('tokenSent', token);
        } catch (error) {
            console.error('Error sending token via NFC:', error);
            throw error;
        } finally {
            await this.startReading(); // Restart reading mode
        }
    }

    private encodeToken(token: OfflineToken): string {
        const tokenData = {
            ...token,
            timestamp: Date.now(),
            type: 'payment_token'
        };
        console.log('Encoding token:', tokenData);
        return JSON.stringify(tokenData);
    }

    private async handleReceivedMessage(message: any): Promise<void> {
        console.log('Raw NFC message received:', message);

        for (const record of message.records) {
            try {
                let tokenData: any = null;

                if (record.mediaType === "application/json") {
                    const decoder = new TextDecoder();
                    const jsonString = decoder.decode(record.data);
                    console.log('Decoded JSON:', jsonString);
                    tokenData = JSON.parse(jsonString);
                } else if (record.recordType === "text") {
                    // Handle text records as fallback
                    tokenData = JSON.parse(record.data);
                }

                if (tokenData && this.validateTokenData(tokenData)) {
                    console.log('Valid token received:', tokenData);
                    this.emit('tokenReceived', tokenData);
                    return;
                }
            } catch (error) {
                console.error('Error processing record:', error);
            }
        }

        console.warn('No valid token data found in message');
    }

    private validateTokenData(data: any): data is OfflineToken {
        const isValid = (
            typeof data === 'object' &&
            data !== null &&
            typeof data.amount === 'string' &&
            typeof data.contractAddress === 'string' &&
            data.type === 'payment_token'
        );

        if (!isValid) {
            console.warn('Invalid token data:', data);
        }

        return isValid;
    }

    private updateState(newState: NFCState): void {
        if (this.currentState !== newState) {
            console.log('NFC state change:', this.currentState, '->', newState);
            this.currentState = newState;
            this.emit('stateChange', newState);
        }
    }

    getState(): NFCState {
        return this.currentState;
    }

    on<T extends NFCEventType>(event: T, callback: (data: NFCEventMap[T]) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(callback);
    }

    off<T extends NFCEventType>(event: T, callback: (data: NFCEventMap[T]) => void): void {
        this.listeners.get(event)?.delete(callback);
    }

    private emit<T extends NFCEventType>(event: T, data: NFCEventMap[T]): void {
        this.listeners.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} listener:`, error);
            }
        });
    }
}