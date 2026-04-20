import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Pane, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { Icon } from "@iconify/react";
import cyclistBg from "./assets/CyclistBackground.jpg";
import riderIcon from "./assets/RiderIcon.png";
import cyclistAbove from "./assets/CyclistAbove.png";

function MapUpdater({ lat, lon, zoom, gpxPoints }) {
  const map = useMap();
  useEffect(() => {
    if (gpxPoints && gpxPoints.length > 1) {
      map.fitBounds(gpxPoints.map((p) => [p.lat, p.lon]), { padding: [80, 80] });
    } else {
      map.setView([lat, lon], zoom);
    }
  }, [lat, lon, zoom, gpxPoints]);
  return null;
}

function WeatherMap({ weatherPoints, gpxPoints, gpxMidPoint, coloredSegments, hoveredPoint }) {
  const startWeather = weatherPoints?.[0];
  const lat = startWeather?.coord.lat ?? 20;
  const lon = startWeather?.coord.lon ?? 0;
  const zoom = startWeather ? 12 : 2;
  const polyline = gpxPoints ? gpxPoints.map((p) => [p.lat, p.lon]) : null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
      }}
    >
      <MapContainer
        center={[lat, lon]}
        zoom={zoom}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" />
        <ZoomControl position="bottomright" />
        <MapUpdater lat={lat} lon={lon} zoom={zoom} gpxPoints={gpxPoints} />
        {polyline && (
          <>
            {coloredSegments
              ? coloredSegments.map((seg, i) => (
                  <Polyline key={i} positions={seg.positions} pathOptions={{ color: seg.color, weight: 4 }} />
                ))
              : <Polyline positions={polyline} pathOptions={{ color: "#555566", weight: 4 }} />
            }
            <Pane name="route-points" style={{ zIndex: 450 }}>
              <CircleMarker
                center={polyline[0]}
                radius={7}
                pathOptions={{ color: "#fff", weight: 2, fillColor: "#22c55e", fillOpacity: 1 }}
              />
              {gpxMidPoint && (
                <CircleMarker
                  center={[gpxMidPoint.lat, gpxMidPoint.lon]}
                  radius={7}
                  pathOptions={{ color: "#fff", weight: 2, fillColor: "#eab308", fillOpacity: 1 }}
                />
              )}
              <Marker
                position={polyline[polyline.length - 1]}
                icon={L.divIcon({
                  className: "",
                  html: '<span style="font-size:1rem;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">🏁</span>',
                  iconAnchor: [12, 24],
                })}
              />
            </Pane>
          </>
        )}
        {hoveredPoint && (
          <Marker
            center={[hoveredPoint.lat, hoveredPoint.lon]}
            position={[hoveredPoint.lat, hoveredPoint.lon]}
            icon={L.divIcon({
              className: "",
              html: `<div style="width:30px;height:30px;border-radius:50%;background:#60a5fa;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4)"><img src="${riderIcon}" style="width:28px;height:28px;object-fit:contain" /></div>`,
              iconAnchor: [20, 20],
            })}
          />
        )}
      </MapContainer>
    </div>
  );
}

function getWeatherIcon(iconCode) {
  const icons = {
    // Clear
    "01d": "meteocons:clear-day-fill",
    "01n": "meteocons:clear-night-fill",
    // Few clouds
    "02d": "meteocons:partly-cloudy-day-fill",
    "02n": "meteocons:partly-cloudy-night-fill",
    // Scattered clouds
    "03d": "meteocons:cloudy-fill",
    "03n": "meteocons:cloudy-fill",
    // Broken clouds
    "04d": "meteocons:overcast-day-fill",
    "04n": "meteocons:overcast-night-fill",
    // Shower rain
    "09d": "meteocons:overcast-drizzle-fill",
    "09n": "meteocons:overcast-drizzle-fill",
    // Rain
    "10d": "meteocons:overcast-rain-fill",
    "10n": "meteocons:overcast-rain-fill",
    // Thunderstorm
    "11d": "meteocons:thunderstorms-day-fill",
    "11n": "meteocons:thunderstorms-night-fill",
    // Snow
    "13d": "meteocons:partly-cloudy-day-snow-fill",
    "13n": "meteocons:partly-cloudy-night-snow-fill",
    // Mist/fog
    "50d": "meteocons:mist-fill",
    "50n": "meteocons:mist-fill",
  };

  return icons[iconCode] || "meteocons:not-available-fill";
}

