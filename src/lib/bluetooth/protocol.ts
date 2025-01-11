// src/lib/bluetooth/protocol.ts
import { OfflineToken } from '../blockchain/types';

export const PaymentProtocol = {
    SERVICE_UUID: '00001234-0000-1000-8000-00805f9b34fb',
    TOKEN_CHAR_UUID: '00001235-0000-1000-8000-00805f9b34fb',
    APPROVAL_CHAR_UUID: '00001236-0000-1000-8000-00805f9b34fb',
    MAX_CHUNK_SIZE: 20, // Bluetooth LE typical MTU size

    encodeToken(token: OfflineToken): ArrayBuffer {
        try {
            const tokenString = JSON.stringify(token);
            const encoder = new TextEncoder();
            return encoder.encode(tokenString).buffer as ArrayBuffer;
        } catch (error) {
            console.error('Error encoding token:', error);
            throw new Error('Failed to encode token data');
        }
    },

    decodeToken(buffer: ArrayBuffer): OfflineToken {
        try {
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(buffer);
            return JSON.parse(text);
        } catch (error) {
            console.error('Error decoding token:', error);
            throw new Error('Failed to decode token data');
        }
    }
};
