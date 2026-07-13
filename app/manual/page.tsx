"use client";

import { useState } from "react";

const GRAD  = "linear-gradient(45deg, #5184F0, #169385)";
const TEAL  = "#169385";
const BLUE  = "#5184F0";
const FONT  = "'Noto Sans JP', sans-serif";

// ─── TOC ─────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "overview",   label: "ヒスイAIとは" },
  { id: "start",      label: "はじめかた" },
  { id: "workspace",  label: "ワークスペース" },
  { id: "project",    label: "プロジェクト" },
  { id: "editor",     label: "動画編集エディタ" },
  { id: "files",      label: "ファイルパネル" },
  { id: "ai-image",   label: "AI 画像生成" },
  { id: "ai-video",   label: "AI 動画生成" },
  { id: "narration",  label: "AI ナレーション" },
  { id: "bgm",        label: "BGM 生成" },
  { id: "deco",       label: "装飾テロップ" },
  { id: "bulk",       label: "一括編集（AI）" },
  { id: "export",     label: "書き出し" },
  { id: "settings",   label: "ワークスペース設定" },
  { id: "conte",      label: "コンテ作成" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 64, scrollMarginTop: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 4, height: 28, borderRadius: 2, background: GRAD, flexShrink: 0 }} />
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b", fontFamily: FONT }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#334155", fontFamily: FONT,
        paddingLeft: 10, borderLeft: `3px solid ${TEAL}` }}>{title}</h3>
      <div style={{ paddingLeft: 2 }}>{children}</div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 12px", fontSize: 14, color: "#475569", lineHeight: 1.8, fontFamily: FONT }}>{children}</p>;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px",
      marginBottom: 12, ...style }}>{children}</div>
  );
}

function Callout({ color = BLUE, icon, children }: { color?: string; icon: string; children: React.ReactNode }) {
  const bg = color === TEAL ? "#f0fdf9" : "#eff6ff";
  const border = color === TEAL ? "#a7f3d0" : "#bfdbfe";
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 16px",
      display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start" }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, fontFamily: FONT }}>{children}</div>
    </div>
  );
}

