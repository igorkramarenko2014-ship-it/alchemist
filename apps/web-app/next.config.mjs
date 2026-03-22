/** @type {import('next').NextConfig} */
const nextConfig = {
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
  webpack: (config, { dev }) => {
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
