export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { r2Client, R2_BUCKET_NAME } from "@/lib/fileupload.r2";
import { buildEditJsonKey } from "@/lib/project.r2";

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  try {
    const workspaces = await (prisma as any).workspace.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      workspaces: workspaces.map((w: any) => ({
        id: w.id,
        name: w.name,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[workspace GET]", e);
    return NextResponse.json({ ok: false, message: `サーバーエラー: ${e}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name ?? "新しいワークスペース").trim() || "新しいワークスペース";

    const workspace = await (prisma as any).workspace.create({
      data: { userId: session.userId, name },
    });

    // デフォルトサンプルをコピー（失敗してもワークスペース作成は続行）
    let sampleStoryboardId: string | null = null;
    let sampleProject: {
      id: string; title: string; status: string; thumbnailUrl: string | null;
      aspectRatio: string | null; width: number | null; height: number | null;
      fps: number | null; backgroundColor: string | null; editJsonKey: string | null;
      durationSec: number | null; createdAt: string; updatedAt: string;
    } | null = null;

    try {
      const sampleStoryboards = await prisma.storyboardMain.findMany({
        where: { isDefaultSample: true },
        include: { scenes: true },
      });

      for (const sb of sampleStoryboards) {
        const newSb = await prisma.storyboardMain.create({
          data: {
            userId: session.userId,
            workspaceId: workspace.id,
            title: sb.title,
            originalScript: sb.originalScript,
            duration: sb.duration,
            prompt: sb.prompt,
            speed: sb.speed,
            status: "draft",
          },
        });

        if (!sampleStoryboardId) sampleStoryboardId = newSb.id;

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
            userId: session.userId,
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

        let finalEditJsonKey: string | null = null;
        if (pj.editJsonKey) {
          const newKey = buildEditJsonKey(session.userId, workspace.id, newProject.id);
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
            finalEditJsonKey = newKey;
          } catch { /* R2コピー失敗時はeditJsonKey無しで続行 */ }
        }

        if (!sampleProject) {
          sampleProject = {
            id: newProject.id,
            title: newProject.title,
            status: newProject.status,
            thumbnailUrl: newProject.thumbnailUrl,
            aspectRatio: newProject.aspectRatio,
            width: newProject.width,
            height: newProject.height,
            fps: newProject.fps,
            backgroundColor: newProject.backgroundColor,
            editJsonKey: finalEditJsonKey,
            durationSec: newProject.durationSec,
            createdAt: newProject.createdAt.toISOString(),
            updatedAt: newProject.updatedAt.toISOString(),
          };
        }
      }
    } catch { /* サンプルコピー失敗時もワークスペース作成は続行 */ }

    return NextResponse.json({
      ok: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
      sampleStoryboardId,
      sampleProject,
    });
  } catch (e) {
    console.error("[workspace POST]", e);
    return NextResponse.json({ ok: false, message: `サーバーエラー: ${e}` }, { status: 500 });
  }
}
