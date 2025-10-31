/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { 
      fs: false, 
      net: false, 
      tls: false,
    };
    
    // Ignore React Native dependencies that MetaMask SDK tries to import
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': require.resolve('./webpack-stubs/async-storage-stub.js'),
    };
    
    return config;
  },
  // Enable for Farcaster Mini App deployment
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.farcaster.xyz https://farcaster.xyz"
          }
        ],
      },
    ];
  },
}

module.exports = nextConfig