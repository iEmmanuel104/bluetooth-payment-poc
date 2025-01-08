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