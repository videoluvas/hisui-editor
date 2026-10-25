"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FREE_NARRATION_IMPORTS, FREE_PLAN_CODE, PAID_PLANS, SPECIAL_CONTACT_URL, SPECIAL_ITEMS, onOpenPricing, openPricing, planContactUrl, yen } from "@/lib/pricing";

const TEAL = "#169385";
const INK = "#0f172a";
const FONT = "'Noto Sans JP', sans-serif";

// 無料プランで AI 生成を呼んだとき（API が code: FREE_PLAN を返したとき）に料金プランを出す
export default function PricingModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => onOpenPricing(() => setOpen(true)), []);

  useEffect(() => {
    const orig = window.fetch;
    window.fetch = async (...args) => {
      const res = await orig(...args);
      if (res.status === 402 || res.status === 403)
        res.clone().json().then((d) => { if (d?.code === FREE_PLAN_CODE) openPricing(); }).catch(() => {});
      return res;
    };
    return () => { window.fetch = orig; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const card: React.CSSProperties = { flex: "1 1 200px", minWidth: 0, border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10, background: "#fff" };
  const button = (primary: boolean): React.CSSProperties => ({
    display: "block", textAlign: "center", padding: "10px 0", borderRadius: 999, fontSize: 13, fontWeight: 700, textDecoration: "none",
    color: primary ? "#fff" : TEAL, background: primary ? TEAL : "#fff", border: `1.5px solid ${TEAL}`, marginTop: "auto",
  });
  const item = (ok: boolean, text: string, color = ok ? "#334155" : "#94a3b8", mark = ok ? TEAL : "#cbd5e1") => (
    <li key={text} style={{ display: "flex", gap: 6, fontSize: 12, lineHeight: 1.6, color }}>
      <span aria-hidden="true" style={{ color: mark, fontWeight: 800 }}>{ok ? "✓" : "—"}</span>{text}
    </li>
  );
  const list: React.CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 };

  return createPortal(
    <div onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 16, fontFamily: FONT }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="料金プラン"
        style={{ width: 960, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", background: "#fff", borderRadius: 18, padding: 22, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", gap: 16, boxSizing: "border-box", color: INK }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>この機能は有料プランでご利用いただけます</h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#475569", lineHeight: 1.7 }}>AI で画像・動画・ナレーションなどを作るには、有料プランをお申し込みください。</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="閉じる" style={{ border: "none", background: "transparent", color: "#999", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "stretch" }}>
          <div style={{ ...card, background: "#f8fafc" }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>無料プラン</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>¥0</div>
            <ul style={list}>
              {item(true, "パワーポイントの取り込み 無制限")}
              {item(true, "動画の書き出し 無制限（透かし入り）")}
              {item(true, `ノートからナレーション ${FREE_NARRATION_IMPORTS} 回まで（累計）`)}
              {item(false, "AI 画像・動画・BGM の生成")}
              {item(false, "透かしなしの書き出し")}
            </ul>
            <div style={{ marginTop: "auto", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#94a3b8", padding: "10px 0" }}>ご利用中</div>
          </div>

          {PAID_PLANS.map((p) => (
            <div key={p.id} style={{ ...card, border: `1.5px solid ${TEAL}55` }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{p.label}</div>
              <div>
                <span style={{ fontSize: 24, fontWeight: 800 }}>{yen(p.price)}</span>
                <span style={{ fontSize: 12, color: "#64748b", marginLeft: 4 }}>/ 月（税込）</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: TEAL }}>{p.forWhom}</div>
              <ul style={list}>{p.items.map((t) => item(true, t))}</ul>
              <a href={planContactUrl(p.label)} target="_blank" rel="noreferrer" style={button(true)}>このプランを申し込む</a>
            </div>
          ))}

          <div style={{ ...card, background: INK, color: "#fff", border: "none" }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>特別プラン</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>お見積り</div>
            <ul style={list}>{SPECIAL_ITEMS.map((s) => item(true, s, "#fff", "#5eead4"))}</ul>
            <a href={SPECIAL_CONTACT_URL} target="_blank" rel="noreferrer" style={{ ...button(true), background: "#fff", color: INK, border: "none" }}>相談する</a>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
          お申し込みはお問い合わせフォームから受け付けています。担当者からメールでお支払い方法とお手続きをご案内します。
          <a href="/pricing" target="_blank" rel="noreferrer" style={{ color: TEAL, fontWeight: 700, marginLeft: 6 }}>料金プランの詳細</a>
        </p>
      </div>
    </div>,
    document.body,
  );
}
