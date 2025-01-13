/* eslint-disable @typescript-eslint/no-explicit-any */
// public/service-worker.ts
/// <reference lib="webworker" />
/// <reference lib="es2015" />

export { };

// Extend the ServiceWorkerGlobalScope
declare const self: ServiceWorkerGlobalScope & typeof globalThis;

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

const CACHE_NAME = 'offline-payment-cache-v1';
const OFFLINE_URLS = [
    '/',
    '/manifest',  // Next.js will handle the .json extension
    '/icon.png',
    '/icon-512.png'
];

self.addEventListener('install', ((event: ExtendedExtendableEvent) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(OFFLINE_URLS);
        })
    );
}) as EventListener);

self.addEventListener('fetch', ((event: ExtendedFetchEvent) => {
    // Skip if the request is for the manifest
    if (event.request.url.endsWith('/manifest')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
}) as EventListener);

// Handle NFC-specific events
self.addEventListener('message', ((event: MessageEvent<NFCMessage>) => {
    if (event.data?.type === 'NFC_DETECTED') {
        self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
                client.postMessage({
                    type: 'NFC_UPDATE',
                    payload: event.data.payload
                });
            });
        });
    }
}) as EventListener);