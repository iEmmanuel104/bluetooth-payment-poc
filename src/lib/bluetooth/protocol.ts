// src/lib/bluetooth/protocol.ts
import { Token } from '@/types';

export const PaymentProtocol = {
    SERVICE_UUID: '00001234-0000-1000-8000-00805f9b34fb',
    TOKEN_CHAR_UUID: '00001235-0000-1000-8000-00805f9b34fb',
    APPROVAL_CHAR_UUID: '00001236-0000-1000-8000-00805f9b34fb',

    encodeToken(token: Token): ArrayBuffer {
        return new Uint8Array(new TextEncoder().encode(JSON.stringify(token)).buffer).slice().buffer;
    },

    decodeToken(buffer: ArrayBuffer): Token {
        const decoder = new TextDecoder();
        const text = decoder.decode(buffer);
        return JSON.parse(text);
    }
};