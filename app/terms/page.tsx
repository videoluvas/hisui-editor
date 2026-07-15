import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "利用規約 | ヒスイAI" };

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

export default function TermsPage() {
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

        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 800, color: "#1e293b" }}>利用規約</h1>
        <p style={{ margin: "0 0 40px", fontSize: 13, color: "#94a3b8" }}>制定日：2026年7月15日</p>

        <P>
          本利用規約（以下「本規約」）は、株式会社LUVAS（以下「当社」）が提供するAI動画制作支援サービス「ヒスイAI」（以下「本サービス」）の利用条件を定めるものです。ユーザーの皆さま（以下「ユーザー」）は、本規約に同意のうえ本サービスをご利用ください。
        </P>

        <H2>第1条（定義）</H2>
        <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
          <Li>「本サービス」とは、当社が運営するAI画像・動画・ナレーション・BGM生成、および動画編集機能を含むクラウドサービスを指します。</Li>
          <Li>「ユーザー」とは、本規約に同意し本サービスに登録した個人または法人を指します。</Li>
          <Li>「コンテンツ」とは、ユーザーが本サービスを通じて生成・アップロードしたすべてのデータを指します。</Li>
        </ul>

        <H2>第2条（アカウント）</H2>
        <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
          <Li>ユーザーは正確な情報でアカウントを作成するものとします。</Li>
          <Li>アカウント情報の管理はユーザー自身の責任で行うものとします。</Li>
          <Li>第三者へのアカウント共有・譲渡は禁止します。</Li>
          <Li>不正利用が判明した場合、当社はアカウントを停止または削除できるものとします。</Li>
        </ul>

        <H2>第3条（料金・クレジット）</H2>
        <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
          <Li>無料プランでは、当社が定める範囲でクレジットを無償付与します。</Li>
          <Li>有料プランの料金・内容は、当社が別途定める料金表に従います。</Li>
          <Li>支払い済みクレジット・料金の返金は、法令に定める場合を除き行いません。</Li>
          <Li>料金は当社の判断により変更される場合があります。変更時は事前に通知します。</Li>
        </ul>

        <H2>第4条（禁止事項）</H2>
        <P>ユーザーは以下の行為を行ってはなりません。</P>
        <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
          <Li>法令または公序良俗に違反する行為</Li>
          <Li>第三者の知的財産権・肖像権・プライバシーを侵害するコンテンツの生成・使用</Li>
          <Li>本サービスの運営を妨害する行為（過度なリクエスト送信など）</Li>
          <Li>当社の事前承諾なく本サービスを第三者に再販・転貸する行為</Li>
          <Li>虚偽の情報によるアカウント登録</Li>
          <Li>反社会的勢力との関与</Li>
          <Li>その他、当社が不適切と判断する行為</Li>
        </ul>

        <H2>第5条（知的財産権）</H2>
        <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
          <Li>本サービスのシステム・UIデザイン・ロゴ等の知的財産権は当社に帰属します。</Li>
          <Li>ユーザーが本サービスで生成したコンテンツの著作権は原則としてユーザーに帰属します。ただし、AIモデルの利用条件により制限が生じる場合があります。</Li>
          <Li>当社は、サービス改善・品質向上のため生成データを匿名化して利用する場合があります。</Li>
        </ul>

        <H2>第6条（免責事項）</H2>
        <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
          <Li>本サービスは現状有姿で提供します。特定目的への適合性・正確性・継続性を保証しません。</Li>
          <Li>AIが生成するコンテンツの品質・内容について、当社は責任を負いません。</Li>
          <Li>ユーザーが生成・使用したコンテンツに起因する一切の損害について、当社は責任を負いません。</Li>
          <Li>当社の責任が生じる場合でも、賠償額はユーザーが直近1ヶ月に支払った利用料金を上限とします。</Li>
        </ul>

        <H2>第7条（サービスの変更・停止）</H2>
        <P>
          当社は、ユーザーへの事前通知をもって本サービスの内容変更・機能追加・一時停止・終了を行うことができます。ただし、緊急の場合はこの限りではありません。
        </P>

        <H2>第8条（利用規約の変更）</H2>
        <P>
          当社は必要に応じて本規約を変更できます。変更後の規約はサービス上に掲示し、掲示時点から効力を持ちます。変更後に本サービスを継続利用した場合、変更に同意したものとみなします。
        </P>

        <H2>第9条（準拠法・管轄）</H2>
        <P>
          本規約は日本法を準拠法とします。本サービスに関する紛争は、当社所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
        </P>

        <H2>第10条（お問い合わせ）</H2>
        <P>本規約に関するお問い合わせは下記までご連絡ください。</P>
        <div style={{ background: "#f1f5f9", borderRadius: 10, padding: "16px 20px", fontSize: 14, color: "#334155", lineHeight: 2 }}>
          <strong>株式会社LUVAS</strong><br />
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
