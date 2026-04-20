import { useState, useEffect, useRef } from "react";

export default function ElevationChart({ points, coloredSegments, onHover }) {
  const [hoverSi, setHoverSi] = useState(null);
  const [width, setWidth] = useState(300);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      setWidth(entries[0].contentRect.width || 300);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const eles = points.map(p => p.ele).filter(e => e != null);
  if (eles.length < 2) return <div style={{ fontSize: "0.75rem", opacity: 0.5 }}>No elevation data</div>;

  const step = Math.max(1, Math.floor(points.length / 400));
  const sampledIndices = [];
  for (let i = 0; i < points.length; i++) {
    if (i % step === 0 || i === points.length - 1) sampledIndices.push(i);
  }
  const sampled = sampledIndices.map(i => points[i].ele ?? 0);

  const minE = Math.min(...sampled);
  const maxE = Math.max(...sampled);
  const range = maxE - minE || 1;

  const W = width, H = 70;
  const PL = 36, PR = 8, PT = 6, PB = 16;
  const iW = W - PL - PR, iH = H - PT - PB;

  const toX = (si) => PL + (si / (sampled.length - 1)) * iW;
  const toY = (e) => PT + iH - ((e - minE) / range) * iH;

  const baseLinePts = sampled.map((e, si) => `${toX(si).toFixed(1)},${toY(e).toFixed(1)}`).join(" L ");
  const area = `M ${baseLinePts} L ${toX(sampled.length - 1).toFixed(1)},${(PT + iH).toFixed(1)} L ${toX(0).toFixed(1)},${(PT + iH).toFixed(1)} Z`;

  let gain = 0, loss = 0;
  for (let i = 1; i < eles.length; i++) {
    const d = eles[i] - eles[i - 1];
    if (d > 0) gain += d; else loss += Math.abs(d);
  }

  // Map each sampled point to a wind color from coloredSegments
  let colorGroups = null;
  if (coloredSegments && coloredSegments.length > 0) {
    const posToIdx = new Map();
    points.forEach((p, i) => posToIdx.set(`${p.lat},${p.lon}`, i));

    const segRanges = coloredSegments.map(seg => ({
      start: posToIdx.get(`${seg.positions[0][0]},${seg.positions[0][1]}`),
      end: posToIdx.get(`${seg.positions[seg.positions.length - 1][0]},${seg.positions[seg.positions.length - 1][1]}`),
      color: seg.color,
    })).filter(s => s.start != null && s.end != null);

    const getColor = (origIdx) => {
      const seg = segRanges.find(s => origIdx >= s.start && origIdx <= s.end);
      if (seg) return seg.color;
      if (segRanges.length === 0) return "#60a5fa";
      if (origIdx < segRanges[0].start) return segRanges[0].color;
      return segRanges[segRanges.length - 1].color;
    };

    const perPoint = sampledIndices.map(origIdx => getColor(origIdx));

    colorGroups = [];
    let i = 0;
    while (i < sampled.length) {
      const color = perPoint[i];
      const startSi = i;
      while (i < sampled.length && perPoint[i] === color) i++;
      const endSi = Math.min(i, sampled.length - 1);
      colorGroups.push({ color, startSi, endSi });
    }
  }

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const si = Math.max(0, Math.min(sampled.length - 1, Math.round(((x - PL) / iW) * (sampled.length - 1))));
    setHoverSi(si);
    onHover?.(points[sampledIndices[si]]);
  };

  const handleMouseLeave = () => {
    setHoverSi(null);
    onHover?.(null);
  };

  return (
    <div ref={containerRef}>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "0.4rem", fontSize: "0.8rem" }}>
        <span style={{ color: "#4ade80" }}>↑ {Math.round(gain)} m</span>
        <span style={{ color: "#f87171" }}>↓ {Math.round(loss)} m</span>
        <span style={{ opacity: 0.5 }}>{Math.round(minE)}–{Math.round(maxE)} m</span>
      </div>
      <svg width={W} height={H} style={{ display: "block", width: "100%", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {colorGroups
            ? colorGroups.map((g, gi) => (
                <clipPath key={gi} id={`ele-clip-${gi}`}>
                  <rect x={toX(g.startSi)} y={PT} width={toX(g.endSi) - toX(g.startSi) + 1} height={iH + 1} />
                </clipPath>
              ))
            : (
              <linearGradient id="ele-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.03" />
              </linearGradient>
            )
          }
        </defs>
        <line x1={PL} y1={PT} x2={PL} y2={PT + iH} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1={PL} y1={PT + iH} x2={PL + iW} y2={PT + iH} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        {colorGroups ? (
          colorGroups.map((g, gi) => {
            const pathPts = sampled
              .slice(g.startSi, g.endSi + 1)
              .map((e, j) => `${toX(g.startSi + j).toFixed(1)},${toY(e).toFixed(1)}`);
            return (
              <g key={gi}>
                <path d={area} fill={g.color} fillOpacity="0.15" clipPath={`url(#ele-clip-${gi})`} />
                <path d={`M ${pathPts.join(" L ")}`} fill="none" stroke={g.color} strokeWidth="1.5" strokeLinejoin="round" />
              </g>
            );
          })
        ) : (
          <>
            <path d={area} fill="url(#ele-fill)" />
            <path d={`M ${baseLinePts}`} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round" />
          </>
        )}
        <text x={PL - 3} y={PT + 4} textAnchor="end" fill="rgba(255,255,255,0.45)" fontSize="9">{Math.round(maxE)}</text>
        <text x={PL - 3} y={PT + iH + 1} textAnchor="end" fill="rgba(255,255,255,0.45)" fontSize="9">{Math.round(minE)}</text>
        <text x={PL} y={H} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">Start</text>
        <text x={PL + iW} y={H} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">End</text>
        {hoverSi !== null && (() => {
          const hx = toX(hoverSi);
          const hy = toY(sampled[hoverSi]);
          const labelAnchor = hoverSi > sampled.length * 0.8 ? "end" : "middle";
          return (
            <>
              <line x1={hx} y1={PT} x2={hx} y2={PT + iH} stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="2,2" />
              <circle cx={hx} cy={hy} r="3" fill="#fff" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
              <text x={hx} y={Math.max(PT + 9, hy - 5)} textAnchor={labelAnchor} fill="#fff" fontSize="9" fontWeight="600">
                {Math.round(sampled[hoverSi])}m
              </text>
            </>
          );
        })()}
      </svg>
    </div>
  );
}
