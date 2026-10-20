/**
 * The rope: a market's participants as one bar split between Side A and Side B, with the judge's
 * flag at the split point. Colours come from --rope-a / --rope-b so it reads on paper and on walnut.
 */
export function Rope({ countA, countB, label, className }: { countA: number; countB: number; label?: string; className?: string }) {
  const total = countA + countB;
  const share = total === 0 ? 50 : (countA / total) * 100;
  const desc = label ?? `${countA} on side A, ${countB} on side B`;
  return (
    <div className={`rope ${className ?? ""}`} role="img" aria-label={desc} data-empty={total === 0}>
      <span className="rope__a" style={{ width: `${share}%` }} />
      <span className="rope__b" style={{ width: `${100 - share}%` }} />
      <svg className="rope__flag" style={{ left: `${share}%` }} width="12" height="22" viewBox="0 0 12 22" aria-hidden="true">
        <rect x="0" y="0" width="2" height="22" />
        <path d="M2 1 L12 4.5 L2 8 Z" />
      </svg>
    </div>
  );
}
