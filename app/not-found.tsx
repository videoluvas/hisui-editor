import Link from "next/link";

const TEAL = "#169385";
const FONT = "'Noto Sans JP', sans-serif";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <img
        src="https://assets.hisui-ai.com/system/img/hisui_video_%E3%83%AD%E3%82%B4_01.png"
        alt="ヒスイAI"
        style={{ height: 36, objectFit: "contain", marginBottom: 48 }}
      />

      <div
        style={{
          fontSize: 96,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          background: "linear-gradient(45deg, #5184F0, #169385)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 16,
        }}
      >
        404
      </div>

      <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>
        ページが見つかりません
      </div>
      <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.8, marginBottom: 40 }}>
        URLが変更または削除されたか、<br />
        入力ミスの可能性があります。
      </div>

      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "12px 28px",
          background: TEAL,
          color: "#fff",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        トップに戻る
      </Link>

      <Link
        href="/manual"
        style={{
          display: "inline-block",
          marginTop: 16,
          fontSize: 13,
          color: TEAL,
          textDecoration: "underline",
        }}
      >
        マニュアルを見る
      </Link>
    </div>
  );
}
