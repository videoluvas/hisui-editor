import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "お問い合わせ | ヒスイAI",
  description: "ヒスイAIのお問い合わせ窓口。法人向けオプションのご相談、有料プランのお申し込み、使い方や不具合のご連絡はこちらから。",
  openGraph: {
    title: "お問い合わせ | ヒスイAI",
    description: "法人向けオプションのご相談、有料プランのお申し込み、使い方や不具合のご連絡はこちらから。",
  },
};

const TEAL = "#169385";
const INK = "#0f172a";
const LUVAS_CONTACT_URL = "https://www.luvas.red/contact?service=video";

const SIDE: { title: string; body: string; href: string; link: string; external?: boolean }[] = [
  { title: "使い方を調べる", body: "画面ごとの操作はマニュアルにまとめています。", href: "/manual", link: "マニュアルを見る" },
  { title: "料金を確認する", body: "無料プランでできること、有料プランのクレジットの目安。", href: "/pricing", link: "料金プランを見る" },
  { title: "動画の制作をまるごと任せたい", body: "ツールを使わず、運営会社の LUVAS が企画から制作まで行います。", href: LUVAS_CONTACT_URL, link: "LUVAS に制作を相談する", external: true },
];

export default function ContactPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: INK, fontFamily: "'Noto Sans JP', sans-serif", display: "flex", flexDirection: "column" }}>
      <header style={{ maxWidth: 1080, width: "100%", margin: "0 auto", padding: "18px 20px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/powerpoint" style={{ display: "inline-flex", alignItems: "center" }}>
          <img src="https://assets.hisui-ai.com/system/img/hisui_video_%E3%83%AD%E3%82%B4_01.png" alt="ヒスイAI" style={{ height: 28, width: "auto", objectFit: "contain", display: "block" }} />
        </a>
        <a href="/powerpoint" style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: TEAL, textDecoration: "none", borderRadius: 999, padding: "7px 16px" }}>無料で試す</a>
      </header>

      <section style={{ background: "linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%)", padding: "32px 20px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 10px" }}>お問い合わせ</h1>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.9, margin: 0 }}>
            法人向けオプションのご相談、有料プランのお申し込み、使い方や不具合のご連絡はこちらから。<br />
            担当者より 1〜2 営業日以内にメールでご連絡します。
          </p>
        </div>
      </section>

      <main style={{ flex: 1, width: "100%", maxWidth: 1080, margin: "0 auto", padding: "16px 20px 64px", boxSizing: "border-box", display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 560px", minWidth: 0 }}>
          <ContactForm />
        </div>
        <aside style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {SIDE.map((s) => (
            <div key={s.title} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.8, marginBottom: 8 }}>{s.body}</div>
              <a href={s.href} {...(s.external ? { target: "_blank", rel: "noopener" } : {})} style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>{s.link}{s.external ? " ↗" : ""}</a>
            </div>
          ))}
          <div style={{ background: "#f8fafc", borderRadius: 14, padding: "16px 18px", fontSize: 12, color: "#64748b", lineHeight: 1.9 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: INK, marginBottom: 4 }}>メールでのお問い合わせ</div>
            <a href="mailto:info@hisui-ai.com" style={{ color: TEAL, fontWeight: 700 }}>info@hisui-ai.com</a><br />
            運営：株式会社LUVAS
          </div>
        </aside>
      </main>

      <PublicFooter />
    </div>
  );
}
