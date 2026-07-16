const RESEND_API = "https://api.resend.com/emails";
const FROM = "Hisui AI <info@hisui-ai.com>";

async function send(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY が設定されていません");

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`メール送信エラー (${res.status}): ${err}`);
  }
}

const baseUrl = () => process.env.APP_URL ?? "http://localhost:3000";

const wrap = (content: string) => `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,'Noto Sans JP',sans-serif;color:#1e293b}
.card{max-width:480px;margin:40px auto;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden}
.header{background:linear-gradient(135deg,#169385,#0d5c54);padding:28px 32px;text-align:center}
.header h1{margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px}
.body{padding:28px 32px}
p{margin:0 0 14px;font-size:14px;line-height:1.7;color:#475569}
.btn{display:block;margin:20px 0;padding:14px 24px;background:linear-gradient(135deg,#169385,#0d7a6e);color:#fff!important;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;text-align:center}
.note{font-size:11px;color:#94a3b8;margin-top:8px;line-height:1.6}
.footer{padding:16px 32px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8}
</style></head><body><div class="card">
<div class="header"><h1>✦ Hisui AI</h1></div>
<div class="body">${content}</div>
<div class="footer">© 2025 Hisui AI — info@hisui-ai.com<br>このメールに心当たりがない場合は無視してください。</div>
</div></body></html>`;

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${baseUrl()}/reset-password/confirm?token=${token}`;
  await send(
    to,
    "【Hisui AI】パスワード再設定",
    wrap(`
      <p>パスワードの再設定リクエストを受け付けました。</p>
      <p>下のボタンから新しいパスワードを設定してください。</p>
      <a href="${link}" class="btn">パスワードを再設定する</a>
      <p class="note">リンクの有効期限は<strong>1時間</strong>です。<br>このメールに心当たりがない場合は無視してください。</p>
      <p class="note">ボタンが機能しない場合は以下のURLをブラウザに貼り付けてください：<br>${link}</p>
    `),
  );
}

export async function sendContactInquiryEmail(opts: {
  companyName: string;
  name: string;
  email: string;
  message: string;
}): Promise<void> {
  // 運営宛て通知
  await send(
    "info@hisui-ai.com",
    `【Hisui AI】お問い合わせ：${opts.companyName}`,
    wrap(`
      <p><strong>新しいお問い合わせが届きました。</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:8px 0 16px">
        <tr><td style="padding:8px 10px;background:#f8fafc;color:#94a3b8;width:120px;font-weight:700">会社名</td><td style="padding:8px 10px;border-bottom:1px solid #f1f5f9">${opts.companyName}</td></tr>
        <tr><td style="padding:8px 10px;background:#f8fafc;color:#94a3b8;font-weight:700">担当者名</td><td style="padding:8px 10px;border-bottom:1px solid #f1f5f9">${opts.name}</td></tr>
        <tr><td style="padding:8px 10px;background:#f8fafc;color:#94a3b8;font-weight:700">メール</td><td style="padding:8px 10px;border-bottom:1px solid #f1f5f9"><a href="mailto:${opts.email}">${opts.email}</a></td></tr>
        <tr><td style="padding:8px 10px;background:#f8fafc;color:#94a3b8;font-weight:700;vertical-align:top">ご要望</td><td style="padding:8px 10px;white-space:pre-wrap">${opts.message || "（記載なし）"}</td></tr>
      </table>
    `),
  );
  // ユーザーへの自動返信
  await send(
    opts.email,
    "【Hisui AI】お問い合わせを受け付けました",
    wrap(`
      <p>${opts.name} 様</p>
      <p>この度はヒスイAIへのお問い合わせありがとうございます。<br>
      内容を確認のうえ、担当者より <strong>1〜2営業日以内</strong> にご連絡いたします。</p>
      <p style="margin-top:16px;padding:14px;background:#f8fafc;border-radius:8px;font-size:13px">
        <strong>受付内容</strong><br>
        会社名：${opts.companyName}<br>
        担当者：${opts.name}<br>
        ご要望：${opts.message || "（記載なし）"}
      </p>
      <p class="note">このメールは自動送信です。返信は受け付けておりません。<br>
      お急ぎの場合は <a href="mailto:info@hisui-ai.com">info@hisui-ai.com</a> へ直接ご連絡ください。</p>
    `),
  );
}

export async function sendEmailChangeEmail(to: string, token: string): Promise<void> {
  const link = `${baseUrl()}/api/auth/change-email/confirm?token=${token}`;
  await send(
    to,
    "【Hisui AI】メールアドレス変更の確認",
    wrap(`
      <p>このメールアドレスへの変更リクエストを受け付けました。</p>
      <p>下のボタンをクリックしてメールアドレスを確定してください。</p>
      <a href="${link}" class="btn">メールアドレスを確認する</a>
      <p class="note">リンクの有効期限は<strong>24時間</strong>です。<br>このメールに心当たりがない場合は無視してください（変更は行われません）。</p>
      <p class="note">ボタンが機能しない場合は以下のURLをブラウザに貼り付けてください：<br>${link}</p>
    `),
  );
}
