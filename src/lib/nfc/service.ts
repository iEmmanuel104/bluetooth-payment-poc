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
    deviceDetected: { status: string; serialNumber?: string };
}

const isBrowser = typeof window !== 'undefined';

export class NFCService {
    private reader: any;
    private currentState: NFCState = 'inactive';
    private listeners: Map<NFCEventType, Set<(data: any) => void>> = new Map();
    private abortController: AbortController | null = null;
    private isReading = false;

    constructor() {
        if (isBrowser && 'NDEFReader' in window) {
            this.reader = new (window as any).NDEFReader();
        }
    }

    async checkAvailability(): Promise<{ available: boolean; enabled: boolean }> {
        if (!isBrowser || !this.reader) {
            return { available: false, enabled: false };
        }

        try {
            const permissionStatus = await this.requestPermission();
            return {
                available: true,
                enabled: permissionStatus === 'granted'
            };
        } catch (error) {
            console.error('NFC availability check error:', error);
            return { available: true, enabled: false };
        }
    }

    private async requestPermission(): Promise<PermissionState> {
        if (!isBrowser || !('permissions' in navigator)) {
            return 'denied';
        }

        try {
            const result = await navigator.permissions.query({ name: 'nfc' as PermissionName });

            if (result.state === 'prompt') {
                this.emit('permissionNeeded', undefined);
            }

            result.addEventListener('change', () => {
                if (result.state === 'denied') {
                    this.updateState('inactive');
                    this.emit('readingError', new Error('NFC permission denied'));
                }
            });

            return result.state;
        } catch (error) {
            console.error('Permission query error:', error);
            throw error;
        }
    }

    async startReading(): Promise<void> {
        if (!this.reader) throw new Error('NFC not available');
        if (this.isReading) return;

        try {
            const permissionStatus = await this.requestPermission();
            if (permissionStatus !== 'granted') {
                throw new Error('NFC permission not granted');
            }

            this.abortController = new AbortController();

            // Set up reading event listeners
            this.reader.addEventListener("reading", ({ message, serialNumber }: any) => {
                this.emit('deviceDetected', { status: 'Device detected', serialNumber });

                if (message?.records) {
                    this.handleReceivedMessage(message);
                }
            });

            this.reader.addEventListener("readingerror", () => {
                this.emit('readingError', new Error('Failed to read NFC tag'));
            });

            // Start scanning
            await this.reader.scan({ signal: this.abortController.signal });
            this.isReading = true;
            this.updateState('reading');

        } catch (error) {
            this.updateState('inactive');
            this.isReading = false;
            throw error;
        }
    }

    async stop(): Promise<void> {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.isReading = false;
        this.updateState('inactive');
    }

    async sendToken(token: OfflineToken): Promise<void> {
        if (!this.reader) throw new Error('NFC not available');

        try {
            const permissionStatus = await this.requestPermission();
            if (permissionStatus !== 'granted') {
                throw new Error('NFC permission not granted');
            }

            this.updateState('writing');

            const tokenData = {
                ...token,
                timestamp: Date.now(),
                type: 'payment_token'
            };

            // Create NDEF message with both JSON and text fallback
            const message = {
                records: [
                    {
                        recordType: "mime",
                        mediaType: "application/json",
                        data: JSON.stringify(tokenData)
                    },
                    {
                        recordType: "text",
                        data: JSON.stringify(tokenData)
                    }
                ]
            };

            await this.reader.write(message);
            this.emit('tokenSent', token);
            console.log('Token sent successfully:', token);

        } catch (error) {
            console.error('Error sending token via NFC:', error);
            throw error;
        } finally {
            // Resume reading mode after write
            this.updateState('reading');
            if (!this.isReading) {
                await this.startReading();
            }
        }
    }

    private async handleReceivedMessage(message: any): Promise<void> {
        for (const record of message.records) {
            try {
                let tokenData: any = null;

                if (record.mediaType === "application/json") {
                    tokenData = JSON.parse(record.data);
                } else if (record.recordType === "text") {
                    tokenData = JSON.parse(record.data);
                }

                if (tokenData && this.validateTokenData(tokenData)) {
                    this.emit('tokenReceived', tokenData);
                    return;
                }
            } catch (error) {
                console.error('Error processing record:', error);
            }
        }
    }

    private validateTokenData(data: any): data is OfflineToken {
        return (
            typeof data === 'object' &&
            data !== null &&
            typeof data.amount === 'string' &&
            typeof data.contractAddress === 'string' &&
            data.type === 'payment_token'
        );
    }

    private updateState(newState: NFCState): void {
        if (this.currentState !== newState) {
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