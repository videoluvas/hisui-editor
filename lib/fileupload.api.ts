import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/fileupload.r2";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export type UploadFileInput = {
  userId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  projectId?: string;
  workspaceId?: string | null;
};

export async function createPresignedUploadUrl(input: UploadFileInput) {
  const fileId = uuidv4();
  const ext = input.fileName.split(".").pop();
  const wsSegment = input.workspaceId ?? "no-workspace";
  const storageKey = `user/${input.userId}/${wsSegment}/upload/${fileId}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: storageKey,
    ContentType: input.mimeType,
  });

  const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });

  const file = await prisma.file.create({
    data: {
      userId: input.userId,
      projectId: input.projectId ?? null,
      workspaceId: input.workspaceId ?? null,
      storageKey,
      fileName: input.fileName,
      fileType: input.mimeType.split("/")[0],
      mimeType: input.mimeType,
      sizeBytes: BigInt(input.sizeBytes),
      fileUrl: `${R2_PUBLIC_URL}/${storageKey}`,
    } as any,
  });

  return {
    presignedUrl,
    fileId: file.id,
    fileUrl: file.fileUrl,
    storageKey,
  };
}

export async function getUserFiles(userId: string, projectId?: string, workspaceId?: string | null) {
  const where: Record<string, unknown> = { userId };
  if (workspaceId) where.workspaceId = workspaceId;
  else if (projectId) where.projectId = projectId;

  const files = await prisma.file.findMany({
    where: where as any,
    orderBy: { createdAt: "desc" },
  });

  return files.map((file) => ({
    ...file,
    sizeBytes: (file as any).sizeBytes?.toString() ?? null,
  }));
}