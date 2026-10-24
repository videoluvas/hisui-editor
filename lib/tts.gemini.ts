import {
  PACING_TO_INSTRUCTION,
  TONE_TO_INSTRUCTION,
} from "@/lib/ttsSettings";

const GOOGLE_AI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const NON_RETRYABLE = new Set([400, 401, 403, 404]);
export const TTS_SAMPLE_RATE = 24000;

export function buildWav(pcm: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
  header.writeUInt16LE(channels * (bitDepth / 8), 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm] as unknown as Uint8Array[]);
}

export function mergeWavs(wavs: Buffer[]): Buffer {
  if (wavs.length === 1) return wavs[0];
  const pcms = wavs.map((w) => w.slice(44));
  return buildWav(Buffer.concat(pcms as unknown as Uint8Array[]));
}

export function chunkText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  const parts = text.split(/(?<=[。！？\n])/);
  let cur = "";
  for (const p of parts) {
    if (cur.length + p.length > maxLen && cur.length > 0) {
      chunks.push(cur.trim());
      cur = p;
    } else {
      cur += p;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.length > 0 ? chunks : [text];
}

// Gemini 3.8 TTS は本文をそのまま読み上げるので、演出指示は speech_metadata.style に分けて渡す
export function buildStyle(opts: {
  style?: string;
  pacing?: string;
  tone?: string;
  accent?: string;
  commonRules?: string;
  negativePrompt?: string;
}): string {
  const notes: string[] = [];
  if (opts.style?.trim()) notes.push(opts.style.trim());
  if (opts.pacing && PACING_TO_INSTRUCTION[opts.pacing]) notes.push(`Pacing: ${PACING_TO_INSTRUCTION[opts.pacing]}`);
  if (opts.tone && TONE_TO_INSTRUCTION[opts.tone]) notes.push(`Tone: ${TONE_TO_INSTRUCTION[opts.tone]}`);
  if (opts.accent?.trim()) notes.push(`Accent: ${opts.accent.trim()}`);
  if (opts.commonRules?.trim()) notes.push(`Additional rules: ${opts.commonRules.trim()}`);
  if (opts.negativePrompt?.trim()) notes.push(`Avoid: ${opts.negativePrompt.trim()}`);
  return notes.join("\n");
}

export async function callGeminiTts(providerModelId: string, text: string, style: string, voice: string, apiKey: string, maxRetry: number): Promise<Buffer> {
  const url = `${GOOGLE_AI_BASE}/interactions`;
  const body = JSON.stringify({
    model: providerModelId,
    input: [{
      type: "user_input",
      content: [{ type: "text", text, ...(style ? { annotations: [{ type: "speech_metadata", style }] } : {}) }],
    }],
    response_format: { type: "audio", mime_type: "audio/l16", sample_rate: TTS_SAMPLE_RATE },
    generation_config: { speech_config: [{ voice }] },
  });
  let lastErr: Error = new Error("Unknown error");
  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1200 * attempt));
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (NON_RETRYABLE.has(res.status)) throw new Error(`Gemini TTS ${res.status}: ${errText}`);
      lastErr = new Error(`Gemini TTS ${res.status}: ${errText}`);
      continue;
    }
    let data: unknown;
    try { data = await res.json(); } catch { lastErr = new Error("Gemini TTS: JSON parse error"); continue; }
    const steps: any[] = (data as any)?.steps ?? [];
    const audio = steps.filter((s) => s?.type === "model_output").flatMap((s) => s.content ?? []).filter((c: any) => c?.type === "audio" && c.data).pop();
    if (!audio) { lastErr = new Error("Gemini TTS: 音声データが返されませんでした"); continue; }
    return buildWav(Buffer.from(audio.data as string, "base64"), audio.sample_rate ?? TTS_SAMPLE_RATE);
  }
  throw lastErr;
}

// 16bit モノラル PCM の WAV（ヘッダー 44 バイト）の長さ（秒）
export function wavSeconds(wav: Buffer): number {
  return (wav.length - 44) / (TTS_SAMPLE_RATE * 2);
}
