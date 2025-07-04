/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for performance
  experimental: {
    // Optimize images
    optimizePackageImports: ['framer-motion', '@headlessui/react'],
  },

  // Transpile packages that need special handling
  transpilePackages: [
    '@pod-protocol/sdk',
    '@coral-xyz/anchor',
    '@lightprotocol/stateless.js',
    '@lightprotocol/compressed-token',
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-wallets',
    '@solana/rpc',
    '@solana/addresses',
    '@solana/signers',
    '@solana-program/system',
    '@solana-program/compute-budget',
    '@reown/appkit',
    '@reown/appkit-adapter-solana',
  ],

  // Turbopack configuration (moved from experimental)
  turbopack: {
    rules: {
      // Optimize for faster builds
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    // Enable SWC minification
    styledComponents: true,
  },

  // Security headers for enterprise deployment
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.solana.com *.phantom.app",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' wss: https: *.solana.com *.helius.com *.quicknode.pro",
              "worker-src 'self' blob:",
            ].join('; '),
          },
          // HSTS (Strict Transport Security)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },

  // Redirects for SEO and user experience
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/wallet',
        destination: '/',
        permanent: false,
      },
    ];
  },

  // Bundle optimization
  webpack: (config, { dev, isServer, webpack }) => {
    // Basic Node.js polyfills for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
        events: false,
        buffer: false,
      };
    }

    // Handle Node.js URI scheme by stripping the node: prefix
    const originalResolveLoader = config.resolveLoader;
    config.resolveLoader = {
      ...originalResolveLoader,
      alias: {
        ...originalResolveLoader?.alias,
        'node:events': 'events',
        'node:fs': 'fs',
        'node:path': 'path',
        'node:crypto': 'crypto',
        'node:stream': 'stream',
        'node:util': 'util',
        'node:url': 'url',
        'node:assert': 'assert',
        'node:buffer': 'buffer',
        'node:process': 'process',
      },
    };

    // Handle external dependencies that should not be bundled
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
        'encoding': 'commonjs encoding',
      });
    }

    // Fix for @coral-xyz/anchor default import issue
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/@coral-xyz\/anchor/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: [
            ['@babel/plugin-transform-modules-commonjs', { allowTopLevelThis: true }]
          ]
        }
      }
    });

    // Add module resolution for packages that might have import issues
    config.resolve.alias = {
      ...config.resolve.alias,
      'node:events': 'events',
      'node:fs': 'fs',
      'node:path': 'path',
      'node:crypto': 'crypto',
      'node:stream': 'stream',
      'node:util': 'util',
      'node:url': 'url',
      'node:assert': 'assert',
      'node:buffer': 'buffer',
      'node:process': 'process',
      // Handle anchor import issues
      '@coral-xyz/anchor$': '@coral-xyz/anchor/dist/cjs/index.js',
    };

    // Only apply optimizations in production
    if (!dev && !isServer) {
      // Enable tree shaking
      config.optimization.usedExports = true;
      
      // Split chunks for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            chunks: 'all',
          },
          solana: {
            test: /[\\/]node_modules[\\/]@solana[\\/]/,
            name: 'solana',
            priority: 20,
            chunks: 'all',
          },
          anchor: {
            test: /[\\/]node_modules[\\/]@coral-xyz[\\/]/,
            name: 'anchor',
            priority: 25,
            chunks: 'all',
          },
          framer: {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: 'framer',
            priority: 15,
            chunks: 'all',
          },
        },
      };

      // Optimize bundle size
      config.optimization.minimize = true;
    }

    // Handle SVG files
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    // Ignore node modules warnings
    config.ignoreWarnings = [
      /Module not found: Can't resolve 'encoding'/,
      /Module not found: Can't resolve 'node:*/,
      /Critical dependency: the request of a dependency is an expression/,
      /Module not found: Can't resolve 'utf-8-validate'/,
      /Module not found: Can't resolve 'bufferutil'/,
      /Attempted import error:/,
    ];

    // Performance monitoring in production
    if (!dev) {
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.BUNDLE_ANALYZE': JSON.stringify(process.env.ANALYZE || false),
          'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
        })
      );
    }

    // Add polyfills for Node.js core modules
    if (!isServer) {
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }

    return config;
  },

  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Performance and caching
  compress: true,
  generateEtags: true,
  poweredByHeader: false,

  // Environment variables validation (removed NODE_ENV as it's not allowed)
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    BUILD_TIME: new Date().toISOString(),
  },

  // Output configuration
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Logging configuration
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },

  // Development configuration
  ...(process.env.NODE_ENV === 'development' && {
    devIndicators: {
      buildActivity: true,
      buildActivityPosition: 'bottom-right',
    },
  }),

  // Static export configuration (if needed)
  ...(process.env.EXPORT === 'true' && {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true,
    },
  }),
};

module.exports = nextConfig;