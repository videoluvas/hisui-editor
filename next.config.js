/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: [
    "@shotstack/shotstack-studio",
    "pixi.js",
    "pixi-filters",
    "howler",
    "opentype.js",
  ],
};

module.exports = nextConfig;