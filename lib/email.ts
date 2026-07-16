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

export async function sendInviteEmail(to: string, opts: {
  name: string;
  password: string;
  loginUrl: string;
}): Promise<void> {
  await send(
    to,
    "【Hisui AI】アカウントのご案内",
    wrap(`
      <p>${opts.name} 様</p>
      <p>この度はヒスイAIにご登録いただきありがとうございます。<br>
      アカウントを発行しましたので、下記の情報でログインしてください。</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0 20px">
        <tr><td style="padding:10px 14px;background:#f8fafc;color:#94a3b8;width:140px;font-weight:700;border-radius:8px 0 0 0">メールアドレス</td><td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-weight:700">${to}</td></tr>
        <tr><td style="padding:10px 14px;background:#f8fafc;color:#94a3b8;font-weight:700;border-radius:0 0 0 8px">初期パスワード</td><td style="padding:10px 14px;font-weight:700;letter-spacing:0.08em">${opts.password}</td></tr>
      </table>
      <a href="${opts.loginUrl}" class="btn">ヒスイAIにログインする</a>
      <p class="note">ログイン後、プロフィール設定からパスワードを変更することをお勧めします。</p>
      <p class="note">ご不明な点がございましたら <a href="mailto:info@hisui-ai.com">info@hisui-ai.com</a> までお気軽にご連絡ください。</p>
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

export type PlanConfigRow = {
  id: string; label: string; price_jpy: number;
  credits_default: number;
  credit_img_max: number; credit_script_max: number; credit_video_max: number;
  credit_audio_max: number; credit_bgm_max: number;
  free_model_img: string; free_model_video: string; max_workspaces: number;
};

// ─── 見積書プランデータ ────────────────────────────────────────────────────────
// ここを編集するだけでメール内容が変わります

export type QuoteEstimate = { label: string; condition: string; count: string };

export type QuotePlan = {
  id:             string;
  name:           string;
  priceJpy:       number;
  monthlyCredits: number;
  estimates:      QuoteEstimate[];
};

export const QUOTE_PLANS: Record<string, QuotePlan> = {
  Business: {
    id:             "Business",
    name:           "Business",
    priceJpy:       99_800,
    monthlyCredits: 150_000,
    estimates: [
      { label: "台本生成",          condition: "1コンテ分",   count: "約7,500本"   },
      { label: "画像生成（ライト）", condition: "1枚",         count: "約1,500枚"   },
      { label: "画像生成（高品質）", condition: "1枚",         count: "約375枚"     },
      { label: "動画生成（ライト）", condition: "8秒・1本",    count: "約150本"     },
      { label: "動画生成（高品質）", condition: "8秒・1本",    count: "約60本"      },
      { label: "AIナレーション生成", condition: "200文字程度", count: "約15,000回"  },
      { label: "AI BGM生成",        condition: "1曲",         count: "約1,000曲"   },
      { label: "動画書き出し",       condition: "1080p・1分",  count: "約500分"     },
    ],
  },
  Pro: {
    id:             "Pro",
    name:           "Pro",
    priceJpy:       298_000,
    monthlyCredits: 500_000,
    estimates: [
      { label: "台本生成",          condition: "1コンテ分",   count: "約25,000本"  },
      { label: "画像生成（ライト）", condition: "1枚",         count: "約5,000枚"   },
      { label: "画像生成（高品質）", condition: "1枚",         count: "約1,250枚"   },
      { label: "動画生成（ライト）", condition: "8秒・1本",    count: "約500本"     },
      { label: "動画生成（高品質）", condition: "8秒・1本",    count: "約200本"     },
      { label: "AIナレーション生成", condition: "200文字程度", count: "約50,000回"  },
      { label: "AI BGM生成",        condition: "1曲",         count: "約3,333曲"   },
      { label: "動画書き出し",       condition: "1080p・1分",  count: "約1,666分"   },
    ],
  },
};

const QUOTE_SERVICE_FEATURES = [
  "利用できるAIモデルにプランごとの制限はありません",
  "専任担当者によるサポート（チャット・メール対応）",
  "契約期間の縛りなし・初期費用なし",
  "1か月単位の自動更新（解約は次回更新日前に申請するだけ）",
];

const QUOTE_NOTES = [
  "生成・出力可能数は、月間クレジットを対象機能だけにすべて使用した場合の最大目安です。",
  "動画生成数は8秒動画1本を基準にしています。高品質動画は上位モデル・生成音声なしを想定。",
  "ナレーションは1回200文字まで、BGMは高品質モデルで1曲、動画書き出しは1080p・完成動画1分あたりの目安です。",
  "掲載されていないAIモデルについても、ご希望があれば担当者までお申し付けください。",
];

export async function sendQuoteEmail(opts: {
  toEmail:     string;
  toName:      string | null;
  plan:        QuotePlan;
  validUntil:  string;
  customNote?: string;
}): Promise<void> {
  const { toEmail, toName, plan, validUntil, customNote } = opts;
  const name  = toName ?? "お客様";
  const price = plan.priceJpy.toLocaleString("ja-JP");
  const cr    = plan.monthlyCredits.toLocaleString("ja-JP");

  const estimateRows = plan.estimates.map((e) => `
    <tr>
      <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;color:#334155;font-size:13px">${e.label}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px;color:#64748b">${e.condition}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;color:#169385;font-weight:700">${e.count}</td>
    </tr>`).join("");

  const featureItems = QUOTE_SERVICE_FEATURES.map((f) =>
    `<div style="display:flex;gap:8px;margin-bottom:8px;font-size:13px;color:#334155;line-height:1.5">
      <span style="color:#169385;font-weight:700;flex-shrink:0">✓</span><span>${f}</span>
    </div>`).join("");

  const noteItems = QUOTE_NOTES.map((n) =>
    `<div style="margin-bottom:6px;font-size:12px;color:#64748b;line-height:1.6;padding-left:12px;position:relative">
      <span style="position:absolute;left:0;color:#94a3b8">•</span>${n}
    </div>`).join("");

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
<style>body{margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,'Noto Sans JP',sans-serif}</style>
</head><body>
<div style="max-width:660px;margin:32px auto">

  <div style="background:linear-gradient(135deg,#169385,#0d5c54);padding:28px 36px;border-radius:12px 12px 0 0">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.3px">✦ Hisui AI</div>
        <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:3px">AIコンテンツ生成プラットフォーム</div>
      </div>
      <div style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:8px;padding:6px 16px;color:#fff;font-size:13px;font-weight:700;letter-spacing:2px">見 積 書</div>
    </div>
  </div>

  <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;padding:36px;border-radius:0 0 12px 12px">

    <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#1e293b">${name} 様</p>
    <p style="margin:0 0 28px;font-size:14px;line-height:1.75;color:#64748b">平素よりHisui AIをご利用いただきありがとうございます。<br>この度、下記のプランをご提案させていただきます。</p>

    <!-- 見積明細 -->
    <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:8px">
      <div style="background:#f8fafc;padding:12px 16px;border-bottom:1px solid #e2e8f0">
        <span style="font-size:13px;font-weight:700;color:#1e293b">見積明細</span>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f1f5f9">
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b">品目</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#64748b;white-space:nowrap">単価（税抜）</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#64748b">数量</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#64748b">金額</th>
        </tr></thead>
        <tbody>
          <tr>
            <td style="padding:14px 16px;color:#1e293b;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9">
              Hisui AI ${plan.name}<br>
              <span style="font-size:11px;font-weight:400;color:#94a3b8">月間クレジット ${cr} cr</span>
            </td>
            <td style="padding:14px 16px;text-align:right;color:#334155;font-size:14px;border-bottom:1px solid #f1f5f9;white-space:nowrap">¥${price}</td>
            <td style="padding:14px 16px;text-align:right;color:#334155;font-size:14px;border-bottom:1px solid #f1f5f9;white-space:nowrap">1ヶ月</td>
            <td style="padding:14px 16px;text-align:right;color:#1e293b;font-weight:700;font-size:14px;border-bottom:1px solid #f1f5f9;white-space:nowrap">¥${price}</td>
          </tr>
          <tr style="background:#f8fafc">
            <td colspan="3" style="padding:12px 16px;text-align:right;font-size:12px;color:#64748b">合計（税抜）</td>
            <td style="padding:12px 16px;text-align:right;color:#169385;font-weight:800;font-size:22px;white-space:nowrap">¥${price}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="margin-bottom:28px;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;font-size:12px;color:#92400e;display:flex;gap:8px;align-items:center">
      <span>📅</span>
      <span>見積有効期限：<strong>${validUntil}</strong> まで</span>
    </div>

    <!-- 生成・出力可能数の目安 -->
    <div style="margin-bottom:24px">
      <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:10px">生成・出力可能数の目安</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <thead><tr style="background:#f8fafc">
          <th style="padding:9px 14px;text-align:left;font-size:11px;font-weight:700;color:#64748b">機能</th>
          <th style="padding:9px 14px;text-align:center;font-size:11px;font-weight:700;color:#64748b">想定条件</th>
          <th style="padding:9px 14px;text-align:right;font-size:11px;font-weight:700;color:#169385">最大目安</th>
        </tr></thead>
        <tbody>${estimateRows}</tbody>
      </table>
      <div style="margin-top:8px;font-size:11px;color:#94a3b8;line-height:1.6;padding:0 2px">
        ※上記は月間クレジット（${cr} cr）を対象機能だけにすべて使用した場合の最大目安です。実際は各機能の利用分だけクレジットが消費されます。
      </div>
    </div>

    <!-- サービス概要 -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px 20px;margin-bottom:24px">
      <div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:12px">サービス特徴</div>
      ${featureItems}
    </div>

    ${customNote ? `
    <div style="margin-bottom:24px;padding:14px 16px;background:#f0f9ff;border-left:3px solid #38bdf8;border-radius:4px">
      <div style="font-size:12px;font-weight:700;color:#0c4a6e;margin-bottom:6px">備考</div>
      <div style="font-size:13px;color:#0c4a6e;line-height:1.75">${customNote.replace(/\n/g, "<br>")}</div>
    </div>
    ` : ""}

    <!-- 重要事項 -->
    <div style="background:#f8fafc;border-radius:8px;padding:14px 16px;margin-bottom:28px">
      <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:8px">重要事項</div>
      ${noteItems}
    </div>

    <!-- CTA -->
    <div style="text-align:center">
      <a href="mailto:info@hisui-ai.com?subject=Hisui AI ${plan.name}プランについて" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#169385,#0d7a6e);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">
        ${plan.name}プランについてお問い合わせする
      </a>
      <div style="margin-top:12px;font-size:12px;color:#94a3b8">
        <a href="mailto:info@hisui-ai.com" style="color:#169385">info@hisui-ai.com</a> までお気軽にご連絡ください
      </div>
    </div>
  </div>

  <div style="text-align:center;padding:16px;font-size:11px;color:#94a3b8">© 2025 Hisui AI</div>
</div>
</body></html>`;

  await send(toEmail, `【Hisui AI】${plan.name}プラン ご提案（見積書）`, html);
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
