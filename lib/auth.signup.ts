import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { generateSessionToken, hashSessionToken, getSessionExpiresAt } from "@/lib/session.utils";
import { r2Client, R2_BUCKET_NAME } from "@/lib/fileupload.r2";
import { buildEditJsonKey } from "@/lib/project.r2";
import { isAdminEmail } from "@/lib/admin";
import { SIGNUP_COOKIE, UTM_COOKIE } from "@/lib/analytics";

// 最初に来たときの utm（ブラウザが cookie に残したもの）を読み、登録したことを GA に送る印を付ける
function signupTracking(method: string) {
  const jar = cookies();
  let utm: Record<string, string> | null = null;
  try {
    const raw = jar.get(UTM_COOKIE)?.value;
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") utm = Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === "string").slice(0, 10)) as Record<string, string>;
  } catch {}
  try { jar.set(SIGNUP_COOKIE, method, { path: "/", maxAge: 600, sameSite: "lax" }); } catch {}
  return utm;
}

// 新規ユーザーを作り、最初のワークスペースを用意する（パスワード登録・Google・Microsoft・メールリンクで共通）
export async function createUserWithWorkspace(email: string, name?: string | null, iconUrl?: string | null, method = "email") {
  const signupUtm = signupTracking(method);
  const user = await prisma.user.create({ data: { email, name: name || null, iconUrl: iconUrl || null, ...(signupUtm ? { signupUtm } : {}) } });

  // コンテ→動画化は当面管理者のみ。一般ユーザーはパワーポイント用（サンプルなし）で作る
  const toolType = isAdminEmail(email) ? "conte" : "pptx";
  const workspace = await prisma.workspace.create({
    data: { userId: user.id, name: "マイワークスペース", toolType },
  });
  if (toolType === "conte") await copySamples(user.id, workspace.id).catch(() => {});
  return user;
}

export async function findOrCreateUserByEmail(email: string, name?: string | null, iconUrl?: string | null, method = "email_link") {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { user: existing, created: false };
  return { user: await createUserWithWorkspace(email, name, iconUrl, method), created: true };
}

export async function attachSession<T extends NextResponse>(response: T, userId: string): Promise<T> {
  const sessionToken = generateSessionToken();
  const expiresAt = getSessionExpiresAt(30);
  await prisma.session.create({
    data: { userId, sessionTokenHash: hashSessionToken(sessionToken), expiresAt, lastAccessedAt: new Date() },
  });
  response.cookies.set("session_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return response;
}

async function copySamples(userId: string, workspaceId: string) {
  const sampleStoryboards = await prisma.storyboardMain.findMany({
    where: { isDefaultSample: true },
    include: { scenes: true },
  });

  for (const sb of sampleStoryboards) {
    const newSb = await prisma.storyboardMain.create({
      data: {
        userId,
        workspaceId,
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
          await prisma.storyboardScene.update({ where: { id: newOldId }, data: { imgStyleUnifiedId: newRefId } });
        }
      }
    }
  }

  const sampleProjects = await prisma.project.findMany({ where: { isDefaultSample: true } });
  for (const pj of sampleProjects) {
    const newProject = await prisma.project.create({
      data: {
        userId,
        workspaceId,
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
      const newKey = buildEditJsonKey(userId, workspaceId, newProject.id);
      try {
        await r2Client.send(new CopyObjectCommand({
          Bucket: R2_BUCKET_NAME,
          CopySource: `${R2_BUCKET_NAME}/${pj.editJsonKey}`,
          Key: newKey,
        }));
        await prisma.project.update({ where: { id: newProject.id }, data: { editJsonKey: newKey } });
      } catch { /* R2コピー失敗時はeditJsonKey無しで続行 */ }
    }
  }
}
