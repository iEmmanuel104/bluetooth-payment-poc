// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    // Configure headers for Web Bluetooth and NFC
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        // Updated Permissions-Policy with more specific NFC permissions
                        key: 'Permissions-Policy',
                        value: 'nfc=*, bluetooth=*, web-nfc=self'
                    },
                    {
                        key: 'Origin-Trial',
                        value: process.env.NEXT_PUBLIC_ORIGIN_TRIAL_TOKEN || ''
                    },
                    {
                        // Add Cross-Origin-Opener-Policy for better security
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin'
                    },
                    {
                        // Add Cross-Origin-Embedder-Policy for better security
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'require-corp'
                    },
                    {
                        // Feature Policy for NFC
                        key: 'Feature-Policy',
                        value: 'nfc *; bluetooth *'
                    }
                ]
            }
        ];
    },

    // Update experimental features configuration
    experimental: {
        urlImports: {
            // Specify allowed URL patterns for imports
            allowedUris: [
                'https://*.cdnjs.cloudflare.com/**',
                'https://*.unpkg.com/**'
            ]
        },
        // Add modern features support
        webVitals: true,
        optimizeFonts: true,
        scrollRestoration: true
    },

    // Add security headers
    async rewrites() {
        return [
            {
                source: '/nfc-handler',
                destination: '/api/nfc-handler'
            }
        ];
    },

    // PWA optimization
    webpack: (config: import('webpack').Configuration, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
        // Add support for Web NFC in development
        if (dev && !isServer) {
            config.resolve = config.resolve || {};
            config.resolve.fallback = {
                ...config.resolve.fallback,
                crypto: require.resolve('crypto-browserify'),
                stream: require.resolve('stream-browserify'),
                buffer: require.resolve('buffer/')
            };
        }
        return config;
    },

    // Environment configuration
    env: {
        NEXT_PUBLIC_NFC_ENABLED: 'true',
        NEXT_PUBLIC_APP_MODE: process.env.NODE_ENV
    },

    // Progressive Web App configuration
    pwa: {
        dest: 'public',
        disable: process.env.NODE_ENV === 'development',
        register: true,
        scope: '/',
        sw: 'service-worker.js',
    }
};

export default nextConfig;