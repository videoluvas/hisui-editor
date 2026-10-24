import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "お問い合わせ | ヒスイAI",
  description: "ヒスイAIへのお問い合わせ・有料プランのお申し込み・特別プランのご相談はこちらから。",
};

export default function ContactPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#0f172a", fontFamily: "'Noto Sans JP', sans-serif", display: "flex", flexDirection: "column" }}>
      <header style={{ maxWidth: 1080, width: "100%", margin: "0 auto", padding: "18px 20px", boxSizing: "border-box" }}>
        <a href="/powerpoint" style={{ display: "inline-flex", alignItems: "center" }}>
          <img src="https://assets.hisui-ai.com/system/img/hisui_video_%E3%83%AD%E3%82%B4_01.png" alt="ヒスイAI" style={{ height: 28, width: "auto", objectFit: "contain", display: "block" }} />
        </a>
      </header>
      <main style={{ flex: 1, width: "100%", maxWidth: 560, margin: "0 auto", padding: "24px 20px 64px", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px" }}>お問い合わせ</h1>
        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.8, margin: "0 0 24px" }}>
          使い方のご質問、有料プランのお申し込み、企業向けの特別プランのご相談はこちらから。
        </p>
        <ContactForm />
      </main>
      <PublicFooter />
    </div>
  );
}