function ElevationChart({ points, coloredSegments, onHover }) {
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
      // clamp to nearest segment rather than falling back to blue
      if (segRanges.length === 0) return "#60a5fa";
      if (origIdx < segRanges[0].start) return segRanges[0].color;
      return segRanges[segRanges.length - 1].color;
    };

    const perPoint = sampledIndices.map(origIdx => getColor(origIdx));

    // Group consecutive same-color sampled points
    colorGroups = [];
    let i = 0;
    while (i < sampled.length) {
      const color = perPoint[i];
      const startSi = i;
      while (i < sampled.length && perPoint[i] === color) i++;
      const endSi = Math.min(i, sampled.length - 1); // overlap by 1 for continuity
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

async function parseGPX(text) {
    const res = await fetch("http://localhost:8000/parse-gpx", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: text,
    });
    return res.json(); // [{lat, lon}, ...]
  }

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function App() {
  const [weatherPoints, setWeatherPoints] = useState(null); // [start, mid, end]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gpxPoints, setGpxPoints] = useState(null);
  const [gpxFileName, setGpxFileName] = useState("");
  const [avgSpeed, setAvgSpeed] = useState(30);
  const [speedInput, setSpeedInput] = useState("30");
  const [gpxMidPoint, setGpxMidPoint] = useState(null);
  const [startDate, setStartDate] = useState(todayStr);
  const [startTime, setStartTime] = useState(nowTimeStr);
  const [routeAnalysis, setRouteAnalysis] = useState(null);
  const [coloredSegments, setColoredSegments] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const getStartUnix = (date = startDate, time = startTime) =>
    Math.floor(new Date(`${date}T${time}`).getTime() / 1000);

  const fetchWeatherForRoute = async (points, speedKmh = avgSpeed, startUnix) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/route-weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points, speed_kmh: speedKmh, start_unix: startUnix }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const { mid_point, weather_points } = await res.json();
      setGpxMidPoint(mid_point);
      setWeatherPoints(weather_points);

      const windDegrees = weather_points.map((w) => w.wind.deg);
      const body = JSON.stringify({ points, wind_degrees: windDegrees });
      const headers = { "Content-Type": "application/json" };
      const [analysis, segments] = await Promise.all([
        fetch("http://localhost:8000/analyze-wind", { method: "POST", headers, body }).then((r) => r.json()),
        fetch("http://localhost:8000/colored-segments", { method: "POST", headers, body }).then((r) => r.json()),
      ]);
      setRouteAnalysis(analysis);
      setColoredSegments(segments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  function formatEta(etaUnix, nowUnix) {
    const diff = etaUnix - nowUnix;
    if (diff <= 60) return "Now";
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return h > 0 ? `+${h}h ${m}m` : `+${m}m`;
  }

  function getWindDirection(degrees) {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  const handleGpxUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setGpxFileName(file.name);
    setGpxPoints(null);
    setWeatherPoints(null);
    setGpxMidPoint(null);
    setRouteAnalysis(null);
    setColoredSegments(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const points = await parseGPX(ev.target.result);
      setGpxPoints(points.length > 1 ? points : null);
    };
    reader.readAsText(file);
  };

  const handleDateTimeChange = (newDate, newTime) => {
    setStartDate(newDate);
    setStartTime(newTime);
  };

  const avgTemp = weatherPoints
    ? weatherPoints.reduce((s, w) => s + w.main.temp, 0) / weatherPoints.length
    : null;
  const avgWindSpeed = weatherPoints
    ? weatherPoints.reduce((s, w) => s + w.wind.speed, 0) / weatherPoints.length
    : null;
  // Circular mean for wind direction (avoids 350°+10° = 180° bug)
  const avgWindDeg = weatherPoints
    ? (() => {
        const sinSum = weatherPoints.reduce((s, w) => s + Math.sin(w.wind.deg * Math.PI / 180), 0);
        const cosSum = weatherPoints.reduce((s, w) => s + Math.cos(w.wind.deg * Math.PI / 180), 0);
        return ((Math.atan2(sinSum, cosSum) * 180 / Math.PI) + 360) % 360;
      })()
    : null;

  const panelStyle = {
    position: "fixed",
    zIndex: 10,
    background: "rgba(15, 15, 25, 0.75)",
    backdropFilter: "blur(8px)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "1rem 1.2rem",
    color: "#fff",
    pointerEvents: "auto",
  };

  const nowUnixDisplay = weatherPoints ? weatherPoints[0]._eta : Math.floor(Date.now() / 1000);

  function windAngleBgColor(angle, opacity = 0.38) {
    const a = ((angle % 360) + 360) % 360;
    const stops = [
      { deg: 0,   r: 240, g: 60,  b: 60  }, // red   – headwind
      { deg: 90,  r: 240, g: 170, b: 20  }, // yellow – right crosswind
      { deg: 180, r: 40,  g: 200, b: 90  }, // green  – tailwind
      { deg: 270, r: 240, g: 170, b: 20  }, // yellow – left crosswind
      { deg: 360, r: 240, g: 60,  b: 60  }, // red again
    ];
    for (let i = 0; i < stops.length - 1; i++) {
      if (a >= stops[i].deg && a < stops[i + 1].deg) {
        const t = (a - stops[i].deg) / (stops[i + 1].deg - stops[i].deg);
        const r = Math.round(stops[i].r + t * (stops[i + 1].r - stops[i].r));
        const g = Math.round(stops[i].g + t * (stops[i + 1].g - stops[i].g));
        const b = Math.round(stops[i].b + t * (stops[i + 1].b - stops[i].b));
        return `rgba(${r},${g},${b},${opacity})`;
      }
    }
    return `rgba(224,85,85,${opacity})`;
  }

  // Relative wind angle for hovered elevation point
  let relativeWindAngle = null;
  let relativeWindLabel = null;
  if (hoveredPoint && gpxPoints && weatherPoints) {
    const idx = gpxPoints.findIndex(p => p.lat === hoveredPoint.lat && p.lon === hoveredPoint.lon);
    if (idx >= 0) {
      const prev = gpxPoints[Math.max(0, idx - 1)];
      const next = gpxPoints[Math.min(gpxPoints.length - 1, idx + 1)];
      const riderBearing = (Math.atan2(next.lon - prev.lon, next.lat - prev.lat) * 180 / Math.PI + 360) % 360;
      const t = idx / (gpxPoints.length - 1);
      const wpIdx = t < 0.33 ? 0 : t < 0.66 ? 1 : 2;
      const windDeg = weatherPoints[wpIdx].wind.deg;
      relativeWindAngle = (windDeg - riderBearing + 360) % 360;
      const a = relativeWindAngle;
      relativeWindLabel = a < 45 || a >= 315 ? "Headwind"
                        : a < 135 ? "Right crosswind"
                        : a < 225 ? "Tailwind"
                        : "Left crosswind";
    }
  }
  const checkpoints = weatherPoints
    ? [
        { label: "Start",  w: weatherPoints[0] },
        { label: "Mid",    w: weatherPoints[1] },
        { label: "Finish", w: weatherPoints[2] },
      ]
    : [];

  return (
    <div>
      {gpxPoints ? (
        <WeatherMap weatherPoints={weatherPoints} gpxPoints={gpxPoints} gpxMidPoint={gpxMidPoint} coloredSegments={coloredSegments} hoveredPoint={hoveredPoint} />
      ) : (
        <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
          <img src={cyclistBg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
        </div>
      )}

      {/* Top-centre: title + GPX upload */}
      <div
        style={{
          ...panelStyle,
          ...(gpxPoints
            ? { top: "1rem", left: "50%", transform: "translateX(-50%)" }
            : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }),
          textAlign: "center",
          minWidth: "260px",
        }}
      >
        <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.5rem" }}>RideWithWind</h1>
        {/* Date & time pickers */}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "0.75rem", alignItems: "stretch" }}>
          <div style={{ display: "flex", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "8px", overflow: "hidden" }}>
            {[0, 1, 2, 3].map((offset) => {
              const d = new Date();
              d.setDate(d.getDate() + offset);
              const dayStr = d.toISOString().split("T")[0];
              const isSelected = startDate === dayStr;
              const label = offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : d.toLocaleDateString([], { weekday: "short", day: "numeric" });
              return (
                <button
                  key={offset}
                  onClick={() => handleDateTimeChange(dayStr, startTime)}
                  style={{
                    padding: "0",
                    minWidth: "5.1rem",
                    border: "none",
                    borderRight: offset < 3 ? "1px solid rgba(255,255,255,0.18)" : "none",
                    background: isSelected ? "rgba(255,255,255,0.18)" : "transparent",
                    color: isSelected ? "#fff" : "rgba(255,255,255,0.5)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    fontWeight: isSelected ? 600 : 400,
                    whiteSpace: "nowrap",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <input
            type="time"
            value={startTime}
            onChange={(e) => handleDateTimeChange(startDate, e.target.value)}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "8px", color: "#fff", fontSize: "0.8rem", padding: "0.3rem 0.5rem", outline: "none", colorScheme: "dark" }}
          />
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", padding: "0.4rem 1rem", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px" }}>
            <Icon icon="mingcute:file-upload-line" />
            {gpxFileName || "Upload .gpx file"}
            <input type="file" accept=".gpx" onChange={handleGpxUpload} style={{ display: "none" }} />
          </label>
          {!weatherPoints ? (
            <button
              disabled={!gpxPoints || loading}
              onClick={() => fetchWeatherForRoute(gpxPoints, avgSpeed, getStartUnix())}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 1rem", borderRadius: "6px", border: "none", cursor: gpxPoints && !loading ? "pointer" : "not-allowed", fontWeight: 600, fontSize: "0.85rem", background: gpxPoints && !loading ? "#3b82f6" : "rgba(255,255,255,0.1)", color: gpxPoints && !loading ? "#fff" : "rgba(255,255,255,0.35)", transition: "background 0.15s" }}
            >
              <Icon icon="mingcute:check-line" />
              Analyze route
            </button>
          ) : (
            <button
              onClick={() => fetchWeatherForRoute(gpxPoints, avgSpeed, getStartUnix())}
              disabled={loading}
              title="Refresh weather"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff", cursor: loading ? "not-allowed" : "pointer", padding: "0.4rem 0.6rem", fontSize: "1rem", lineHeight: 1 }}
            >
              <Icon icon="mingcute:refresh-2-line" />
            </button>
          )}
        </div>
        {loading && <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", opacity: 0.7 }}>Fetching weather and wind data</p>}
        {error && <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#f87171" }}>{error}</p>}
      </div>

      {/* Left column: weather + wind + elevation */}
      {(weatherPoints || (gpxPoints && gpxPoints.some(p => p.ele != null))) && (
        <div style={{ position: "fixed", left: "1rem", top: "1rem", bottom: "1rem", zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "flex-start", pointerEvents: "none", gap: "1rem" }}>

        {/* Weather panel */}
        {weatherPoints && <div style={{ ...panelStyle, position: "relative", pointerEvents: "auto" }}>
          {loading && (
            <div style={{ position: "absolute", inset: 0, borderRadius: "12px", background: "rgba(15,15,25,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
              <span className="spinner" style={{ width: "28px", height: "28px", borderWidth: "3px" }} />
            </div>
          )}
          <div style={{ fontSize: "0.75rem", opacity: 0.5, marginBottom: "0.6rem" }}>
            Conditions on your {routeAnalysis ? routeAnalysis.totalKm.toFixed(1) : "—"} km route
          </div>
          {/* Averages row */}
          <div style={{ display: "flex", gap: "1.2rem", marginBottom: "0.75rem", paddingBottom: "0.65rem", borderBottom: "1px solid rgba(255,255,255,0.1)", fontSize: "0.85rem" }}>
            <div>
              <div style={{ opacity: 0.6, fontSize: "0.75rem" }}>Avg temp</div>
              <strong style={{ fontSize: "1.2rem" }}>{avgTemp.toFixed(1)}°C</strong>
            </div>
            <div>
              <div style={{ opacity: 0.6, fontSize: "0.75rem" }}>Avg wind</div>
              <strong style={{ fontSize: "1.2rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                {(avgWindSpeed * 3.6).toFixed(1)} km/h
                {avgWindSpeed * 3.6 > 20 && (
                  <Icon icon="meteocons:windsock" title="Heavy wind" style={{ fontSize: "1.6rem" }} />
                )}
              </strong>
            </div>
          </div>
          {/* Checkpoint columns */}
          <div style={{ display: "flex", gap: "1rem" }}>
            {checkpoints.map(({ label, w }) => (
              <div key={label} style={{ textAlign: "center", minWidth: "80px" }}>
                <div style={{ fontSize: "0.7rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                <div style={{ fontSize: "0.72rem", color: "#60a5fa", marginBottom: "0.2rem" }}>
                  {label === "Start"
                    ? (startDate === todayStr()
                        ? startTime
                        : `${new Date(`${startDate}T${startTime}`).toLocaleDateString([], { month: "short", day: "numeric" })} · ${startTime}`)
                    : formatEta(w._eta, nowUnixDisplay)}
                </div>
                <Icon icon={getWeatherIcon(w.weather[0].icon)} style={{ fontSize: "2rem" }} />
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{w.name}</div>
                <div style={{ fontSize: "1rem", fontWeight: 600 }}>{w.main.temp.toFixed(1)}°C</div>
                <div style={{ fontSize: "0.78rem", opacity: 0.8, marginTop: "0.2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
                  💨 {(w.wind.speed * 3.6).toFixed(1)} km/h
                  {w.wind.speed * 3.6 > 20 && (
                    <Icon icon="meteocons:windsock" title="Heavy wind" style={{ fontSize: "1.6rem" }} />
                  )}
                </div>
                <div style={{ fontSize: "0.78rem", opacity: 0.8 }}>
                  {getWindDirection(w.wind.deg)}{" "}
                  <span style={{ display: "inline-block", transform: `rotate(${w.wind.deg + 180}deg)` }}>↑</span>
                </div>
                <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{w.weather[0].main}</div>
              </div>
            ))}
          </div>
          {/* Speed input */}
          <div style={{ marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Icon icon="mingcute:bike-line" style={{ opacity: 0.6 }} />
            <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>Avg speed</span>
            <input
              type="number"
              min="1"
              max="100"
              value={speedInput}
              onChange={(e) => setSpeedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && gpxPoints) {
                  const parsed = parseFloat(speedInput);
                  if (!parsed || parsed <= 0) return;
                  setAvgSpeed(parsed);
                  fetchWeatherForRoute(gpxPoints, parsed, getStartUnix());
                }
              }}
              style={{ width: "64px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", outline: "none", color: "#fff", fontSize: "0.9rem", textAlign: "center", padding: "0.15rem 0.2rem" }}
            />
            <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>km/h</span>
            <button
              onClick={() => {
                const parsed = parseFloat(speedInput);
                if (!parsed || parsed <= 0) return;
                setAvgSpeed(parsed);
                fetchWeatherForRoute(gpxPoints, parsed, getStartUnix());
              }}
              disabled={loading}
              title="Refresh with new speed"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", color: "#fff", cursor: loading ? "not-allowed" : "pointer", padding: "0.2rem 0.35rem", fontSize: "0.85rem", lineHeight: 1 }}
            >
              <Icon icon="mingcute:refresh-2-line" />
            </button>
          </div>
        </div>}

        {/* Wind analysis panel */}
        {routeAnalysis && (
          <div style={{ ...panelStyle, position: "relative", pointerEvents: "auto", textAlign: "center" }}>
            {loading && (
              <div style={{ position: "absolute", inset: 0, borderRadius: "12px", background: "rgba(15,15,25,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                <span className="spinner" style={{ width: "28px", height: "28px", borderWidth: "3px" }} />
              </div>
            )}
            <div style={{ fontSize: "0.85rem", marginBottom: "0.6rem", opacity: 0.8 }}>
              {routeAnalysis.totalKm.toFixed(2)} km total
            </div>
            <div style={{ display: "flex", gap: "1.2rem", justifyContent: "center", marginBottom: "0.75rem" }}>
              {[
                { label: "Headwind", value: routeAnalysis.headwind, km: routeAnalysis.headwindKm, color: "#e05555" },
                { label: "Crosswind", value: routeAnalysis.crosswind, km: routeAnalysis.crosswindKm, color: "#e0a020" },
                { label: "Tailwind", value: routeAnalysis.tailwind, km: routeAnalysis.tailwindKm, color: "#3daa5a" },
              ].map(({ label, value, km, color }) => (
                <div key={label}>
                  <strong style={{ color, fontSize: "1.1rem" }}>{value.toFixed(1)}%</strong>
                  <div style={{ fontSize: "0.8rem" }}>{label}</div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>{km.toFixed(2)} km</div>
                </div>
              ))}
            </div>
            <div style={{ height: "10px", borderRadius: "5px", overflow: "hidden", display: "flex" }}>
              <div style={{ flex: routeAnalysis.headwind, background: "#e05555" }} />
              <div style={{ flex: routeAnalysis.crosswind, background: "#e0a020" }} />
              <div style={{ flex: routeAnalysis.tailwind, background: "#3daa5a" }} />
            </div>
          </div>
        )}

        {/* Elevation panel */}
        {gpxPoints && gpxPoints.some(p => p.ele != null) && (
          <div style={{ ...panelStyle, position: "relative", pointerEvents: "auto", marginTop: "auto" }}>
            <div style={{ fontSize: "0.72rem", opacity: 0.5, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Elevation</div>
            <ElevationChart points={gpxPoints} coloredSegments={coloredSegments} onHover={setHoveredPoint} />
          </div>
        )}

        </div>
      )}

      {/* Top-right: wind direction compass */}
      {avgWindDeg !== null && (
        <div style={{ ...panelStyle, top: "1rem", right: "1rem", textAlign: "center", minWidth: "180px", position: "fixed" }}>
          {loading && (
            <div style={{ position: "absolute", inset: 0, borderRadius: "12px", background: "rgba(15,15,25,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
              <span className="spinner" style={{ width: "28px", height: "28px", borderWidth: "3px" }} />
            </div>
          )}
          <div style={{ fontSize: "0.72rem", opacity: 0.6, marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {relativeWindAngle !== null ? "Wind vs rider" : "Avg wind direction"}
          </div>
          <svg width="150" height="150" viewBox="0 0 120 120" style={{ display: "block", margin: "0 auto" }}>
            <defs>
              <clipPath id="cyclist-above-clip">
                <circle cx="60" cy="60" r="36" />
              </clipPath>
            </defs>
            <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.12)" strokeWidth="1"
              fill={relativeWindAngle !== null ? windAngleBgColor(relativeWindAngle) : "rgba(255,255,255,0.04)"}
            />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rad = (deg - 90) * Math.PI / 180;
              return (
                <line key={deg}
                  x1={60 + 49 * Math.cos(rad)} y1={60 + 49 * Math.sin(rad)}
                  x2={60 + 55 * Math.cos(rad)} y2={60 + 55 * Math.sin(rad)}
                  stroke="rgba(255,255,255,0.25)" strokeWidth="1"
                />
              );
            })}
            {relativeWindAngle !== null ? (
              /* Relative mode: inward arrow + cyclist icon */
              <>
                <g transform={`rotate(${relativeWindAngle}, 60, 60)`}>
                  <polygon points="60,20 53,5 67,5" fill={windAngleBgColor(relativeWindAngle, 1)} />
                </g>
                <image href={cyclistAbove} x="24" y="24" width="72" height="72" clipPath="url(#cyclist-above-clip)" />
              </>
            ) : (
              /* Absolute mode: N/S/E/W + outward arrow */
              <>
                {[["N",60,13],["S",60,111],["E",109,64],["W",11,64]].map(([lbl,x,y]) => (
                  <text key={lbl} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                    fill={lbl === "N" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)"}
                    fontSize="11" fontFamily="sans-serif" fontWeight={lbl === "N" ? "700" : "400"}>
                    {lbl}
                  </text>
                ))}
                <g transform={`rotate(${avgWindDeg + 180}, 60, 60)`}>
                  <polygon points="60,14 54,30 60,26 66,30" fill="#60a5fa" />
                  <line x1="60" y1="26" x2="60" y2="76" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
                </g>
                <circle cx="60" cy="60" r="3.5" fill="#60a5fa" />
              </>
            )}
          </svg>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", marginTop: "0.3rem" }}>
            {relativeWindAngle !== null ? relativeWindLabel : getWindDirection(avgWindDeg)}
          </div>
          <div style={{ fontSize: "0.8rem", opacity: 0.65, marginTop: "0.1rem" }}>
            {(avgWindSpeed * 3.6).toFixed(1)} km/h avg
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
