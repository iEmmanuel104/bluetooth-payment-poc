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
                        key: 'Permissions-Policy',
                        value: 'nfc=*, bluetooth=*, web-nfc=self'
                    },
                    {
                        key: 'Origin-Trial',
                        value: process.env.NEXT_PUBLIC_ORIGIN_TRIAL_TOKEN || ''
                    },
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin'
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'require-corp'
                    },
                    {
                        key: 'Feature-Policy',
                        value: 'nfc *; bluetooth *'
                    }
                ]
            }
        ];
    },

    experimental: {
        urlImports: {
            allowedUris: [
                'https://*.cdnjs.cloudflare.com/**',
                'https://*.unpkg.com/**'
            ]
        }
    },

    // Add security headers
    async rewrites() {
        return [
            {
                source: '/manifest',
                destination: '/manifest.json'
            },
            {
                source: '/nfc-handler',
                destination: '/api/nfc-handler'
            }
        ];
    },

    webpack: (config: import('webpack').Configuration, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
        if (!isServer) {
            // Service Worker compilation
            if (config.module && config.module.rules) {
                config.module.rules.push({
                    test: /service-worker\.ts$/,
                    use: {
                        loader: 'ts-loader',
                        options: {
                            compilerOptions: {
                                lib: ['webworker', 'es2015'],
                                module: 'commonjs',
                            },
                        },
                    },
                });
            }

            // Add support for Web NFC in development
            if (dev) {
                config.resolve = config.resolve || {};
                config.resolve.fallback = {
                    ...config.resolve.fallback,
                    crypto: require.resolve('crypto-browserify'),
                    stream: require.resolve('stream-browserify'),
                    buffer: require.resolve('buffer/')
                };
            }
        }
        return config;
    },

    // Environment configuration
    env: {
        NEXT_PUBLIC_NFC_ENABLED: 'true',
        NEXT_PUBLIC_APP_MODE: process.env.NODE_ENV
    },
};

export default nextConfig;