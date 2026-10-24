const LINKS: [string, string][] = [
  ["/powerpoint", "パワーポイントを動画に"],
  ["/pricing", "料金プラン"],
  ["/contact", "お問い合わせ"],
  ["/terms", "利用規約"],
  ["/privacy", "プライバシーポリシー"],
];

export const LUVAS_POWERPOINT_URL = "https://www.luvas.red/hisui-ai/powerpoint";

export default function PublicFooter() {
  return (
    <footer style={{ borderTop: "1px solid #e2e8f0", background: "#f8fafc", padding: "28px 20px 32px", fontFamily: "'Noto Sans JP', sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 13, color: "#475569", textDecoration: "none" }}>{label}</a>
          ))}
        </nav>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.8 }}>
          動画の制作をまるごと任せたい方は、運営会社 LUVAS の
          <a href={LUVAS_POWERPOINT_URL} target="_blank" rel="noopener" style={{ color: "#169385", fontWeight: 700, margin: "0 2px" }}>パワーポイント動画化サービス</a>
          へご相談ください。
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>© LUVAS / ヒスイAI</div>
      </div>
    </footer>
  );
}
