/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  // Next.js 16 uses Turbopack by default; empty config silences "webpack config but no turbopack" error.
  turbopack: {},
  webpack: (config, { dev, isServer }) => {
    // Fix webpack cache issues on Windows/OneDrive
    // Use memory cache in development to avoid file permission issues with OneDrive
    if (dev) {
      config.cache = {
        type: 'memory',
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.wikipedia.org",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.wikimedia.org",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static.wikia.nocookie.net",
        port: "",
        pathname: "/gtawiki/images/**",
      },
      {
        protocol: "https",
        hostname: "cdn.akamai.steamstatic.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.pcgamingwiki.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.pcgamingwiki.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "thumbnails.pcgamingwiki.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.discordapp.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.discord.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.steamgriddb.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
