import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve modern formats first; Next.js auto-negotiates with the browser.
    formats: ["image/avif", "image/webp"],

    // Cache optimised images for 60 days on the CDN edge.
    minimumCacheTTL: 60 * 60 * 24 * 60,

    remotePatterns: [
      // Unsplash – standard CDN
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      // Unsplash – premium / Plus CDN (some proxied URLs)
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
        pathname: "/**",
      },
      // Google user profile photos (Firebase Auth / Google OAuth avatars).
      // Even though avatars currently use a plain <img> tag, this prevents
      // a 404 crash if it is ever switched to <Image>.
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
