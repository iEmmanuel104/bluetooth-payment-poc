// src/lib/nfc/service.ts
import { OfflineToken } from '../blockchain/types';
import { PairingRole } from '@/types/bluetooth';

export class NFCService {
    private ndef: any;
    private currentRole: PairingRole = PairingRole.NONE;
    private listeners: Map<string, Function[]> = new Map();

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

        try {
            await this.ndef.scan();
            return { available: true, enabled: true };
        } catch {
            return { available: true, enabled: false };
        }
    }

    async startAsEmitter(): Promise<void> {
        if (!this.ndef) throw new Error('NFC not available');

        this.currentRole = PairingRole.EMITTER;
        this.emit('roleChange', PairingRole.EMITTER);
    }

    async advertiseAsReceiver(): Promise<void> {
        if (!this.ndef) throw new Error('NFC not available');

        try {
            this.currentRole = PairingRole.RECEIVER;
            this.emit('roleChange', PairingRole.RECEIVER);

            // Start NFC scanning
            await this.ndef.scan();

            this.ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
                this.handleReceivedMessage(message, serialNumber);
            });

        } catch (error) {
            console.error('Error starting NFC receiver:', error);
            this.currentRole = PairingRole.NONE;
            this.emit('roleChange', PairingRole.NONE);
            throw error;
        }
    }

    async sendToken(token: OfflineToken): Promise<void> {
        if (!this.ndef) throw new Error('NFC not available');
        if (this.currentRole !== PairingRole.EMITTER) {
            throw new Error('Must be in emitter mode to send tokens');
        }

        try {
            const message = this.encodeToken(token);
            await this.ndef.write({ records: [{ recordType: "text", data: message }] });
            this.emit('tokenSent', token);
        } catch (error) {
            console.error('Error sending token via NFC:', error);
            throw error;
        }
    }

    private encodeToken(token: OfflineToken): string {
        return JSON.stringify(token);
    }

    private async handleReceivedMessage(message: any, serialNumber: string): Promise<void> {
        try {
            for (const record of message.records) {
                if (record.recordType === "text") {
                    const tokenData = JSON.parse(record.data);
                    this.emit('paymentReceived', tokenData);
                }
            }
        } catch (error) {
            console.error('Error processing NFC message:', error);
        }
    }

    getCurrentRole(): PairingRole {
        return this.currentRole;
    }

    async resetRole(): Promise<void> {
        this.currentRole = PairingRole.NONE;
        this.emit('roleChange', PairingRole.NONE);
    }

    // Event handling
    on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);
    }

    off(event: string, callback: Function): void {
        const listeners = this.listeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    private emit(event: string, data: any): void {
        const listeners = this.listeners.get(event) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} listener:`, error);
            }
        });
    }
}