// src/lib/bluetooth/protocol.ts
import { Token } from '@/types';

export const PaymentProtocol = {
    SERVICE_UUID: '00001234-0000-1000-8000-00805f9b34fb',
    TOKEN_CHAR_UUID: '00001235-0000-1000-8000-00805f9b34fb',
    APPROVAL_CHAR_UUID: '00001236-0000-1000-8000-00805f9b34fb',
    MAX_CHUNK_SIZE: 20, // Bluetooth LE typical MTU size

    encodeToken(token: Token): ArrayBuffer {
        try {
            // Simplify the token data for testing
            const tokenData = {
                id: token.id,
                amount: token.amount,
                status: token.status
            };

            const tokenString = JSON.stringify(tokenData);
            console.log('Token string:', tokenString);

            const encoder = new TextEncoder();
            const encodedData = encoder.encode(tokenString);

            return encodedData.buffer as ArrayBuffer;
        } catch (error) {
            console.error('Error encoding token:', error);
            throw new Error('Failed to encode token data');
        }
    },
    decodeToken(buffer: ArrayBuffer): Token {
        try {
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(buffer);
            console.log('Decoded text:', text);

            const data = JSON.parse(text);

            // Extract token data, ignoring version and timestamp
            const token: Token = {
                id: data.id,
                amount: data.amount,
                issueDate: data.issueDate,
                expiryDate: data.expiryDate,
                signature: data.signature,
                status: data.status
            };

            if (!token.id || !token.amount) {
                throw new Error('Invalid token format');
            }

            return token;
        } catch (error) {
            console.error('Error decoding token:', error);
            throw new Error('Failed to decode token data');
        }
    }
};
