// Rapor adi/id'sinden deterministik uretilen dekoratif thumbnail + renk yardimcisi.
// Deste kartlari da ayni renk paletini kullanir (thumbColors).

const PALETTES = [
  ["#0ea5e9", "#6366f1"],
  ["#6366f1", "#a855f7"],
  ["#0d9488", "#0ea5e9"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#0d9488"],
  ["#ec4899", "#a855f7"],
  ["#0070f3", "#00c4f3"],
  ["#8b5cf6", "#ec4899"],
  ["#f43f5e", "#f59e0b"],
  ["#14b8a6", "#3b82f6"],
];

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// eslint-disable-next-line react-refresh/only-export-components
export function thumbColors(seed) {
  return PALETTES[hashString(seed || "rapor") % PALETTES.length];
}

// eslint-disable-next-line react-refresh/only-export-components
export function thumbGradient(seed) {
  const [c1, c2] = thumbColors(seed);
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

export default function ReportThumb({ seed }) {
  const h = hashString(seed || "rapor");
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const gid = `g-${h % 100000}`;
  const bars = Array.from({ length: 6 }, (_, i) => 22 + ((h >> (i * 4)) % 46));

  return (
    <svg viewBox="0 0 320 180" role="img" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${gid})`} />
      <g fill="rgba(255,255,255,0.28)">
        {bars.map((b, i) => (
          <rect key={i} x={38 + i * 42} y={150 - b} width="26" height={b} rx="4" />
        ))}
      </g>
      <g stroke="rgba(255,255,255,0.5)" strokeWidth="3" fill="none" strokeLinecap="round">
        <polyline points={bars.map((b, i) => `${51 + i * 42},${138 - b}`).join(" ")} />
      </g>
      <rect width="320" height="180" fill="rgba(0,0,0,0.06)" />
    </svg>
  );
}
