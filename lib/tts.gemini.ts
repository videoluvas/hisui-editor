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

export function buildPrompt(transcript: string, opts: {
  style?: string;
  pacing?: string;
  tone?: string;
  accent?: string;
  commonRules?: string;
  negativePrompt?: string;
}): string {
  const lines = [
    "Generate spoken audio using the performance instructions below.",
    "Read only the text inside the TRANSCRIPT section.",
    "Do not read the instructions or section headings aloud.",
  ];
  const notes: string[] = [];
  if (opts.style?.trim()) notes.push(`Style: ${opts.style.trim()}`);
  if (opts.pacing && PACING_TO_INSTRUCTION[opts.pacing]) notes.push(`Pacing: ${PACING_TO_INSTRUCTION[opts.pacing]}`);
  if (opts.tone && TONE_TO_INSTRUCTION[opts.tone]) notes.push(`Tone: ${TONE_TO_INSTRUCTION[opts.tone]}`);
  if (opts.accent?.trim()) notes.push(`Accent: ${opts.accent.trim()}`);
  if (opts.commonRules?.trim()) notes.push(`Additional rules: ${opts.commonRules.trim()}`);
  if (opts.negativePrompt?.trim()) notes.push(`Avoid: ${opts.negativePrompt.trim()}`);
  if (notes.length > 0) { lines.push("", "# DIRECTOR'S NOTES"); lines.push(...notes); }
  lines.push("", "# TRANSCRIPT", transcript);
  return lines.join("\n");
}

export async function callGeminiTts(providerModelId: string, prompt: string, voice: string, apiKey: string, maxRetry: number): Promise<Buffer> {
  const url = `${GOOGLE_AI_BASE}/models/${providerModelId}:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  });
  let lastErr: Error = new Error("Unknown error");
  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1200 * attempt));
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (NON_RETRYABLE.has(res.status)) throw new Error(`Gemini TTS ${res.status}: ${errText}`);
      lastErr = new Error(`Gemini TTS ${res.status}: ${errText}`);
      continue;
    }
    let data: unknown;
    try { data = await res.json(); } catch { lastErr = new Error("Gemini TTS: JSON parse error"); continue; }
    const inlineData = (data as any)?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) { lastErr = new Error("Gemini TTS: 音声データが返されませんでした"); continue; }
    return buildWav(Buffer.from(inlineData.data as string, "base64"));
  }
  throw lastErr;
}

// 16bit モノラル PCM の WAV（ヘッダー 44 バイト）の長さ（秒）
export function wavSeconds(wav: Buffer): number {
  return (wav.length - 44) / (TTS_SAMPLE_RATE * 2);
}
