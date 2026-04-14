import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { Icon } from "@iconify/react";

function MapUpdater({ lat, lon, zoom, gpxPoints }) {
  const map = useMap();
  useEffect(() => {
    if (gpxPoints && gpxPoints.length > 1) {
      map.fitBounds(gpxPoints.map((p) => [p.lat, p.lon]), { padding: [40, 40] });
    } else {
      map.setView([lat, lon], zoom);
    }
  }, [lat, lon, zoom, gpxPoints]);
  return null;
}

function formatTime(unix) {
  return new Date(unix * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTimeInZone(unix, timezoneOffsetSeconds) {
  const utcMs = unix * 1000 + timezoneOffsetSeconds * 1000;
  const d = new Date(utcMs);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function WeatherMap({ weatherPoints, gpxPoints, gpxMidPoint, coloredSegments }) {
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
          </>
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

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function parseGPX(text) {
  const xml = new DOMParser().parseFromString(text, "text/xml");
  return Array.from(xml.querySelectorAll("trkpt")).map((pt) => ({
    lat: parseFloat(pt.getAttribute("lat")),
    lon: parseFloat(pt.getAttribute("lon")),
  }));
}

const WIND_COLORS = { headwind: "#e05555", crosswind: "#e0a020", tailwind: "#3daa5a" };

function segmentWindColor(windDeg, bearing) {
  let diff = Math.abs(windDeg - bearing);
  if (diff > 180) diff = 360 - diff;
  if (diff < 60) return WIND_COLORS.headwind;
  if (diff > 120) return WIND_COLORS.tailwind;
  return WIND_COLORS.crosswind;
}

function buildColoredSegments(points, windDegrees) {
  const third = Math.floor((points.length - 1) / 3);
  const result = [];
  let currentColor = null;
  let currentPositions = [];

  for (let i = 0; i < points.length - 1; i++) {
    const windIdx = i < third ? 0 : i < third * 2 ? 1 : 2;
    const bearing = calculateBearing(points[i].lat, points[i].lon, points[i + 1].lat, points[i + 1].lon);
    const color = segmentWindColor(windDegrees[windIdx], bearing);

    if (color !== currentColor) {
      if (currentPositions.length > 0) {
        currentPositions.push([points[i].lat, points[i].lon]);
        result.push({ positions: currentPositions, color: currentColor });
      }
      currentColor = color;
      currentPositions = [[points[i].lat, points[i].lon]];
    }
    currentPositions.push([points[i + 1].lat, points[i + 1].lon]);
  }
  if (currentPositions.length > 0) result.push({ positions: currentPositions, color: currentColor });
  return result;
}

// windDegrees: [startDeg, midDeg, endDeg] — each applied to its third of the route
function analyzeRouteWind(points, windDegrees) {
  let headwind = 0, tailwind = 0, crosswind = 0, total = 0;
  const third = Math.floor((points.length - 1) / 3);
  const segments = [
    { from: 0,       to: third,              wind: windDegrees[0] },
    { from: third,   to: third * 2,          wind: windDegrees[1] },
    { from: third * 2, to: points.length - 1, wind: windDegrees[2] },
  ];
  for (const { from, to, wind } of segments) {
    for (let i = from; i < to; i++) {
      const dist = haversineDistance(
        points[i].lat, points[i].lon,
        points[i + 1].lat, points[i + 1].lon
      );
      const bearing = calculateBearing(
        points[i].lat, points[i].lon,
        points[i + 1].lat, points[i + 1].lon
      );
      let diff = Math.abs(wind - bearing);
      if (diff > 180) diff = 360 - diff;
      total += dist;
      if (diff < 60) headwind += dist;
      else if (diff > 120) tailwind += dist;
      else crosswind += dist;
    }
  }
  if (total === 0) return null;
  return {
    headwind: (headwind / total) * 100,
    tailwind: (tailwind / total) * 100,
    crosswind: (crosswind / total) * 100,
    headwindKm: headwind / 1000,
    tailwindKm: tailwind / 1000,
    crosswindKm: crosswind / 1000,
    totalKm: total / 1000,
  };
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


  const fetchWeatherForRoute = async (points, speedKmh = avgSpeed) => {
    setLoading(true);
    setError(null);

    // Cumulative distances to find the true midpoint by distance
    const cumDist = [0];
    for (let i = 0; i < points.length - 1; i++)
      cumDist.push(cumDist[i] + haversineDistance(points[i].lat, points[i].lon, points[i + 1].lat, points[i + 1].lon));
    const totalDist = cumDist[cumDist.length - 1];
    const midIdx = cumDist.reduce((best, d, i) =>
      Math.abs(d - totalDist / 2) < Math.abs(cumDist[best] - totalDist / 2) ? i : best, 0);
    setGpxMidPoint(points[midIdx]);

    const AVG_SPEED_MS = speedKmh / 3.6;
    const nowUnix = Math.floor(Date.now() / 1000);
    const midEta  = nowUnix + cumDist[midIdx] / AVG_SPEED_MS;
    const endEta  = nowUnix + totalDist       / AVG_SPEED_MS;

    const checkpoints = [
      { point: points[0],                  eta: nowUnix },
      { point: points[midIdx],             eta: midEta  },
      { point: points[points.length - 1],  eta: endEta  },
    ];

    try {
      // Current weather at all 3 coords (gives us city names + start conditions)
      const currents = await Promise.all(
        checkpoints.map(({ point }) =>
          fetch(`http://localhost:8000/weather/coords?lat=${point.lat}&lon=${point.lon}`).then(r => r.json())
        )
      );

      // Forecast for mid & end (start uses current weather as-is)
      const [midForecast, endForecast] = await Promise.all([
        fetch(`http://localhost:8000/forecast?city=${encodeURIComponent(currents[1].name)}`).then(r => r.json()),
        fetch(`http://localhost:8000/forecast?city=${encodeURIComponent(currents[2].name)}`).then(r => r.json()),
      ]);

      const pickClosest = (forecastData, eta) => {
        const list = forecastData.list ?? [];
        return list.reduce((best, entry) =>
          Math.abs(entry.dt - eta) < Math.abs(best.dt - eta) ? entry : best, list[0]);
      };

      const mergeWithForecast = (current, entry) => ({
        ...current,
        main: entry.main,
        wind: entry.wind,
        weather: entry.weather,
        dt: entry.dt,
      });

      setWeatherPoints([
        { ...currents[0], _eta: nowUnix },
        { ...mergeWithForecast(currents[1], pickClosest(midForecast, midEta)), _eta: midEta },
        { ...mergeWithForecast(currents[2], pickClosest(endForecast, endEta)), _eta: endEta },
      ]);
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
    setWeatherPoints(null);
    setGpxMidPoint(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const points = parseGPX(ev.target.result);
      if (points.length > 1) {
        setGpxPoints(points);
        fetchWeatherForRoute(points, avgSpeed);
      } else {
        setGpxPoints(null);
      }
    };
    reader.readAsText(file);
  };

  const windDegrees = weatherPoints ? weatherPoints.map((w) => w.wind.deg) : null;

  const routeAnalysis =
    gpxPoints && windDegrees ? analyzeRouteWind(gpxPoints, windDegrees) : null;

  const coloredSegments =
    gpxPoints && windDegrees ? buildColoredSegments(gpxPoints, windDegrees) : null;

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

  const nowUnixDisplay = Math.floor(Date.now() / 1000);
  const checkpoints = weatherPoints
    ? [
        { label: "Start",  w: weatherPoints[0] },
        { label: "Mid",    w: weatherPoints[1] },
        { label: "Finish", w: weatherPoints[2] },
      ]
    : [];

  return (
    <div>
      <WeatherMap weatherPoints={weatherPoints} gpxPoints={gpxPoints} gpxMidPoint={gpxMidPoint} coloredSegments={coloredSegments} />

      {/* Top-centre: title + GPX upload */}
      <div
        style={{
          ...panelStyle,
          top: "1rem",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          minWidth: "260px",
        }}
      >
        <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.5rem" }}>RideWithWind</h1>
        <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", padding: "0.4rem 1rem", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px" }}>
          <Icon icon="mingcute:file-upload-line" />
          {gpxFileName || "Upload .gpx file"}
          <input type="file" accept=".gpx" onChange={handleGpxUpload} style={{ display: "none" }} />
        </label>
        {loading && <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", opacity: 0.7 }}>Fetching weather and wind data</p>}
        {error && <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#f87171" }}>{error}</p>}
      </div>

      {/* Top-left: 3-checkpoint weather panel */}
      {weatherPoints && (
        <div style={{ ...panelStyle, top: "1rem", left: "1rem", position: "fixed" }}>
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
              <strong style={{ fontSize: "1.2rem" }}>{(avgWindSpeed * 3.6).toFixed(1)} km/h</strong>
            </div>
          </div>
          {/* Checkpoint columns */}
          <div style={{ display: "flex", gap: "1rem" }}>
            {checkpoints.map(({ label, w }) => (
              <div key={label} style={{ textAlign: "center", minWidth: "80px" }}>
                <div style={{ fontSize: "0.7rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                <div style={{ fontSize: "0.72rem", color: "#60a5fa", marginBottom: "0.2rem" }}>
                  {formatEta(w._eta, nowUnixDisplay)}
                </div>
                <Icon icon={getWeatherIcon(w.weather[0].icon)} style={{ fontSize: "2rem" }} />
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{w.name}</div>
                <div style={{ fontSize: "1rem", fontWeight: 600 }}>{w.main.temp.toFixed(1)}°C</div>
                <div style={{ fontSize: "0.78rem", opacity: 0.8, marginTop: "0.2rem" }}>
                  💨 {(w.wind.speed * 3.6).toFixed(1)} km/h
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
                  fetchWeatherForRoute(gpxPoints, parsed);
                }
              }}
              style={{ width: "64px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", outline: "none", color: "#fff", fontSize: "0.9rem", textAlign: "center", padding: "0.15rem 0.2rem" }}
            />
            <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>km/h</span>
          </div>
        </div>
      )}

      {/* Top-right: avg wind direction compass */}
      {avgWindDeg !== null && (
        <div style={{ ...panelStyle, top: "1rem", right: "1rem", textAlign: "center", minWidth: "150px", position: "fixed" }}>
          {loading && (
            <div style={{ position: "absolute", inset: 0, borderRadius: "12px", background: "rgba(15,15,25,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
              <span className="spinner" style={{ width: "28px", height: "28px", borderWidth: "3px" }} />
            </div>
          )}
          <div style={{ fontSize: "0.72rem", opacity: 0.6, marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Avg wind direction
          </div>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ display: "block", margin: "0 auto" }}>
            <circle cx="60" cy="60" r="56" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rad = (deg - 90) * Math.PI / 180;
              return (
                <line
                  key={deg}
                  x1={60 + 49 * Math.cos(rad)} y1={60 + 49 * Math.sin(rad)}
                  x2={60 + 55 * Math.cos(rad)} y2={60 + 55 * Math.sin(rad)}
                  stroke="rgba(255,255,255,0.25)" strokeWidth="1"
                />
              );
            })}
            {[["N",60,13],["S",60,111],["E",109,64],["W",11,64]].map(([lbl,x,y]) => (
              <text key={lbl} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                fill={lbl === "N" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)"}
                fontSize="11" fontFamily="sans-serif" fontWeight={lbl === "N" ? "700" : "400"}>
                {lbl}
              </text>
            ))}
            {/* Arrow rotated so it points where wind blows TO */}
            <g transform={`rotate(${avgWindDeg + 180}, 60, 60)`}>
              <polygon points="60,14 54,30 60,26 66,30" fill="#60a5fa" />
              <line x1="60" y1="26" x2="60" y2="76" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
              <polygon points="60,86 54,72 66,72" fill="rgba(96,165,250,0.3)" />
            </g>
            <circle cx="60" cy="60" r="3.5" fill="#60a5fa" />
          </svg>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", marginTop: "0.3rem" }}>
            {getWindDirection(avgWindDeg)}
          </div>
          <div style={{ fontSize: "0.8rem", opacity: 0.65, marginTop: "0.1rem" }}>
            {(avgWindSpeed * 3.6).toFixed(1)} km/h avg
          </div>
        </div>
      )}

      {/* Bottom-centre: wind analysis */}
      {routeAnalysis && (
        <div
          style={{
            ...panelStyle,
            position: "fixed",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            minWidth: "340px",
            textAlign: "center",
          }}
        >
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
    </div>
  );
}

export default App;
