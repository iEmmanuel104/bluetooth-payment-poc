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
                        value: 'nfc=*, bluetooth=*'
                    },
                    {
                        key: 'Origin-Trial',
                        value: process.env.NEXT_PUBLIC_ORIGIN_TRIAL_TOKEN || ''
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
        }
    }
};

export default nextConfig;