/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/nfc/service.ts
import { OfflineToken } from '../blockchain/types';

type NFCEventType = 'readingError' | 'tokenReceived' | 'tokenSent' | 'stateChange';
type NFCState = 'inactive' | 'reading' | 'writing';

interface NFCEventMap {
    readingError: Error;
    tokenReceived: OfflineToken;
    tokenSent: OfflineToken;
    stateChange: NFCState;
}

export class NFCService {
    private ndef: any;
    private currentState: NFCState = 'inactive';
    private listeners: Map<NFCEventType, Set<(data: any) => void>> = new Map();
    private abortController: AbortController | null = null;

    constructor() {
        if ('NDEFReader' in window) {
            this.ndef = new (window as any).NDEFReader();
        }
    }

    async checkAvailability(): Promise<{ available: boolean; enabled: boolean }> {
        const hasNFC = 'NDEFReader' in window;
        if (!hasNFC) {
            return { available: false, enabled: false };
        }

        if (this.currentState === 'inactive') {
            try {
                // Quick test scan
                const testController = new AbortController();
                await this.ndef.scan({ signal: testController.signal });
                testController.abort();
                return { available: true, enabled: true };
            } catch {
                return { available: true, enabled: false };
            }
        }

        return { available: true, enabled: true };
    }

    async startReading(): Promise<void> {
        if (!this.ndef) throw new Error('NFC not available');
        if (this.currentState !== 'inactive') {
            await this.stop();
        }

        try {
            this.abortController = new AbortController();
            await this.ndef.scan({ signal: this.abortController.signal });

            this.ndef.addEventListener("reading", async ({ message }: any) => {
                try {
                    await this.handleReceivedMessage(message);
                } catch (error) {
                    this.emit('readingError', error as Error);
                }
            });

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
            this.updateState('writing');
            const message = this.encodeToken(token);
            await this.ndef.write({
                records: [{
                    recordType: "text",
                    data: message,
                    mediaType: "application/json"
                }]
            });
            this.emit('tokenSent', token);
        } catch (error) {
            console.error('Error sending token via NFC:', error);
            throw error;
        } finally {
            // Return to previous state or inactive
            this.updateState('inactive');
        }
    }

    private encodeToken(token: OfflineToken): string {
        return JSON.stringify(token);
    }

    private async handleReceivedMessage(message: any): Promise<void> {
        for (const record of message.records) {
            if (record.recordType === "text" && record.mediaType === "application/json") {
                try {
                    const tokenData = JSON.parse(record.data);
                    // Basic validation that the data is an OfflineToken
                    if (this.validateTokenData(tokenData)) {
                        this.emit('tokenReceived', tokenData);
                    }
                } catch {
                    this.emit('readingError', new Error('Invalid token data received'));
                }
            }
        }
    }

    private validateTokenData(data: any): data is OfflineToken {
        return (
            typeof data === 'object' &&
            data !== null &&
            typeof data.amount === 'string' &&
            typeof data.contractAddress === 'string'
            // Add more validation as needed
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

    // Typed event handling
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