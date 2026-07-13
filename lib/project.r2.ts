import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/lib/fileupload.r2";

export function buildEditJsonKey(userId: string, workspaceId: string, projectId: string): string {
  return `user/${userId}/${workspaceId}/project/${projectId}/edit.json`;
}

export function buildEmptyEditJson(
  width: number,
  height: number,
  fps: number,
  backgroundColor: string,
) {
  return {
    timeline: {
      fonts: [{ src: "https://templates.shotstack.io/hello-world-title-video/f60f6f75-38b6-4aa8-8db0-28741aa34ec8/MovieLetters.ttf" }],
      background: backgroundColor,
      tracks: [
        {
          clips: [{
            asset: { type: "text", text: "WELCOME TO HISUI", font: { family: "Movie Letters", color: "#ffffff", size: 80 }, alignment: { horizontal: "center" }, width: 720, height: 212 },
            start: 0, length: 10,
            transition: { in: "fade", out: "fade" },
            fit: "none", scale: 1,
            offset: { x: -0.206, y: -0.138 },
            position: "center", effect: "zoomIn",
          }],
        },
        {
          clips: [
            {
              asset: { type: "video", src: "https://templates.shotstack.io/hello-world-title-video/aa5d068a-c2c2-4cff-800a-15cacf9a8809/earth.mp4", trim: 5, volume: 1 },
              start: 0, length: 10,
              transition: { in: "fade", out: "fade" },
              position: "center", scale: 1,
            },
            {
              asset: { type: "audio", src: "https://templates.shotstack.io/hello-world-title-video/47474436-7f03-48fd-990d-f00b04b339b3/source.mp3", volume: 1, effect: "fadeOut" },
              start: 0, length: 10,
            },
          ],
        },
      ],
    },
    output: {
      format: "mp4",
      size: { width, height },
      fps,
    },
  };
}

export async function putEditJsonToR2(key: string, data: unknown): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: "application/json",
  });
  await r2Client.send(command);
}

export async function getEditJsonFromR2<T = unknown>(key: string): Promise<T | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    const res = await r2Client.send(command);
    const body = await res.Body?.transformToString();
    if (!body) return null;
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}