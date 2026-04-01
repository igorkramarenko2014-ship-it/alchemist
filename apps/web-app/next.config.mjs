/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Local escape hatch if ESLint blocks `next build` (CI should not set this). */
  eslint: {
    ignoreDuringBuilds: process.env.ALCHEMIST_NEXT_SKIP_ESLINT === '1',
  },
  // Tree-shake barrel imports from R3F stack (smaller client bundles).
  experimental: {
    optimizePackageImports: ['@react-three/fiber', '@react-three/drei'],
  },
  // R3F + strict mode double-mount can tear down WebGL in dev; keep orb stable.
  reactStrictMode: false,
  // Recompile local workspace packages on every dev/build — avoids “stuck on old shared-engine”
  transpilePackages: [
    '@alchemist/shared-engine',
    '@alchemist/shared-types',
    '@alchemist/shared-ui',
  ],
    webpack: (config, { dev, isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        url: false,
      };
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:fs': false,
        'node:path': false,
        'node:os': false,
        'node:crypto': false,
        'node:url': false,
      };
    }
    // macOS EMFILE: too many file watchers — apply to **server + client** dev compilers
    // (Next runs two webpack instances; only fixing the client left Watchpack failing on SSR.)
    if (dev) {
      // Avoid PackFileCacheStrategy restore crashes (`hasStartTime`, corrupt packs) that break `next dev`.
      // Trade-off: no persistent webpack disk cache in dev — compiles stay reliable.
      config.cache = false;
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 600,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/dist/**'],
      };
    }
    return config;
  },
};

export default nextConfig;
