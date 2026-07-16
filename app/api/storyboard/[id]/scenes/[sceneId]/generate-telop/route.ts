export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";
import { logGeneration } from "@/lib/log.generation";

const BASE_SYSTEM = `あなたは映像制作のプロです。
以下の元情報をもとに、動画に表示するテロップテキストを1つだけ作成してください。

【厳守事項】
- 出力はテロップ本文のみ。他は一切書かない。
- 見出し・タイトル・番号・括弧・記号・区切り線は使わない。
- 複数案・候補・選択肢を出さない。最終的に採用する1文のみ出力する。
- 改行は含めない。1行で出力する。`;

function buildSystem(commonRules: string, negativePrompt: string): string {
  let s = BASE_SYSTEM;
  if (commonRules.trim()) s += `\n\n【ルール】\n${commonRules.trim()}`;
  if (negativePrompt.trim()) s += `\n\n【避けること】\n${negativePrompt.trim()}`;
  return s;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; sceneId: string } },
) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const sb = await prisma.storyboardMain.findUnique({ where: { id: params.id } });
  if (!sb || sb.userId !== session.userId)
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

  const scene = await prisma.storyboardScene.findUnique({ where: { id: params.sceneId } });
  if (!scene || scene.mainId !== params.id)
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as { sourceText?: string; model?: string; commonRules?: string; negativePrompt?: string };
  const sourceText = (body.sourceText ?? "").trim();
  const model = (body.model ?? "claude-haiku-4-5").trim();
  const commonRules = (body.commonRules ?? "").trim();
  const negativePrompt = (body.negativePrompt ?? "").trim();

  if (!sourceText)
    return NextResponse.json({ ok: false, message: "元情報を入力してください" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return NextResponse.json({ ok: false, message: "ANTHROPIC_API_KEY が設定されていません" }, { status: 500 });

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 256,
        system:     buildSystem(commonRules, negativePrompt),
        messages:   [{ role: "user", content: `元情報：\n${sourceText}` }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Anthropic ${resp.status}: ${errText}`);
    }

    const data = await resp.json() as { content?: { type: string; text: string }[] };
    const raw = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // 複数行出力になった場合は最初の非空行だけ採用し、見出し記号を除去
    const telopText = raw
      .split("\n")
      .map((l) => l.replace(/^[#*\-　\s【】「」『』\d.、。]+/, "").replace(/[#*\-　\s【】「」『』]+$/, "").trim())
      .filter(Boolean)[0] ?? raw.trim();

    await logGeneration(session.userId, "scene_regen");
    return NextResponse.json({ ok: true, telopText });
  } catch (e) {
    await logError("generate-telop", `Anthropic API error: ${e}`, { userId: session.userId, detail: { storyboardId: params.id, sceneId: params.sceneId } });
    return NextResponse.json({ ok: false, message: `AI生成に失敗しました: ${e}` }, { status: 500 });
  }
}
