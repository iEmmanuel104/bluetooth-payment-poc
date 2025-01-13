import { OfflineToken } from "@/lib/blockchain/types";
import { PairingRole } from "./bluetooth";

// src/types/index.ts
export interface Token {
    id: string;
    amount: number;
    issueDate: number;
    expiryDate: number;
    signature: string;
    status: 'active' | 'spent' | 'expired';
}

export interface Wallet {
    address: string;
    balance: number;
    tokens: Token[];
}

export interface BluetoothProtocol {
    SERVICE_UUID: string;
    TOKEN_CHAR_UUID: string;
    APPROVAL_CHAR_UUID: string;
    encodeToken: (token: Token) => ArrayBuffer;
    decodeToken: (buffer: ArrayBuffer) => Token;
}

// Add Web Bluetooth types
declare global {
    interface Navigator {
        bluetooth: Bluetooth;
    }

    interface CustomRequestDeviceOptions {
        filters: Array<{
            services?: string[];
            name?: string;
            namePrefix?: string;
            manufacturerId?: number;
            serviceData?: { [key: string]: DataView };
        }>;
        optionalServices?: string[];
        acceptAllDevices?: boolean;
    }
}

export enum CommunicationType {
    BLUETOOTH = 'bluetooth',
    NFC = 'nfc'
}

export interface CommunicationConfig {
    type: CommunicationType;
    enabled: boolean;
}

export interface BluetoothDeviceInfo {
    id: string;
    name: string | null;
    connected: boolean;
    role?: PairingRole;
}

export interface ICommunicationService {
    getCurrentRole(): PairingRole;
    startAsEmitter(): Promise<void>;
    advertiseAsReceiver(): Promise<void>;
    sendToken(token: OfflineToken): Promise<void>;
    resetRole(): Promise<void>;
    checkAvailability(): Promise<{ available: boolean; enabled: boolean; }>;
    startScanning?(): Promise<BluetoothDeviceInfo[]>;
    connectToDevice?(deviceId: string): Promise<void>;
    on(event: string, callback: (event: string) => void): void;
    off(event: string, callback: (event: string) => void): void;
}
// Common event types for both services

export const CommunicationEvents = {
    ROLE_CHANGE: 'roleChange',
    CONNECTION_CHANGE: 'connectionChange',
    DEVICE_DISCOVERED: 'deviceDiscovered',
    DEVICE_DISCONNECTED: 'deviceDisconnected',
    PAYMENT_RECEIVED: 'paymentReceived',
    TOKEN_SENT: 'tokenSent'
} as const;

export type CommunicationEventType = keyof typeof CommunicationEvents;
