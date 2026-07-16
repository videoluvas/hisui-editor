# CLAUDE.md — 開発ガイドライン

## デプロイ前チェック（必須）
コードを変更したらプッシュ前に必ず `npx tsc --noEmit` を実行し、
型エラーが 0 件であることを確認してからコミットすること。

## webpack 本番ビルドで `Super constructor null` が出たときの対処（禁止事項あり）

### 原因（確定）
webpack 公式 issue #17711 のバグ。rollup / TypeScript がカンマ演算子で複数クラスを
一つの変数宣言にまとめた出力に対し、webpack の **innerGraph（pure expression 解析）**
が継承元クラスを「未使用」と誤判定して `null` に差し替える。
`next dev`（開発ビルド）ではこの最適化が働かないため再現せず、
`next build`（本番ビルド）でのみ発生する。

### 正しい修正
`next.config.js` の webpack 設定で `optimization.innerGraph = false` を設定する：

```js
webpack: (config) => {
  config.optimization.innerGraph = false;
  return config;
}
```

### 禁止事項
次の対処は **原因と無関係なので絶対に行わないこと**：
- `transpilePackages` に Shotstack / pixi.js を追加する
- `resolve.alias` で pixi.js を別バンドルにリダイレクトする
- `NormalModuleReplacementPlugin` で pixi.js サブパスを置き換える
- `concatenateModules: false` でスコープホイスティングを無効化する

上記はすべて「pixi.js が原因」という誤った仮説に基づく対処であり、
実際の原因（webpack innerGraph バグ）には効果がない。
