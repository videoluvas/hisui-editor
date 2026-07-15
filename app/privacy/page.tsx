import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "プライバシーポリシー | ヒスイAI" };

const TEAL  = "#169385";
const FONT  = "'Noto Sans JP', sans-serif";
const GRAD  = "linear-gradient(45deg, #5184F0, #169385)";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "40px 0 14px" }}>
      <div style={{ width: 4, height: 22, borderRadius: 2, background: GRAD, flexShrink: 0 }} />
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1e293b", fontFamily: FONT }}>{children}</h2>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 10px", fontSize: 14, color: "#475569", lineHeight: 1.9, fontFamily: FONT }}>{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ fontSize: 14, color: "#475569", lineHeight: 1.9, fontFamily: FONT, marginBottom: 4 }}>
      {children}
    </li>
  );
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
      {rows.map(([label, desc], i) => (
        <div key={i} style={{ display: "flex", borderBottom: i < rows.length - 1 ? "1px solid #f1f5f9" : "none" }}>
          <div style={{ width: 160, flexShrink: 0, background: "#f8fafc", padding: "11px 14px", borderRight: "1px solid #e2e8f0", display: "flex", alignItems: "flex-start" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#334155", fontFamily: FONT }}>{label}</span>
          </div>
          <div style={{ flex: 1, padding: "11px 14px", fontSize: 13, color: "#475569", lineHeight: 1.75, fontFamily: FONT }}>{desc}</div>
        </div>
      ))}
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: FONT }}>

      {/* ヘッダー */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img
          src="https://assets.hisui-ai.com/system/img/hisui_video_%E3%83%AD%E3%82%B4_01.png"
          alt="ヒスイAI"
          style={{ height: 28, objectFit: "contain" }}
        />
        <Link href="/" style={{ fontSize: 13, color: TEAL, textDecoration: "none", fontWeight: 600 }}>
          ← エディタに戻る
        </Link>
      </header>

      {/* 本文 */}
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>

        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 800, color: "#1e293b" }}>プライバシーポリシー</h1>
        <p style={{ margin: "0 0 40px", fontSize: 13, color: "#94a3b8" }}>制定日：2026年7月15日</p>

        <P>
          株式会社LUVAS（以下「当社」）は、AI動画制作支援サービス「ヒスイAI」（以下「本サービス」）において取得するユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
        </P>

        <H2>1. 取得する情報</H2>
        <Table rows={[
          ["氏名（任意）",   "アカウント登録時にユーザーが入力した名前"],
          ["メールアドレス", "ログイン・サービス通知に使用"],
          ["パスワード",     "ハッシュ化して保存（平文では保持しない）"],
          ["利用ログ",       "生成履歴・操作ログ（サービス品質改善に使用）"],
          ["アップロードファイル", "ユーザーがアップロードした画像・動画・音声ファイル"],
          ["決済情報",       "当社は保持しません（決済代行会社が管理）"],
        ]} />

        <H2>2. 利用目的</H2>
        <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
          <Li>本サービスの提供・運営・改善</Li>
          <Li>ユーザーへのサポート対応・問い合わせへの返答</Li>
          <Li>サービスに関する重要なお知らせの送付</Li>
          <Li>不正利用の検知・防止</Li>
          <Li>AIモデルの品質改善（匿名化・統計処理後に利用）</Li>
        </ul>

        <H2>3. 第三者提供</H2>
        <P>
          当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。
        </P>
        <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
          <Li>ユーザーの事前同意がある場合</Li>
          <Li>法令に基づく開示要請がある場合</Li>
          <Li>人命・財産保護のために必要な場合</Li>
        </ul>

        <H2>4. 外部サービスへの送信</H2>
        <P>
          本サービスはAI機能の提供にあたり、外部のAIモデルプロバイダー（Google、OpenAI等）のAPIを利用します。生成リクエストの内容（プロンプト・画像等）がこれらのサービスに送信される場合があります。各プロバイダーのプライバシーポリシーも合わせてご確認ください。
        </P>

        <H2>5. データの保管・削除</H2>
        <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
          <Li>アカウント情報はサービス利用期間中保持します。</Li>
          <Li>アップロードファイルはクラウドストレージ（Cloudflare R2）に保存されます。</Li>
          <Li>アカウント削除のご要望は <a href="mailto:video@luvas.red" style={{ color: TEAL }}>video@luvas.red</a> までご連絡ください。</Li>
        </ul>

        <H2>6. Cookie・ログ</H2>
        <P>
          本サービスはセッション管理のためCookieを使用します。ブラウザの設定によりCookieを無効にすることもできますが、その場合はログイン機能が正常に動作しない場合があります。
        </P>

        <H2>7. 安全管理</H2>
        <P>
          当社は個人情報への不正アクセス・漏洩・紛失を防止するため、適切な技術的・組織的措置を講じます。パスワードはハッシュ化して保存し、通信はTLS暗号化を使用します。
        </P>

        <H2>8. 未成年者の利用</H2>
        <P>
          本サービスは18歳以上を対象としています。未成年者が利用する場合は保護者の同意が必要です。
        </P>

        <H2>9. 本ポリシーの変更</H2>
        <P>
          当社は必要に応じて本ポリシーを変更することがあります。重要な変更の場合はサービス上でお知らせします。
        </P>

        <H2>10. お問い合わせ</H2>
        <P>個人情報の取り扱いに関するお問い合わせは下記までご連絡ください。</P>
        <div style={{ background: "#f1f5f9", borderRadius: 10, padding: "16px 20px", fontSize: 14, color: "#334155", lineHeight: 2 }}>
          <strong>株式会社LUVAS　個人情報担当</strong><br />
          メール：<a href="mailto:video@luvas.red" style={{ color: TEAL }}>video@luvas.red</a>
        </div>

      </main>

      {/* フッター */}
      <footer style={{ borderTop: "1px solid #e2e8f0", padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
          © 2026 株式会社LUVAS
        </div>
        <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
          <Link href="/terms"   style={{ fontSize: 12, color: TEAL, textDecoration: "none" }}>利用規約</Link>
          <Link href="/privacy" style={{ fontSize: 12, color: TEAL, textDecoration: "none" }}>プライバシーポリシー</Link>
          <Link href="/manual"  style={{ fontSize: 12, color: TEAL, textDecoration: "none" }}>マニュアル</Link>
        </div>
      </footer>

    </div>
  );
}
