// app/manifest.ts
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Offline Payment App',
        short_name: 'Payment App',
        description: 'Offline-first payment system using Bluetooth and NFC',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
        protocol_handlers: [
            {
                protocol: 'web+nfc',
                url: '/?nfc=%s'
            },
            {
                protocol: 'web+payment',
                url: '/?payment=%s'
            }
        ],
        related_applications: [
            {
                platform: 'webapp',
                url: 'https://your-domain.com/manifest.json'  // Replace with your domain
            }
        ],
        shortcuts: [
            {
                name: 'Send Payment',
                url: '/send',
                icons: [{ src: '/icon.png', sizes: '192x192' }]
            },
            {
                name: 'Receive Payment',
                url: '/receive',
                icons: [{ src: '/icon.png', sizes: '192x192' }]
            }
        ],
        orientation: 'any',
        prefer_related_applications: false,
        categories: ['finance', 'utilities'],
        dir: 'auto',
        scope: '/',
        share_target: {
            action: '/share-target',
            method: 'POST',
            enctype: 'multipart/form-data',
            params: {
                title: 'title',
                text: 'text',
                url: 'url'
            }
        }
    }
}