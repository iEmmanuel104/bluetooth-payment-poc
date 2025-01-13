/* eslint-disable @typescript-eslint/no-explicit-any */
// types/service-worker.d.ts
interface ExtendedFetchEvent extends FetchEvent {
    waitUntil(fn: Promise<any>): void;
    respondWith(response: Promise<Response> | Response): void;
}

interface ExtendedExtendableEvent extends ExtendableEvent {
    waitUntil(fn: Promise<any>): void;
}

interface NFCMessage {
    type: 'NFC_DETECTED' | 'NFC_UPDATE';
    payload: any;
}

declare global {
    interface WindowEventMap {
        'NFC_DETECTED': CustomEvent<NFCMessage>;
        'NFC_UPDATE': CustomEvent<NFCMessage>;
    }
}

export { };