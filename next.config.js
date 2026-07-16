/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // webpackのinnerGraph最適化(pure expression解析)が、
      // 実際に使われているクラスの継承元を誤って null に
      // 置き換えてしまうバグ(webpack issue #17711)への対処。
      // restructure(fontkit経由でShotstack Studioが使用)の
      // xv クラスが本番ビルドでのみ extends null になり、
      // "Super constructor null of xv is not a constructor" を
      // 引き起こしていたのはこれが原因。
      config.optimization.innerGraph = false;
    }
    return config;
  },
};

module.exports = nextConfig;