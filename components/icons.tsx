export const TEAL = "#2aab8e";

// アイコン画像が未設定のユーザー用
export const UserGlyph = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="8.5" r="4" />
    <path d="M4 20.5c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5z" />
  </svg>
);

export const IconSettings = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2v2" />
  </svg>
);