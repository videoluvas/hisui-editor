export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

// ── 速度ラベル → 秒/文字 ────────────────────────────────────────────────────

const SPEED_MAP: Record<string, string> = {
  "遅い(1文字0.30秒)":     "0.30",
  "通常(1文字0.20秒)":     "0.20",
  "速い(1文字0.15秒)":     "0.15",
  "かなり速い(1文字0.10秒)": "0.10",
};

function resolveSpeed(label: string): string {
  return SPEED_MAP[label] ?? "0.20";
}

// ── プロンプトビルダー ────────────────────────────────────────────────────────

function buildSystem(speedSec: string, totalSec: number): string {
  return `あなたはプロのナレーター兼映像ディレクターです。

【最重要】
まず最初に、総尺に合わせた自然で流れる一本のナレーション全文を作成してください。
その後、その全文を意味の切れ目（句読点や自然な文脈）で分割し、各シーン50文字以内に調整してください。

【ルール】
1) ナレーション全文はプロ品質で自然かつ魅力的な日本語にする。
2) 分割後の各シーンは50文字以内。
3) 1文字=${speedSec}秒でdurationを算出。
4) 総尺は${totalSec}秒以内。
5) 各シーンには必ずtitleフィールドを追加する。titleはそのシーン内容を簡潔に表す自然な日本語（20文字以内）とする。
6) ナレーション完成後に、そのシーン作成時に参考にした元原稿の箇所をoriginalに入れる。
7) どのシーンにも割り当てられなかった元原稿は、必ず最後のシーン番号（最大scene+1）として出力する。
8) 最後のシーンのtitleは「未使用シーン」とし、narrationは「未使用」とする。
9) 最後のシーンのoriginalフィールドに未使用原稿をすべて入れる。
10) originalは元原稿からの完全コピペのみ（改変禁止）。
11) 出力はJSON配列のみ。説明文・マークダウン・コードブロックは禁止。
12) 出力フォーマットは必ず以下の形式を厳守する：[{"scene":1,"title":"xxx","narration":"xxx","duration":0.0,"original":"xxx"}]
13) ダブルクォートのエスケープ（\\"）禁止。文字列で包まない。改行コードは\\nで表現する。`;
}

function buildUser(request: string, totalSec: number, speedSec: string, script: string): string {
  const req = request.trim() ? `追加リクエスト:${request.trim()}\n` : "";
  return `${req}総尺:${totalSec}秒\n速度:1文字${speedSec}秒\n原稿:\n${script}\n\n出力はJSON配列のみで返してください。`;
}

// ── AI レスポンス型 ──────────────────────────────────────────────────────────

type AiScene = {
  scene: number;
  title: string;
  narration: string;
  duration: number;
  original: string;
};

function parseAiJson(raw: string): AiScene[] | null {
  const candidates = [
    raw.trim(),
    raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim(),
  ];
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (Array.isArray(parsed)) return parsed as AiScene[];
    } catch {}
  }
  // 最後の手段：配列部分だけ抜き出す
  const m = raw.match(/\[[\s\S]*\]/);
  if (m) {
    try {
      const parsed = JSON.parse(m[0]);
      if (Array.isArray(parsed)) return parsed as AiScene[];
    } catch {}
  }
  return null;
}

// ── POST /api/storyboard/[id]/generate ──────────────────────────────────────

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const sb = await prisma.storyboardMain.findUnique({ where: { id: params.id } });
  if (!sb || sb.userId !== session.userId)
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as {
    sourceText?: string;
    prompt?: string;
    duration?: number;
    speed?: string;
  };

  const { sourceText = "", prompt: promptText = "", duration = 60, speed = "通常(1文字0.20秒)" } = body;

  if (!sourceText.trim())
    return NextResponse.json({ ok: false, message: "原稿を入力してください" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return NextResponse.json({ ok: false, message: "ANTHROPIC_API_KEY が設定されていません" }, { status: 500 });

  const speedSec   = resolveSpeed(speed);
  const totalSec   = Math.max(15, Math.round(Number(duration) || 60));

  // 入力を storyboard_main に保存 + ステータスを generating へ
  await prisma.storyboardMain.update({
    where: { id: params.id },
    data: {
      originalScript: sourceText,
      prompt:         promptText || null,
      duration:       String(totalSec),
      speed,
      status:         "generating",
    },
  });

  // ── Claude API 呼び出し ──────────────────────────────────────────────────
  let rawContent = "";
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-key":       apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-opus-4-7",
        max_tokens: 8096,
        system:     buildSystem(speedSec, totalSec),
        messages:   [{ role: "user", content: buildUser(promptText, totalSec, speedSec, sourceText) }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Anthropic ${resp.status}: ${errText}`);
    }

    const data = await resp.json() as { content?: { type: string; text: string }[] };
    rawContent = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
  } catch (e) {
    await prisma.storyboardMain.update({
      where: { id: params.id },
      data: { status: "error", log: String(e) },
    });
    return NextResponse.json({ ok: false, message: `AI生成に失敗しました: ${e}` }, { status: 500 });
  }

  // ── JSON パース ─────────────────────────────────────────────────────────
  const scenes = parseAiJson(rawContent);
  if (!scenes) {
    await prisma.storyboardMain.update({
      where: { id: params.id },
      data: { status: "error", aiScriptLog: rawContent, log: "JSON parse error" },
    });
    return NextResponse.json({ ok: false, message: "AIの出力の解析に失敗しました" }, { status: 500 });
  }

  // 未使用シーンを分離
  const unusedScene = scenes.find((s) => s.title === "未使用シーン");
  const usedScenes  = scenes.filter((s) => s.title !== "未使用シーン");

  // 既存シーンを削除してから一括作成
  await prisma.storyboardScene.deleteMany({ where: { mainId: params.id } });

  if (usedScenes.length > 0) {
    await prisma.storyboardScene.createMany({
      data: usedScenes.map((s, i) => ({
        mainId:          params.id,
        sceneNo:         i + 1,
        title:           s.title   || `シーン ${i + 1}`,
        naText:          s.narration && s.narration !== "未使用" ? s.narration : null,
        duration:        s.duration != null ? String(s.duration) : null,
        sourceTextChunk: s.original || null,
      })),
    });
  }

  // storyboard_main を完了状態に更新
  await prisma.storyboardMain.update({
    where: { id: params.id },
    data: {
      status:        "ready",
      aiScriptLog:   rawContent,
      aiScriptLogEx: unusedScene?.original || null,
    },
  });

  return NextResponse.json({ ok: true, sceneCount: usedScenes.length });
}
