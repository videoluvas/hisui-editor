export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth.password";
import { generateSessionToken, hashSessionToken, getSessionExpiresAt } from "@/lib/session.utils";
import { r2Client, R2_BUCKET_NAME } from "@/lib/fileupload.r2";
import { buildEditJsonKey } from "@/lib/project.r2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();

    if (!email || !password) {
      return NextResponse.json({ ok: false, message: "メールアドレスとパスワードは必須です" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, message: "パスワードは8文字以上で入力してください" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ ok: false, message: "このメールアドレスは既に登録されています" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // password_hash はまだ Prisma 型に反映されていないため raw SQL で書き込む
    const user = await prisma.user.create({
      data: { email, name: name || null },
    });
    await prisma.$executeRaw`UPDATE "users" SET "password_hash" = ${passwordHash} WHERE "id" = ${user.id}`;

    const workspace = await prisma.workspace.create({
      data: { userId: user.id, name: "マイワークスペース" },
    });

    try {
      const sampleStoryboards = await prisma.storyboardMain.findMany({
        where: { isDefaultSample: true },
        include: { scenes: true },
      });

      for (const sb of sampleStoryboards) {
        const newSb = await prisma.storyboardMain.create({
          data: {
            userId: user.id,
            workspaceId: workspace.id,
            title: sb.title,
            originalScript: sb.originalScript,
            duration: sb.duration,
            prompt: sb.prompt,
            speed: sb.speed,
            status: "draft",
          },
        });

        const idMap = new Map<string, string>();
        for (const scene of sb.scenes.sort((a, b) => (a.sceneNo ?? 0) - (b.sceneNo ?? 0))) {
          const newScene = await prisma.storyboardScene.create({
            data: {
              mainId: newSb.id,
              sceneNo: scene.sceneNo,
              title: scene.title,
              duration: scene.duration,
              sourceTextChunk: scene.sourceTextChunk,
              naText: scene.naText,
              telopText: scene.telopText,
              imgPrompt: scene.imgPrompt,
              imgPromptAngle: scene.imgPromptAngle,
              imgPromptContent: scene.imgPromptContent,
              imgStyle: scene.imgStyle,
              imgUrl: scene.imgUrl,
              imgUrlDl: scene.imgUrlDl,
              imgStatusYn: scene.imgStatusYn,
              videoPrompt: scene.videoPrompt,
              videoUrl: scene.videoUrl,
              videoStatus: "ready",
              audioUrl: scene.audioUrl,
              audioText: scene.audioText,
              audioSettings: scene.audioSettings ?? undefined,
            },
          });
          idMap.set(scene.id, newScene.id);
        }

        for (const scene of sb.scenes) {
          if (scene.imgStyleUnifiedId) {
            const newOldId = idMap.get(scene.id);
            const newRefId = idMap.get(scene.imgStyleUnifiedId);
            if (newOldId && newRefId) {
              await prisma.storyboardScene.update({
                where: { id: newOldId },
                data: { imgStyleUnifiedId: newRefId },
              });
            }
          }
        }
      }

      const sampleProjects = await prisma.project.findMany({
        where: { isDefaultSample: true },
      });

      for (const pj of sampleProjects) {
        const newProject = await prisma.project.create({
          data: {
            userId: user.id,
            workspaceId: workspace.id,
            title: pj.title,
            status: "draft",
            thumbnailUrl: pj.thumbnailUrl,
            aspectRatio: pj.aspectRatio,
            width: pj.width,
            height: pj.height,
            fps: pj.fps,
            backgroundColor: pj.backgroundColor,
          },
        });

        if (pj.editJsonKey) {
          const newKey = buildEditJsonKey(user.id, workspace.id, newProject.id);
          try {
            await r2Client.send(new CopyObjectCommand({
              Bucket: R2_BUCKET_NAME,
              CopySource: `${R2_BUCKET_NAME}/${pj.editJsonKey}`,
              Key: newKey,
            }));
            await prisma.project.update({
              where: { id: newProject.id },
              data: { editJsonKey: newKey },
            });
          } catch { /* R2コピー失敗時はeditJsonKey無しで続行 */ }
        }
      }
    } catch { /* サンプルコピー失敗時も登録は続行 */ }

    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashSessionToken(sessionToken);
    const expiresAt = getSessionExpiresAt(30);

    await prisma.session.create({
      data: { userId: user.id, sessionTokenHash, expiresAt, lastAccessedAt: new Date() },
    });

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, plan: user.plan, iconUrl: user.iconUrl },
    });
    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
    return response;
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
