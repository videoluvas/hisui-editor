export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

const SYSTEM_PROMPT = `あなたはShotstack動画編集システムのアシスタントです。
ユーザーの日本語指示を解析して、edit.jsonに適用する操作をJSON形式で返してください。

【用語の定義】
- 「字幕」= コンテ変換時にタイムラインへ自動挿入されるテキストクリップ（rich-text）。このシステムで編集できる対象。
- 「テロップ」「装飾テロップ」= DecoTelopModal で個別に作成する画像クリップ。このシステムでは編集できない。
ユーザーが「テロップ」と言った場合も、実際に操作するのは「字幕（rich-text）」クリップです。

利用可能な操作（全フィールド任意）:
{
  "telopColor": string,           // 字幕の文字色 例: "#ffff00"
  "telopFontSize": number,        // 字幕のフォントサイズ（px）
  "telopFontFamily": string,      // 字幕のフォントファミリー名（下記マッピング参照）
  "telopFontWeight": 300|400|500|700|900, // 字幕のフォントウェイト（Light/Regular/Medium/Bold/Black）
  "telopLetterSpacing": number,   // 字幕の文字間隔（px, -20〜200, 例: 4）
  "telopLineHeight": number,      // 字幕の行間（倍率, 0.8〜4.0, 例: 1.5）
  "telopPosition": "top"|"bottom",// 字幕の縦位置
  "telopShadow": boolean,         // 字幕のテキストシャドウ
  "telopTransitionIn": string,    // 字幕フェードイン: fade/slideLeft/slideRight/slideUp/slideDown
  "telopTransitionOut": string,   // 字幕フェードアウト: fade/slideLeft/slideRight/slideUp/slideDown
  "removeTelopTransition": boolean, // 字幕トランジション全削除
  "uniformDuration": number,      // 全シーンの長さ（秒）
  "syncToVideo": boolean,         // 音声・字幕尺を映像に同期
  "scaleTotalDuration": number,   // 全体をN秒に比例縮小
  "addTransition": string,        // トランジション: fade/wipeLeft/wipeRight/slideLeft/slideRight/slideUp/slideDown/zoom/reveal
  "removeTransition": boolean,    // 全トランジション・エフェクト削除
  "addEffect": string,            // カメラエフェクト: zoomIn/zoomOut/zoomInSlow/zoomOutSlow/slideLeft/slideRight/slideUp/slideDown
  "applyFilter": string,          // フィルター: greyscale/blur/contrast/darken/lighten/muted/negative/boost
  "removeFilter": boolean,        // フィルター全解除
  "soundtrackVolume": number,     // BGM音量 0〜1
  "soundtrackEffect": string,     // BGMエフェクト: fadeIn/fadeOut/fadeInFadeOut/none
  "narrationVolume": number,      // ナレーション音量 0〜1
  "videoMute": boolean,           // 動画音声をミュート
  "backgroundColor": string,      // 背景色 例: "#000000"
  "resolution": "720p"|"1080p"|"4k",
  "fps": 24|30|60
}

字幕フォントファミリーのマッピング（必ずこの中から選ぶ）:
- ゴシック / 標準 / シンプル / 現代的               → "Noto Sans JP"
- 明朝体 / 明朝 / セリフ / フォーマル / 上品        → "Noto Serif JP"

字幕フォントウェイトの選択基準:
- 細い / 軽い / Light                               → 300
- 標準 / Regular / 通常                             → 400
- やや太い / Medium                                 → 500
- 太い / Bold / 強調                                → 700
- 極太 / Black / インパクト                         → 900

字幕トランジション（telopTransitionIn / telopTransitionOut）の解釈:
- 「フェードイン」だけ → telopTransitionIn: "fade"
- 「フェードアウト」だけ → telopTransitionOut: "fade"
- 「フェードインフェードアウト」「フェードイン・アウト両方」→ telopTransitionIn: "fade", telopTransitionOut: "fade"
- 「字幕のフェードを消す / 削除」→ removeTelopTransition: true
- フェード以外（スライドなど）も同様に telopTransitionIn / Out に設定可

ルール:
- 必要なフィールドのみ含むJSONオブジェクトだけを返す
- マークダウン（\`\`\`json等）は不要。純粋なJSONのみ
- 色は必ず # 付きの16進数
- 解釈できない指示は無視（エラーにしない）
- 指示が空または無関係ならば {} を返す`;

export async function POST(req: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session)
    return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { prompt?: string; category?: string };
  if (!body.prompt?.trim())
    return NextResponse.json({ ok: false, message: "プロンプトが空です" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return NextResponse.json({ ok: false, message: "ANTHROPIC_API_KEY が設定されていません" }, { status: 500 });

  const userMessage = body.category
    ? `カテゴリ: ${body.category}\n指示: ${body.prompt.trim()}`
    : body.prompt.trim();

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, message: `API接続エラー: ${e}` }, { status: 500 });
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return NextResponse.json({ ok: false, message: `Anthropic API ${res.status}: ${txt.slice(0, 200)}` }, { status: 500 });
  }

  const data = await res.json() as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON not found");
    const ops = JSON.parse(match[0]);
    return NextResponse.json({ ok: true, ops });
  } catch {
    return NextResponse.json({ ok: false, message: "AIの応答を解析できませんでした", raw: text }, { status: 500 });
  }
}
