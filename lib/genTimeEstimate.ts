export function imageTimeEstimate(modelId: string, testTimeScaling?: number): string {
  switch (modelId) {
    case "google-image-lite":  return "約15〜30秒";
    case "google-image-pro":   return "約30〜60秒";
    case "seedream-5-0-pro":   return "約30〜60秒";
    case "gpt-image-2-high":
    case "gpt-image-1-5":      return "約30〜60秒";
    case "reve-1": {
      const s = testTimeScaling ?? 1;
      if (s >= 10) return "約8〜15分";
      if (s >= 5)  return "約3〜7分";
      if (s >= 3)  return "約2〜4分";
      return "約1〜2分";
    }
    default: return "約30秒〜数分";
  }
}

export function videoTimeEstimate(modelId: string): string {
  switch (modelId) {
    case "veo-3-lite":       return "約2〜5分";
    case "veo-3":            return "約3〜8分";
    case "seedance-1-5-pro": return "約1〜3分";
    case "kling-v2":         return "約2〜5分";
    case "kling-v2-master":  return "約3〜8分";
    case "kling-v3":         return "約2〜5分";
    case "kling-v3-turbo":   return "約1〜3分";
    default: return "約1〜5分";
  }
}

export function bgmTimeEstimate(modelId: string): string {
  switch (modelId) {
    case "lyria-2":             return "約30〜60秒";
    case "lyria-3-pro-preview": return "約1〜3分";
    default: return "約30〜60秒";
  }
}
