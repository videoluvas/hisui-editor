export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { buildEditJsonKey, buildEmptyEditJson, putEditJsonToR2 } from "@/lib/project.r2";

export async function GET(req: NextRequest) {
  try {
    const session = await getEditorSessionFromCookie();

    if (!session) {
      return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    const where: Record<string, unknown> = { userId: session.user.id };
    if (workspaceId) where.workspaceId = workspaceId;

    const projects = await prisma.project.findMany({
      where: where as any,
      orderBy: { updatedAt: "desc" },
      include: {
        files: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const serialized = projects.map((p) => ({
      ...p,
      files: p.files.map((f) => ({
        ...f,
        sizeBytes: f.sizeBytes?.toString() ?? null,
      })),
    }));

    return NextResponse.json({ ok: true, projects: serialized });
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getEditorSessionFromCookie();
    if (!session) {
      return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });
    }

    const { title, aspectRatio, width, height, fps, backgroundColor, workspaceId } = await req.json();

    if (!workspaceId) {
      return NextResponse.json({ ok: false, message: "workspaceIdが必要です" }, { status: 400 });
    }

    const projectId = crypto.randomUUID();
    const editJsonKey = buildEditJsonKey(session.user.id, workspaceId, projectId);

    await putEditJsonToR2(
      editJsonKey,
      buildEmptyEditJson(
        width ?? 1920,
        height ?? 1080,
        fps ?? 30,
        backgroundColor ?? "#000000",
      ),
    );

    const project = await prisma.project.create({
      data: {
        id: projectId,
        userId: session.user.id,
        title: title ?? "Untitled Project",
        aspectRatio: aspectRatio ?? "16:9",
        width: width ?? 1920,
        height: height ?? 1080,
        fps: fps ?? 30,
        backgroundColor: backgroundColor ?? "#000000",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editJsonKey,
        ...(workspaceId ? { workspaceId } : {}),
      } as any,
    });

    return NextResponse.json({ ok: true, project });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getEditorSessionFromCookie();

    if (!session) {
      return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });
    }

    const { projectId, editJson } = await req.json();

    if (!projectId) {
      return NextResponse.json({ ok: false, message: "projectIdが必要です" }, { status: 400 });
    }

    if (!editJson) {
      return NextResponse.json({ ok: false, message: "editJsonが必要です" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ ok: false, message: "プロジェクトが見つかりません" }, { status: 404 });
    }

    const p = project as any;
    const existingKey = p.editJsonKey as string | null;
    const editJsonKey = existingKey ?? buildEditJsonKey(
      session.user.id,
      p.workspaceId ?? "no-workspace",
      projectId,
    );
    await putEditJsonToR2(editJsonKey, editJson);

    if (!existingKey) {
      await prisma.project.update({
        where: { id: projectId },
        data: { editJsonKey } as any,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/projects error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getEditorSessionFromCookie();

    if (!session) {
      return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });
    }

    const { projectId } = await req.json();

    if (!projectId) {
      return NextResponse.json({ ok: false, message: "projectIdが必要です" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ ok: false, message: "プロジェクトが見つかりません" }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/projects error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}