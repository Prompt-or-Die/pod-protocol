import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Handle Node.js modules for client-side
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@coral-xyz/anchor$': require('path').resolve(__dirname, 'anchor-default.js'),
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      buffer: require.resolve("buffer"),
    };
    
    // Add buffer polyfill
    config.plugins = config.plugins || [];
    config.plugins.push(
      new (require('webpack')).ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      })
    );
    
    return config;
  },
  eslint: {
    // Allow production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
