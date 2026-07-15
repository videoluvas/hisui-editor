export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";
import { logGeneration } from "@/lib/log.generation";
import { checkFreeAccess } from "@/lib/free-limit";

const BASE_SYSTEM = `あなたはプロのナレーター兼映像ディレクターです。
以下の元情報をもとに、この映像シーン1つ分のナレーション台本を作成してください。
出力はナレーション文章のみ。説明・見出し・記号・改行は不要。`;

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

  // 所有権チェック
  const sb = await prisma.storyboardMain.findUnique({ where: { id: params.id } });
  if (!sb || sb.userId !== session.userId)
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

  const scene = await prisma.storyboardScene.findUnique({ where: { id: params.sceneId } });
  if (!scene || scene.mainId !== params.id)
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

  const { ok: accessOk, message: accessMsg } = await checkFreeAccess(session.userId, "script", "");
  if (!accessOk) return NextResponse.json({ ok: false, message: accessMsg }, { status: 402 });

  const body = await request.json().catch(() => ({})) as { sourceText?: string; model?: string; commonRules?: string; negativePrompt?: string };
  const sourceText = (body.sourceText ?? "").trim();
  const model = (body.model ?? "claude-sonnet-4-6").trim();
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
        model:      model,
        max_tokens: 512,
        system:     buildSystem(commonRules, negativePrompt),
        messages:   [{ role: "user", content: `元情報：\n${sourceText}` }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Anthropic ${resp.status}: ${errText}`);
    }

    const data = await resp.json() as { content?: { type: string; text: string }[] };
    const naText = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    await logGeneration(session.userId, "script");
    return NextResponse.json({ ok: true, naText });
  } catch (e) {
    await logError("generate-script", `Anthropic API error: ${e}`, { userId: session.userId, detail: { storyboardId: params.id, sceneId: params.sceneId } });
    return NextResponse.json({ ok: false, message: `AI生成に失敗しました: ${e}` }, { status: 500 });
  }
}
