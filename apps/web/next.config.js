/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
    serverComponentsExternalPackages: [],
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  images: {
    // Disable Next.js image optimizer so static export works in Docker/API static mode.
    // This makes Next render normal <img> tags and read assets directly from /public.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
      },
      {
        protocol: 'https',
        hostname: 'openseadata.io',
      },
      {
        protocol: 'https',
        hostname: 'i.seadn.io',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    APP_VERSION: process.env.npm_package_version || '0.1.0',
  },
  
  transpilePackages: ['@cultural-arbitrage/shared'],
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  optimizeFonts: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // API routes configuration
  async rewrites() {
    // Sanitize NEXT_PUBLIC_API_URL so users can set either
    // - http://host:8000
    // - http://host:8000/
    // - http://host:8000/api
    // - http://host:8000/api/
    // and we will still route /api/* correctly to .../api/* (no double /api)
    const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    let base = raw.replace(/\/+$/, ''); // trim trailing slash
    if (base.toLowerCase().endsWith('/api')) {
      base = base.slice(0, -4); // drop trailing '/api'
    }

    return [
      {
        source: '/api/health',
        destination: `${base}/health`,
      },
      {
        source: '/api/:path*',
        destination: `${base}/api/:path*`,
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/api',
        destination: '/api/health',
        permanent: false,
      },
    ];
  },
  
  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Production optimizations
    if (!dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix',
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }
    
    return config;
  },
  
  // Removed standalone output for monorepo compatibility
  
  // Environment-specific configuration
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: {
        exclude: ['error', 'warn'],
      },
    },
  }),
}

module.exports = nextConfig