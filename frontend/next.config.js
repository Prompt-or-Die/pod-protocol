/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for performance
  experimental: {
    // Use Turbo for faster builds
    turbo: {
      rules: {
        // Optimize for faster builds
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Only apply optimizations in production
    if (!dev && !isServer) {
      // Enable tree shaking
      config.optimization.usedExports = true;
      
      // Basic chunk splitting for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'commons',
            priority: 10,
            chunks: 'all',
          },
        },
      };

      // Additional optimizations can be added here
    }

    return config;
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    domains: [
      'images.unsplash.com',
      'avatars.githubusercontent.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
      },
    ],
  },

  // Basic optimizations
  compress: true,
  poweredByHeader: false,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;