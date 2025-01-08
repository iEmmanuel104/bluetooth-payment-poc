/** @type {import('next').NextConfig} */
const nextConfig = {
    // Configure headers for Web Bluetooth
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Permissions-Policy',
                        value: 'bluetooth=*'
                    }
                ]
            }
        ]
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