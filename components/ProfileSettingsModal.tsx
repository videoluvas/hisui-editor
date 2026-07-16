"use client";

import { useEffect, useRef, useState } from "react";
import { TEAL } from "@/components/icons";

const FONT = "'Noto Sans JP', sans-serif";

type ProfileData = {
  id: string;
  name: string | null;
  surname: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  iconUrl: string | null;
  plan: string | null;
};

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid #e2e8f0", borderRadius: 8,
  background: "#f8fafd", fontSize: 13, color: "#1e293b",
  fontFamily: FONT, padding: "9px 12px", outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#475569",
  display: "block", marginBottom: 5, fontFamily: FONT,
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <label style={labelStyle}>{label}</label>
        {hint && <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em",
      textTransform: "uppercase" as const, marginBottom: 10, paddingBottom: 6,
      borderBottom: "1px solid #f1f5f9", fontFamily: FONT, marginTop: 6,
    }}>
      {children}
    </div>
  );
}

export default function ProfileSettingsModal({
  onClose,
  onUpdated,
}: {
  onClose: () => void;
  onUpdated?: (name: string | null, iconUrl: string | null) => void;
}) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName]              = useState("");
  const [surname, setSurname]        = useState("");
  const [phone, setPhone]            = useState("");
  const [companyName, setCompanyName] = useState("");
  const [iconUrl, setIconUrl]        = useState("");
  const [saving, setSaving]          = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [error, setError]            = useState<string | null>(null);
  const [success, setSuccess]        = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const [newPassword, setNewPassword]   = useState("");
  const [pwConfirm, setPwConfirm]       = useState("");
  const [pwSaving, setPwSaving]         = useState(false);
  const [pwError, setPwError]           = useState<string | null>(null);
  const [pwSuccess, setPwSuccess]       = useState(false);

  const [newEmail, setNewEmail]         = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError]     = useState<string | null>(null);
  const [emailSent, setEmailSent]       = useState(false);

  useEffect(() => {
    fetch("/api/user/profile", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.user) {
          const u: ProfileData = res.user;
          setProfile(u);
          setName(u.name ?? "");
          setSurname(u.surname ?? "");
          setPhone(u.phone ?? "");
          setCompanyName(u.companyName ?? "");
          setIconUrl(u.iconUrl ?? "");
        }
      });
  }, []);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("画像は2MB以内でアップロードしてください"); return; }
    setUploadingIcon(true);
    setError(null);
    try {
      const presignRes = await fetch("/api/fileupload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
      });
      const presign = await presignRes.json() as { ok: boolean; presignedUrl?: string; fileUrl?: string };
      if (!presign.ok || !presign.presignedUrl || !presign.fileUrl) throw new Error("アップロードURLの取得に失敗しました");
      await fetch(presign.presignedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setIconUrl(presign.fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setUploadingIcon(false);
      e.target.value = "";
    }
  };

  const handlePasswordChange = async () => {
    setPwError(null);
    setPwSuccess(false);
    if (newPassword.length < 8) { setPwError("パスワードは8文字以上で入力してください"); return; }
    if (newPassword !== pwConfirm) { setPwError("パスワードが一致しません"); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json() as { ok: boolean; message?: string };
      if (!data.ok) throw new Error(data.message ?? "変更に失敗しました");
      setPwSuccess(true);
      setNewPassword("");
      setPwConfirm("");
      setTimeout(() => setPwSuccess(false), 2500);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "変更に失敗しました");
    } finally {
      setPwSaving(false);
    }
  };

  const handleEmailChange = async () => {
    setEmailError(null);
    setEmailSent(false);
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailError("有効なメールアドレスを入力してください"); return;
    }
    setEmailSending(true);
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json() as { ok: boolean; message?: string };
      if (!data.ok) throw new Error(data.message ?? "送信に失敗しました");
      setEmailSent(true);
      setNewEmail("");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setEmailSending(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, surname, phone, companyName, iconUrl }),
      });
      const data = await res.json() as { ok: boolean; message?: string; user?: ProfileData };
      if (!data.ok) throw new Error(data.message ?? "保存に失敗しました");
      setSuccess(true);
      const fullName = [data.user?.name, data.user?.surname].filter(Boolean).join(" ") || null;
      onUpdated?.(fullName, data.user?.iconUrl ?? null);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const displayIcon = iconUrl || null;
  const initials = [name, surname].filter(Boolean).map((s) => s[0]).join("") || "✦";

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 400, backdropFilter: "blur(1px)" }}
      />
      <div style={{
        position: "fixed", right: 0, top: 0, bottom: 0, width: 380,
        background: "#fff", zIndex: 401,
        boxShadow: "-4px 0 32px rgba(0,0,0,0.14)",
        display: "flex", flexDirection: "column",
        fontFamily: FONT,
        animation: "prof-slide 0.22s cubic-bezier(0.22,1,0.36,1) both",
      }}>
        <style>{`@keyframes prof-slide{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "2px 4px", borderRadius: 4, display: "flex", alignItems: "center" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M10 3L5 8l5 5"/>
              </svg>
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>プロフィール設定</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8", lineHeight: 1, padding: "2px 6px", borderRadius: 6 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px" }}>
          {/* ── アイコン ── */}
          <SectionTitle>プロフィールアイコン</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div
              onClick={() => iconInputRef.current?.click()}
              style={{
                width: 64, height: 64, borderRadius: "50%",
                background: displayIcon ? "transparent" : `${TEAL}22`,
                border: `2px solid ${TEAL}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: TEAL, fontSize: 22, overflow: "hidden",
                cursor: "pointer", flexShrink: 0, position: "relative",
              }}
            >
              {displayIcon
                ? <img src={displayIcon} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                : initials}
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0, transition: "opacity 0.15s",
                borderRadius: "50%",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0"; }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M12.5 3.5l2 2L5 15H3v-2L12.5 3.5z"/>
                </svg>
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={() => iconInputRef.current?.click()}
                disabled={uploadingIcon}
                style={{
                  fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8,
                  border: `1.5px solid ${TEAL}`, background: "#fff", color: TEAL,
                  cursor: uploadingIcon ? "not-allowed" : "pointer", fontFamily: FONT,
                }}
              >
                {uploadingIcon ? "アップロード中..." : "画像を変更"}
              </button>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 5, fontFamily: FONT }}>JPG / PNG / WebP、2MB以内</div>
              {iconUrl && (
                <button
                  type="button"
                  onClick={() => setIconUrl("")}
                  style={{ fontSize: 10, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4, fontFamily: FONT }}
                >
                  削除
                </button>
              )}
            </div>
            <input ref={iconInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleIconUpload} />
          </div>

          {/* ── 基本情報 ── */}
          <SectionTitle>基本情報</SectionTitle>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>姓</label>
              <input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="山田" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>名</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="太郎" style={inputStyle} />
            </div>
          </div>

          <Field label="メールアドレス">
            <input
              value={profile?.email ?? ""}
              disabled
              style={{ ...inputStyle, color: "#94a3b8", cursor: "not-allowed", background: "#f1f5f9" }}
            />
          </Field>

          <Field label="電話番号" hint="任意">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="090-0000-0000"
              type="tel"
              style={inputStyle}
            />
          </Field>

          {/* ── 会社情報 ── */}
          <SectionTitle>会社情報</SectionTitle>

          <Field label="会社名 / 組織名" hint="任意">
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="株式会社〇〇"
              style={inputStyle}
            />
          </Field>

          {/* ── プラン ── */}
          <SectionTitle>プラン</SectionTitle>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 12px", borderRadius: 10,
            background: (!profile?.plan || profile.plan === "Free") ? "#f8fafc" : `${TEAL}0a`,
            border: `1px solid ${(!profile?.plan || profile.plan === "Free") ? "#e2e8f0" : `${TEAL}33`}`,
            marginBottom: 4,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", fontFamily: FONT }}>
                {(!profile?.plan || profile.plan === "Free") ? "無料プラン" : profile.plan}
              </div>
              {(!profile?.plan || profile.plan === "Free") && (
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, fontFamily: FONT }}>
                  有料プランでクレジット上限・モデル制限が解放されます
                </div>
              )}
            </div>
            {(!profile?.plan || profile.plan === "Free") && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                background: `${TEAL}18`, color: TEAL, flexShrink: 0, fontFamily: FONT,
              }}>
                アップグレード
              </span>
            )}
          </div>

          {/* ── セキュリティ ── */}
          <SectionTitle>セキュリティ</SectionTitle>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>パスワードを変更</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新しいパスワード（8文字以上）"
              autoComplete="new-password"
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <input
              type="password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              placeholder="パスワード（確認）"
              autoComplete="new-password"
              style={inputStyle}
            />
            {pwError && (
              <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#c62828", marginTop: 8, fontFamily: FONT }}>
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div style={{ background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#065f46", marginTop: 8, fontFamily: FONT }}>
                パスワードを変更しました
              </div>
            )}
            <button
              type="button"
              onClick={handlePasswordChange}
              disabled={pwSaving || !newPassword}
              style={{
                marginTop: 10, fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 8,
                border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569",
                cursor: (pwSaving || !newPassword) ? "not-allowed" : "pointer", fontFamily: FONT,
              }}
            >
              {pwSaving ? "変更中..." : "パスワードを変更する"}
            </button>
          </div>

          <div style={{ marginBottom: 4 }}>
            <label style={labelStyle}>メールアドレスを変更</label>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, fontFamily: FONT }}>
              現在: {profile?.email ?? "—"}
            </div>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="新しいメールアドレス"
              autoComplete="email"
              style={inputStyle}
            />
            {emailError && (
              <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#c62828", marginTop: 8, fontFamily: FONT }}>
                {emailError}
              </div>
            )}
            {emailSent && (
              <div style={{ background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#065f46", marginTop: 8, fontFamily: FONT }}>
                確認メールを送信しました。メールのリンクをクリックして変更を完了してください。
              </div>
            )}
            <button
              type="button"
              onClick={handleEmailChange}
              disabled={emailSending || !newEmail}
              style={{
                marginTop: 10, fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 8,
                border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569",
                cursor: (emailSending || !newEmail) ? "not-allowed" : "pointer", fontFamily: FONT,
              }}
            >
              {emailSending ? "送信中..." : "確認メールを送信"}
            </button>
          </div>

          {/* エラー / 成功 */}
          {error && (
            <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#c62828", marginTop: 12, fontFamily: FONT }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#065f46", marginTop: 12, fontFamily: FONT }}>
              プロフィールを保存しました
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700,
              border: "none", borderRadius: 10,
              background: saving ? "#94a3b8" : `linear-gradient(135deg, ${TEAL}, #0d7a6e)`,
              color: "#fff", cursor: saving ? "not-allowed" : "pointer",
              fontFamily: FONT, boxShadow: saving ? "none" : `0 4px 14px ${TEAL}44`,
              transition: "background 0.15s",
            }}
          >
            {saving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </>
  );
}
