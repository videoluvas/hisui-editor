const path = require("path");
const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // pixi.js 8 の ESM モジュールツリーを webpack が scope hoisting すると
      // クラス継承チェーンが壊れる。プリビルド済みの単一バンドル (pixi.mjs) に
      // ルートと全サブパス (pixi.js/app 等) をまとめてリダイレクトして回避する。
      const pixiBundle = path.resolve(__dirname, "node_modules/pixi.js/dist/pixi.mjs");
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^pixi\.js(\/.*)?$/, pixiBundle)
      );
    }
    return config;
  },
};

module.exports = nextConfig;