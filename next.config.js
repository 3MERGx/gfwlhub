/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable TypeScript type checking during build
  typescript: {
    // We want the build to fail if there are type errors
    ignoreBuildErrors: false,
  },
  // Other Next.js config options...
};

module.exports = nextConfig;