function Badge({ label, color = "#5184F0" }: { label: string; color?: string }) {
  return (
    <span style={{ display: "inline-block", background: color + "18", color, border: `1px solid ${color}44`,
      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, fontFamily: FONT, marginRight: 6 }}>{label}</span>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: FONT }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontWeight: 700,
                borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: "1px solid #f1f5f9" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "9px 14px", color: "#334155", verticalAlign: "top" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepList({ steps }: { steps: { n: string | number; title: string; desc: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: GRAD, color: "#fff",
            fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 1, fontFamily: FONT }}>{s.n}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", fontFamily: FONT, marginBottom: 2 }}>{s.title}</div>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65, fontFamily: FONT }}>{s.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GridCards({ items }: { items: { icon: string; title: string; desc: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
      {items.map((it, i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>{it.icon}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", fontFamily: FONT, marginBottom: 4 }}>{it.title}</div>
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, fontFamily: FONT }}>{it.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ManualPage() {
  const [activeSection, setActiveSection] = useState("overview");

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: FONT }}>

      {/* ── Header ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 100,
        padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: GRAD, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 14 }}>✦</div>
          <span style={{ fontSize: 16, fontWeight: 800, backgroundImage: GRAD,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ヒスイAI</span>
          <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: 4 }}>マニュアル</span>
        </div>
        <a href="/" style={{ fontSize: 13, color: BLUE, textDecoration: "none", fontWeight: 600 }}>← エディタに戻る</a>
      </header>

      <div style={{ display: "flex", maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

        {/* ── Sidebar TOC ── */}
        <aside style={{ width: 220, flexShrink: 0, paddingTop: 32, paddingRight: 24, position: "sticky",
          top: 76, height: "calc(100vh - 76px)", overflowY: "auto" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em",
            margin: "0 0 10px", textTransform: "uppercase" }}>目次</p>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => scrollTo(s.id)}
                style={{ textAlign: "left", background: activeSection === s.id ? BLUE + "14" : "none",
                  border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 13,
                  color: activeSection === s.id ? BLUE : "#475569",
                  fontWeight: activeSection === s.id ? 700 : 400,
                  cursor: "pointer", fontFamily: FONT, transition: "all 0.15s" }}>
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Content ── */}
        <main style={{ flex: 1, minWidth: 0, paddingTop: 32, paddingBottom: 80, paddingLeft: 8 }}>

          {/* Hero */}
          <div style={{ background: GRAD, borderRadius: 16, padding: "36px 40px", marginBottom: 48, color: "#fff" }}>
            <h1 style={{ margin: "0 0 10px", fontSize: 28, fontWeight: 900, fontFamily: FONT }}>ヒスイAI マニュアル</h1>
            <p style={{ margin: 0, fontSize: 15, opacity: 0.9, lineHeight: 1.7 }}>
              AI を活用した動画・画像・ナレーション編集ツールの完全ガイドです。<br />
              各機能の使いかた・設定方法・よくある操作を説明します。
            </p>
          </div>

          {/* ─── 1. ヒスイAIとは ─── */}
          <Section id="overview" title="ヒスイAIとは">
            <P>
              ヒスイAIは、AIを使って動画・画像・ナレーション・BGMを生成し、
              Shotstack Studio の高度なタイムライン編集と組み合わせることができる
              ブラウザベースの動画制作ツールです。
            </P>
            <GridCards items={[
              { icon: "🎬", title: "AI動画生成", desc: "テキストプロンプトからAIが動画クリップを自動生成。3モデル対応。" },
              { icon: "🖼", title: "AI画像生成", desc: "高精度な画像をプロンプト1行から生成。4モデル対応。" },
              { icon: "🎤", title: "AIナレーション", desc: "30種類の音声、9トーン、5話速でリアルなTTSナレーションを生成。" },
              { icon: "🎵", title: "BGM生成", desc: "ジャンル・ムードを指定してオリジナルBGMをAIが作曲。" },
              { icon: "✨", title: "装飾テロップ", desc: "グラデーション・縁取り・グロー等を設定できる高品質テロップ。" },
              { icon: "✎", title: "AI一括編集", desc: "自然言語で「字幕を明朝体に」などプロジェクト全体を一括変更。" },
            ]} />
            <Callout icon="💡">
              ヒスイAIはワークスペース→プロジェクトの階層構造で管理されます。
              最初にワークスペースを作成し、その中にプロジェクトを作って編集を始めましょう。
            </Callout>
          </Section>

          {/* ─── 2. はじめかた ─── */}
          <Section id="start" title="はじめかた">
            <StepList steps={[
              { n: 1, title: "ログイン / アカウント作成", desc: "ページ左上の「ログイン / 新規登録」をクリックしてアカウントを作成またはログインします。" },
              { n: 2, title: "ワークスペースを作成", desc: "サイドパネル上部のワークスペース選択エリアから「新規作成」を選び、名前を入力して作成します。" },
              { n: 3, title: "プロジェクト（SEQ）を作成", desc: "プロジェクトタブの「新規プロジェクト作成」をクリック。タイトル・解像度・FPS・背景色を設定します。" },
              { n: 4, title: "ファイルをアップロード", desc: "ファイルパネルの「アップロード」ボタンから動画・画像・音声ファイルを追加します。" },
              { n: 5, title: "タイムラインに配置", desc: "ファイルをタイムラインにドラッグ＆ドロップするか、Shotstackエディタ上部の「ファイルを挿入」ボタンを使って配置します。" },
              { n: 6, title: "書き出し", desc: "左パネルの「書き出し」タブから書き出し方式を選んで動画を出力します。" },
            ]} />
          </Section>

          {/* ─── 3. ワークスペース ─── */}
          <Section id="workspace" title="ワークスペース">
            <P>
              ワークスペースはプロジェクト・ファイル・コンテをまとめるグループです。
              チームや用途ごとにワークスペースを分けて管理できます。
            </P>
            <SubSection title="ワークスペースの操作">
              <Table
                headers={["操作", "手順"]}
                rows={[
                  ["新規作成", "サイドパネル上部のワークスペース名横のドロップダウンを開き、名前を入力して作成"],
                  ["切り替え", "ドロップダウンから別のワークスペースを選択"],
                  ["名前変更", "ドロップダウン内の鉛筆アイコンをクリック → 名前を編集 → Enter で確定"],
                  ["削除", "ドロップダウン内のゴミ箱アイコン → 確認ダイアログで「削除」（ファイル・プロジェクトは保持）"],
                ]}
              />
            </SubSection>
            <SubSection title="ワークスペース設定">
              <P>
                各ワークスペースには画像・動画・ナレーション生成の共通ルールを設定できます。
                AIパネルやモーダル内の「設定」ボタンからアクセスします。
              </P>
              <Table
                headers={["タブ", "設定項目"]}
                rows={[
                  ["画像", "使用モデル / アスペクト比 / 共通ルール / NGプロンプト"],
                  ["動画", "使用モデル / 解像度 / 尺 / 共通ルール / NGプロンプト"],
                  ["ナレーション", "音声 / 話速 / トーン / 共通ルール / NGワード"],
                ]}
              />
            </SubSection>
          </Section>

          {/* ─── 4. プロジェクト ─── */}
          <Section id="project" title="プロジェクト（SEQ）">
            <P>
              プロジェクト（SEQ）は動画編集の作業単位です。
              1つのプロジェクトに1つのタイムライン（edit.json）が対応します。
            </P>
            <SubSection title="プロジェクトの作成">
              <Card>
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8, fontFamily: FONT }}>
                  <b>設定できる項目：</b><br />
                  • <b>タイトル</b>：プロジェクト名<br />
                  • <b>アスペクト比</b>：16:9 / 9:16 / 1:1 / 4:3 / 21:9<br />
                  • <b>解像度</b>：720p (1280×720) / 1080p (1920×1080) / 4K (3840×2160) ほか<br />
                  • <b>FPS</b>：24 / 30 / 60<br />
                  • <b>背景色</b>：カラーピッカーで任意の色
                </div>
              </Card>
            </SubSection>
            <SubSection title="自動保存">
              <P>
                編集内容はタイムライン変更のたびに自動保存されます。
                右上の保存パネルから保存モード（変更時 / 一定間隔）や手動保存が行えます。
                保存ログからスナップショットを復元することも可能です。
              </P>
            </SubSection>
          </Section>

          {/* ─── 5. 動画編集エディタ ─── */}
          <Section id="editor" title="動画編集エディタ">
            <P>
              中央エリアに Shotstack Studio が表示されます。
              キャンバスプレビューとタイムラインを使ってクリップを配置・編集できます。
            </P>
            <SubSection title="ツールバーボタン">
              <Table
                headers={["ボタン", "機能"]}
                rows={[
                  ["字幕を追加", "タイムラインの指定位置にテキストクリップを挿入（デフォルト: Noto Sans JP 72px 白色）"],
                  ["図形を追加", "シアン色の角丸矩形（SVG）を追加"],
                  ["ファイルを挿入", "アップロード済みファイルまたは新規ファイルをタイムラインに挿入"],
                  ["ファイルを差し替え", "タイムラインで選択中のクリップを別のファイルに差し替え（クリップ未選択時は無効）"],
                ]}
              />
            </SubSection>
            <SubSection title="タイムライン操作">
              <Table
                headers={["操作", "方法"]}
                rows={[
                  ["クリップ選択", "タイムライン上のクリップをクリック"],
                  ["クリップ移動", "クリップをドラッグして位置を変更"],
                  ["クリップのリサイズ", "クリップ端をドラッグして長さを変更"],
                  ["クリップ削除", "クリップを選択してDeleteキー（Shotstack標準操作）"],
                  ["ファイルをDnD", "ファイルパネルからタイムライン領域にドラッグ&ドロップ"],
                ]}
              />
            </SubSection>
            <SubSection title="クリップの再生成">
              <P>
                AI生成したクリップをタイムラインで選択すると、AIパネルに「再生成」ボタンが表示されます。
                クリックすると元の設定を引き継いだ再生成モーダルが開き、プロンプトやパラメータを調整して再生成できます。
              </P>
              <Callout icon="↻" color={TEAL}>
                「生成して差し替え」ボタンを使うと、再生成後にタイムライン上の元クリップを自動的に新しいファイルに置き換えます。
                元ファイルはファイルパネルに残ります。
              </Callout>
            </SubSection>
          </Section>

          {/* ─── 6. ファイルパネル ─── */}
          <Section id="files" title="ファイルパネル">
            <P>
              左サイドパネルの「ファイル」タブでワークスペース内の全メディアを管理します。
            </P>
            <SubSection title="自動フォルダ分類">
              <P>アップロード・生成されたファイルは自動的に以下のフォルダに振り分けられます。</P>
              <Table
                headers={["フォルダ", "対象ファイル"]}
                rows={[
                  ["AI 画像", "AI画像生成で作成した画像ファイル（image-〇〇.jpg など）"],
                  ["AI 動画", "AI動画生成で作成した動画ファイル（video-〇〇.mp4 など）"],
                  ["AI ナレーション", "AIナレーション生成で作成した音声ファイル（narration_〇〇.mp3 など）"],
                  ["装飾テロップ", "装飾テロップエディタで作成した画像ファイル（deco-telop-〇〇.png など）"],
                ]}
              />
            </SubSection>
            <SubSection title="ファイル操作">
              <Table
                headers={["操作", "方法"]}
                rows={[
                  ["アップロード", "「アップロード」ボタン → ファイル選択（画像30MB / 動画200MB / 音声100MB まで）"],
                  ["タイムラインに追加", "ファイルをタイムライン領域にドラッグ＆ドロップ"],
                  ["再生成モーダルを開く", "AI生成ファイルをダブルクリック（genMetaがある場合）"],
                  ["複数選択", "Ctrl/Cmd+クリック（個別）または Shift+クリック（範囲）"],
                  ["フォルダに移動", "ファイルを右クリック → 「フォルダに移動」で振り分け先を選択"],
                  ["削除", "ファイルを右クリック → 「削除」"],
                ]}
              />
            </SubSection>
            <SubSection title="表示モード">
              <P>ファイルパネル右上のアイコンで表示モードを切り替えられます。</P>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                {[["リスト", "ファイル名とアイコン一覧"],["小サムネイル", "2列グリッド"],["中サムネイル", "1列ワイド"]].map(([l, d]) => (
                  <Card key={l} style={{ flex: "1 1 140px", marginBottom: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", fontFamily: FONT, marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 12, color: "#64748b", fontFamily: FONT }}>{d}</div>
                  </Card>
                ))}
              </div>
            </SubSection>
            <Callout icon="📁">
              フォルダの折りたたみ状態はブラウザのローカルストレージに保存されるため、ページを再読み込みしても状態が維持されます。
            </Callout>
          </Section>

          {/* ─── 7. AI画像生成 ─── */}
          <Section id="ai-image" title="AI 画像生成">
            <P>
              AIパネルの「AI画像を生成」ボタンから起動します。
              テキストプロンプトを入力するだけで高品質な画像を生成できます。
            </P>
            <SubSection title="対応モデル">
              <Table
                headers={["モデル", "特徴", "推奨用途"]}
                rows={[
                  [<Badge label="Google Image Lite" />, "高速・バランス型", "通常の画像生成（推奨）"],
                  [<Badge label="Google Image Pro" />, "高品質・詳細表現", "こだわりのある画像"],
                  [<Badge label="Seedream 5.0 Pro" />, "超高品質・高コスト", "重要シーンのキービジュアル"],
                  [<Badge label="Reve AI" />, "独特のスタイル", "アート系・個性的な表現"],
                ]}
              />
            </SubSection>
            <SubSection title="設定項目">
              <Table
                headers={["項目", "選択肢"]}
                rows={[
                  ["アスペクト比", "16:9（横型・推奨）/ 9:16（縦型）/ 1:1（正方形）/ 4:3 / 3:4"],
                  ["プロンプト", "日本語・英語どちらでも入力可。シーンの内容・雰囲気・画風を具体的に記述"],
                  ["参照画像", "元画像を参照しながら生成（再生成モーダル時）。「参照して生成」のトグルでON/OFF"],
                ]}
              />
            </SubSection>
            <Callout icon="💡">
              ワークスペース設定の「共通ルール」に「テキスト排除、日本人描写デフォルト」などを設定しておくと、
              プロンプトに書かなくても毎回適用されます。
            </Callout>
            <SubSection title="生成フロー">
              <StepList steps={[
                { n: 1, title: "プロンプト入力", desc: "生成したい画像の内容を日本語または英語で入力します。" },
                { n: 2, title: "モデル・アスペクト比を選択", desc: "目的に合ったモデルとアスペクト比を選択します。" },
                { n: 3, title: "「AI画像を生成」をクリック", desc: "生成中は30秒〜数分かかる場合があります。" },
                { n: 4, title: "タイムラインに追加", desc: "プレビュー確認後、「タイムラインに追加」で現在の再生位置に挿入します。" },
              ]} />
            </SubSection>
          </Section>

          {/* ─── 8. AI動画生成 ─── */}
          <Section id="ai-video" title="AI 動画生成">
            <P>
              AIパネルの「AI動画を生成」ボタンから起動します。
              動画生成はタスクの非同期処理のため、生成完了まで1〜5分かかります。
            </P>
            <SubSection title="対応モデル">
              <Table
                headers={["モデル", "対応尺", "特徴"]}
                rows={[
                  [<Badge label="Seedance 1.5 Pro" />, "4 / 5 / 6 / 8 / 10 / 12秒", "汎用性の高い動画生成モデル"],
                  [<Badge label="Google Veo 3 Lite" />, "4 / 6 / 8秒", "Google製・高品質・軽量版"],
                  [<Badge label="Google Veo 3" />, "4 / 6 / 8秒", "Google製・最高品質"],
                ]}
              />
            </SubSection>
            <SubSection title="設定項目">
              <Table
                headers={["項目", "内容"]}
                rows={[
                  ["アスペクト比", "16:9（横型）/ 9:16（縦型）"],
                  ["尺（秒）", "モデルに応じた選択肢から選択（モデル変更時に自動調整）"],
                  ["プロンプト", "動画の動き・シーン・カメラワークを詳しく記述すると精度が上がります"],
                ]}
              />
            </SubSection>
            <Callout icon="⏳">
              動画生成は1〜5分かかることがあります。生成中はモーダルを閉じないでください。
              「キャンセル」ボタンで生成を中断することができます。
            </Callout>
            <SubSection title="生成フロー">
              <StepList steps={[
                { n: 1, title: "モデル・アスペクト比・尺を設定", desc: "目的に合った設定を選択します。" },
                { n: 2, title: "プロンプトを入力", desc: "動画の内容・動き・雰囲気を具体的に記述します。" },
                { n: 3, title: "「再生成する」をクリック", desc: "タスクが送信され、ポーリングによる進捗確認が始まります。" },
                { n: 4, title: "完了後にタイムラインへ追加", desc: "動画プレビューを確認して「タイムラインに追加」で配置します。" },
              ]} />
            </SubSection>
          </Section>

          {/* ─── 9. AIナレーション ─── */}
          <Section id="narration" title="AI ナレーション（TTS）">
            <P>
              AIパネルの「AIナレーションを生成」ボタンから起動します。
              Google Gemini TTS を使用した高品質な音声合成です。
            </P>
            <SubSection title="音声の選択">
              <Table
                headers={["種別", "音声名（抜粋）"]}
                rows={[
                  ["女性音声（15種）", "Zephyr / Kore / Leda / Aoede / Callirrhoe / Autonoe / Despina / Erinome ほか"],
                  ["男性音声（15種）", "Puck / Charon / Fenrir / Orus / Enceladus / Iapetus / Umbriel / Algieba ほか"],
                ]}
              />
              <P>各音声には「明るい」「説明的」「温かみのある」などの特性ラベルが表示されます。</P>
            </SubSection>
            <SubSection title="話速（Pacing）">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {[["とてもゆっくり"], ["ゆっくり"], ["標準"], ["やや速い"], ["速い"]].map(([l]) => (
                  <span key={l} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 20,
                    padding: "4px 12px", fontSize: 12, color: "#475569", fontFamily: FONT }}>{l}</span>
                ))}
              </div>
            </SubSection>
            <SubSection title="トーン（Tone）">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {["標準", "明るい", "落ち着いた", "真面目", "力強い", "優しい", "元気", "悲しい", "緊張感"].map(l => (
                  <span key={l} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 20,
                    padding: "4px 12px", fontSize: 12, color: "#475569", fontFamily: FONT }}>{l}</span>
                ))}
              </div>
            </SubSection>
            <Callout icon="💡">
              ナレーションの長さはテキスト量と話速によって変わります。
              生成後に音声プレイヤーで確認してからタイムラインに追加してください。
            </Callout>
          </Section>

          {/* ─── 10. BGM生成 ─── */}
          <Section id="bgm" title="BGM 生成">
            <P>
              AIパネルの「BGMを生成」ボタンから起動します。
              Google Lyria モデルを使って AI がオリジナル BGM を作曲します。
            </P>
            <SubSection title="設定項目">
              <Table
                headers={["項目", "選択肢"]}
                rows={[
                  ["ボーカル", "あり / なし（インスト）"],
                  ["ジャンル（8種）", "Pop / Jazz / Classical / Electronic / Cinematic / Ambient / Lo-fi / Rock"],
                  ["ムード（8種）", "Happy / Calm / Epic / Melancholic / Energetic / Mysterious / Romantic / Tense"],
                  ["カスタムプロンプト", "任意の文章で雰囲気・楽器・テンポなどを指定"],
                  ["尺", "自動（タイムライン全体の長さに合わせる）または 5〜300秒で手動指定"],
                ]}
              />
            </SubSection>
            <Callout icon="🎵">
              生成された BGM はタイムラインの先頭（start: 0）に音量 70%（0.7）で自動配置されます。
              配置後にタイムラインで位置・音量を調整できます。
            </Callout>
          </Section>

          {/* ─── 11. 装飾テロップ ─── */}
          <Section id="deco" title="装飾テロップエディタ">
            <P>
              AIパネルの「装飾テロップを追加」から起動します。
              1920×1080 のキャンバス上でテキストを WYSIWYG で装飾し、PNG 画像として書き出してタイムラインに追加します。
            </P>
            <SubSection title="テキスト設定">
              <Table
                headers={["項目", "内容"]}
                rows={[
                  ["フォント", "ゴシック / 明朝 / 丸ゴシック / インパクト / システムフォントなど 70種以上から選択"],
                  ["サイズ", "12〜400px（数値入力）"],
                  ["スタイル", "太字（B）/ 斜体（I）"],
                  ["テキスト揃え", "左 / 中央 / 右"],
                  ["文字間", "-20〜200px（文字間隔を広げる・詰める）"],
                  ["行間", "0.8〜4.0倍（行の高さを変更）"],
                  ["位置X / 位置Y", "0〜100% でキャンバス内の表示位置を指定。スナップボタンで端・中央に即座に合わせられます"],
                ]}
              />
            </SubSection>
            <SubSection title="文字色・グラデーション">
              <Table
                headers={["種別", "内容"]}
                rows={[
                  ["単色（solid）", "1色でベタ塗り。透明度も指定可"],
                  ["直線グラデーション（linear）", "2色グラデーション。角度（0〜360°）を指定"],
                  ["放射状グラデーション（radial）", "中心から外に向かうグラデーション"],
                  ["4点グラデーション（4color）", "四隅に色を設定した複雑なグラデーション"],
                ]}
              />
            </SubSection>
            <SubSection title="エフェクト">
              <Table
                headers={["エフェクト", "設定項目"]}
                rows={[
                  ["縁取り（複数レイヤー）", "種類（edge / depth）/ 幅 / 色 / 透明度 / グラデーション / 深度角度など"],
                  ["ドロップシャドウ", "色 / 透明度 / ぼかし / X・Yオフセット"],
                  ["光彩（グロー）", "色 / 透明度 / ぼかし量 / 強度（1〜10）"],
                  ["光沢（グロス）", "強度 / サイズ / 角度"],
                  ["テクスチャ", "画像URL指定 / 透明度 / スケール（10〜500%）"],
                  ["背景パネル", "色 / 透明度 / パディング / 角丸半径"],
                ]}
              />
            </SubSection>
            <SubSection title="プリセット（16種）">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
                {["白・縁取り", "黄・縁取り", "白・影", "黒・白縁", "赤・縁取り", "ゴールド", "ゴールド光沢",
                  "ネオン青", "白・ドロップ", "白・背景", "白・細縁", "白・太縁", "オレンジ", "シアン・縁", "エレガント", "二重縁取り"
                ].map(p => (
                  <div key={p} style={{ background: "#f1f5f9", borderRadius: 8, padding: "6px 10px",
                    fontSize: 12, color: "#475569", fontFamily: FONT }}>{p}</div>
                ))}
              </div>
            </SubSection>
            <SubSection title="ユーザープリセット">
              <P>
                自分でカスタマイズしたスタイルを「プリセットを保存」でクラウドに保存できます。
                保存済みプリセットはドラッグで並べ替え、名前変更、削除が可能です。
              </P>
            </SubSection>
            <SubSection title="再編集">
              <P>
                ファイルパネルの装飾テロップファイルをダブルクリック、またはタイムラインで選択してAIパネルの「再加工」ボタンを押すと、
                作成時の設定を引き継いでエディタが開きます。
              </P>
            </SubSection>
          </Section>

          {/* ─── 12. 一括編集 ─── */}
          <Section id="bulk" title="一括編集（AI プロンプト編集）">
            <P>
              AIパネルの「プロンプトで全体編集」から起動します。
              自然言語で指示するだけで、プロジェクト全体のクリップを一括変更できます。
            </P>
            <SubSection title="編集カテゴリ">
              <Table
                headers={["カテゴリ", "できること", "プロンプト例"]}
                rows={[
                  ["A. 字幕編集", "フォント / 色 / サイズ / 文字間 / 行間 / 位置 / シャドウ / フェード", "「字幕を明朝体にして」「文字間を広げて」"],
                  ["B. 尺・タイミング", "シーン長の統一 / 音声同期 / 全体尺の比例縮小", "「全シーンを5秒に統一して」"],
                  ["C. トランジション", "フェード / ワイプ / スライド / ズーム / リビールの追加・削除", "「フェードトランジションを追加」"],
                  ["D. フィルター", "モノクロ / ぼかし / 明暗 / コントラストなどの適用・削除", "「映像をモノクロにして」"],
                  ["E. 音声・BGM", "BGM URL / 音量 / フェード / ナレーション音量 / 動画ミュート", "「ナレーションを0.7倍に下げて」"],
                  ["F. 出力設定", "背景色 / 解像度(720p/1080p/4K) / FPS(24/30/60)", "「解像度を4Kに変更して」"],
                ]}
              />
            </SubSection>
            <Callout icon="↩">
              一括編集の適用前にスナップショットが自動保存されます。
              「保存ログ」から編集前の状態に戻すことができます。
            </Callout>
            <Callout icon="⚠️">
              「字幕」はタイムライン上の rich-text クリップを指します。
              「装飾テロップ」（DecoTelopModal で作成した画像クリップ）は一括編集の対象外です。
            </Callout>
          </Section>

          {/* ─── 13. 書き出し ─── */}
          <Section id="export" title="書き出し">
            <P>
              左パネルの「書き出し」タブから書き出せます。2つの方式があります。
            </P>
            <SubSection title="方式1：ブラウザ書き出し">
              <Card>
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8, fontFamily: FONT }}>
                  <b>対象：</b>テキスト・画像・SVGのみのプロジェクト<br />
                  <b>処理場所：</b>ブラウザ（ローカルマシン）<br />
                  <b>出力：</b>MP4 (25fps)<br />
                  <b>特徴：</b>即座にダウンロード可能・無料
                </div>
              </Card>
              <Callout icon="⚠️">
                動画・音声クリップが含まれる場合はブラウザ書き出しを使用できません。「APIサーバー書き出し」をご利用ください。
              </Callout>
            </SubSection>
            <SubSection title="方式2：APIサーバー書き出し（クラウド）">
              <Card>
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8, fontFamily: FONT }}>
                  <b>対象：</b>動画・音声クリップを含む全てのプロジェクト<br />
                  <b>処理場所：</b>クラウドサーバー（Shotstack API）<br />
                  <b>所要時間：</b>最大5分（レンダリング完了まで5秒間隔でポーリング）<br />
                  <b>出力：</b>クラウドURLとしてダウンロードリンクを提供
                </div>
              </Card>
              <SubSection title="進捗ステータス">
                <Table
                  headers={["フェーズ", "内容"]}
                  rows={[
                    ["保存", "プロジェクトをサーバーに保存"],
                    ["送信", "レンダリングジョブを送信"],
                    ["キュー待機", "サーバーキューで順番待ち"],
                    ["アセット取得", "クリップ素材をサーバーがダウンロード"],
                    ["レンダリング", "動画をエンコード処理中"],
                    ["ファイル保存", "出力ファイルをサーバーに保存"],
                    ["完了", "ダウンロードリンクが表示されます"],
                  ]}
                />
              </SubSection>
            </SubSection>
          </Section>

          {/* ─── 14. ワークスペース設定 ─── */}
          <Section id="settings" title="ワークスペース設定">
            <P>
              各モーダル内の「設定」ボタン、またはワークスペースバーの歯車アイコンから開きます。
              設定はワークスペース単位でクラウドに保存されます。
            </P>
            <SubSection title="画像生成設定">
              <Table
                headers={["設定", "内容"]}
                rows={[
                  ["デフォルトモデル", "Google Image Lite / Pro / Seedream / Reve AI から選択"],
                  ["デフォルトアスペクト比", "16:9 / 9:16 / 1:1 / 4:3 / 3:4"],
                  ["共通ルール", "全プロンプトに自動付加されるルール（例：テキスト排除、日本人描写）"],
                  ["NGプロンプト", "生成に含めないキーワード（ネガティブプロンプト）"],
                ]}
              />
            </SubSection>
            <SubSection title="動画生成設定">
              <Table
                headers={["設定", "内容"]}
                rows={[
                  ["デフォルトモデル", "Seedance 1.5 Pro / Google Veo 3 Lite / Veo 3 から選択"],
                  ["デフォルト解像度", "720p / 1080p"],
                  ["デフォルト尺", "モデルに応じた秒数（4〜12秒）"],
                  ["共通ルール", "全プロンプトに自動付加されるルール"],
                  ["NGプロンプト", "生成に含めないキーワード"],
                ]}
              />
            </SubSection>
            <SubSection title="ナレーション設定">
              <Table
                headers={["設定", "内容"]}
                rows={[
                  ["デフォルト音声", "30種の音声から選択（男性/女性）"],
                  ["デフォルト話速", "とてもゆっくり〜速い（5段階）"],
                  ["デフォルトトーン", "標準・明るい・落ち着いたなど（9種）"],
                  ["共通ルール", "全ナレーションに適用されるルール"],
                  ["NGワード", "生成で使わない表現"],
                ]}
              />
            </SubSection>
          </Section>

          {/* ─── 15. コンテ作成 ─── */}
          <Section id="conte" title="コンテ作成モード">
            <P>
              左パネル上部の「コンテ作成」ボタンでモードを切り替えます。
              コンテ（絵コンテ）はシーン単位でスクリプト・画像・動画・ナレーションを管理する機能です。
            </P>
            <SubSection title="コンテの作成">
              <StepList steps={[
                { n: 1, title: "新規コンテを作成", desc: "プロジェクトタブから「新しいコンテを作成」をクリック。タイトルを設定します。" },
                { n: 2, title: "シーンを追加", desc: "「シーンを追加」ボタンでシーンを追加。各シーンにスクリプト・画像・動画・ナレーションを設定できます。" },
                { n: 3, title: "スクリプトを入力または生成", desc: "テキストを手入力するか、AIによるスクリプト自動生成を利用します。" },
                { n: 4, title: "画像・動画を生成", desc: "各シーンのプロンプトを設定してAI生成。参照画像・参照テンプレートも利用可能です。" },
                { n: 5, title: "ナレーションを生成", desc: "スクリプトをもとにAIがナレーションを音声合成します。" },
                { n: 6, title: "動画プロジェクトに変換", desc: "コンテ全体を動画プロジェクト（SEQ）に変換してタイムライン編集に移ります。" },
              ]} />
            </SubSection>
            <SubSection title="画像生成モード">
              <Table
                headers={["モード", "内容"]}
                rows={[
                  ["テキスト", "プロンプトを直接入力して生成"],
                  ["別シーン参照", "他のシーンの画像を参照して一貫性を保ちながら生成"],
                  ["テンプレート参照", "登録済みテンプレート画像を参照して生成"],
                  ["ファイル参照", "ワークスペースのファイルを参照画像として使用"],
                  ["アップロード参照", "任意の画像をアップロードして参照"],
                ]}
              />
            </SubSection>
          </Section>

          {/* ─── Footer ─── */}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 32, marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: GRAD, display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 12 }}>✦</div>
              <span style={{ fontSize: 14, fontWeight: 700, backgroundImage: GRAD,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ヒスイAI</span>
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontFamily: FONT }}>
              ご不明な点はサポートまでお問い合わせください。
            </p>
          </div>

        </main>
      </div>
    </div>
  );
}
