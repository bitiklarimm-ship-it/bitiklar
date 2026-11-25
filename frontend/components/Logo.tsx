/** BITIKLAR belgisi: sakkiz qirrali yulduz (girih) ichida "ب" harfi. */
export default function Logo({ light = false }: { light?: boolean }) {
  const stroke = light ? "#f1e3c6" : "#1b2f5b";
  return (
    <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
      <g fill="none" stroke={stroke} strokeWidth="1.6">
        <rect x="8" y="8" width="24" height="24" />
        <rect x="8" y="8" width="24" height="24" transform="rotate(45 20 20)" />
      </g>
      <text x="20" y="25" textAnchor="middle" fontSize="15" fill="#b88a3e" fontFamily="serif">ب</text>
    </svg>
  );
}
