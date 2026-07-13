export function sanitizeExportFileName(value: string | null | undefined) {
  const base = (value ?? "project").trim() || "project";
  return base.replace(/[\\/:*?"<>|]/g, "_");
}