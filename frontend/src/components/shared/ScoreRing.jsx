function ScoreRing({ score }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="70" y="70" textAnchor="middle" dominantBaseline="central"
          className="font-black" style={{ fontSize: 28, fill: color, fontFamily: 'inherit' }}>
          {score}
        </text>
        <text x="70" y="92" textAnchor="middle"
          style={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'inherit', fontWeight: 700, letterSpacing: 2 }}>
          / 100
        </text>
      </svg>
      <p className="text-[13px] font-black uppercase tracking-widest text-slate-400">Puntuación Global</p>
    </div>
  );
}

export default ScoreRing;
