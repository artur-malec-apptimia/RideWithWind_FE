import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import "./App.css";
import cyclistBg from "./assets/CyclistBackground.jpg";
import WeatherMap from "./components/WeatherMap";
import ElevationChart from "./components/ElevationChart";
import WindCompass from "./components/WindCompass";
import WeatherPanel from "./components/WeatherPanel";
import StravaRoutes from "./components/StravaRoutes";
import { parseGPX, fetchRouteWeather, fetchWindAnalysis, fetchColoredSegments, fetchStravaStatus, disconnectStrava } from "./api";
import { todayStr, nowTimeStr, buildTempColoredSegments } from "./utils/weather";
import { panelStyle } from "./styles";

function App() {
  const [weatherPoints, setWeatherPoints] = useState(null);
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
  const [stravaConnected, setStravaConnected] = useState(false);
  const [showStravaRoutes, setShowStravaRoutes] = useState(false);
  const [vizMode, setVizMode] = useState("wind"); // "wind" | "temp"

  useEffect(() => {
    fetchStravaStatus().then(({ connected }) => setStravaConnected(connected));
  }, []);

  const getStartUnix = (date = startDate, time = startTime) =>
    Math.floor(new Date(`${date}T${time}`).getTime() / 1000);

  const handleFetchWeather = async (points, speedKmh = avgSpeed, startUnix) => {
    setLoading(true);
    setError(null);
    try {
      const { mid_point, weather_points } = await fetchRouteWeather(points, speedKmh, startUnix);
      setGpxMidPoint(mid_point);
      setWeatherPoints(weather_points);

      const windDegrees = weather_points.map((w) => w.wind.deg);
      const [analysis, segments] = await Promise.all([
        fetchWindAnalysis(points, windDegrees),
        fetchColoredSegments(points, windDegrees),
      ]);
      setRouteAnalysis(analysis);
      setColoredSegments(segments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStravaRouteSelect = (points, routeName) => {
    setShowStravaRoutes(false); // only called after successful points fetch
    setGpxFileName(routeName);
    setGpxPoints(points.length > 1 ? points : null);
    setWeatherPoints(null);
    setGpxMidPoint(null);
    setRouteAnalysis(null);
    setColoredSegments(null);
  };

  const handleDisconnectStrava = async () => {
    await disconnectStrava();
    setStravaConnected(false);
  };

  const handleGpxUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setGpxFileName(file.name);
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
  const avgWindGust = weatherPoints && weatherPoints.some(w => w.wind.gust)
    ? weatherPoints.reduce((s, w) => s + (w.wind.gust ?? w.wind.speed), 0) / weatherPoints.length
    : null;
  // Circular mean for wind direction (avoids 350°+10° = 180° bug)
  const avgWindDeg = weatherPoints
    ? (() => {
        const sinSum = weatherPoints.reduce((s, w) => s + Math.sin(w.wind.deg * Math.PI / 180), 0);
        const cosSum = weatherPoints.reduce((s, w) => s + Math.cos(w.wind.deg * Math.PI / 180), 0);
        return ((Math.atan2(sinSum, cosSum) * 180 / Math.PI) + 360) % 360;
      })()
    : null;

  const nowUnixDisplay = weatherPoints ? weatherPoints[0]._eta : Math.floor(Date.now() / 1000);

  // Relative wind angle for hovered elevation point
  let relativeWindAngle = null;
  let relativeWindLabel = null;
  let hoveredWindSpeed = null;
  if (hoveredPoint && gpxPoints && weatherPoints) {
    const idx = gpxPoints.findIndex(p => p.lat === hoveredPoint.lat && p.lon === hoveredPoint.lon);
    if (idx >= 0) {
      const prev = gpxPoints[Math.max(0, idx - 1)];
      const next = gpxPoints[Math.min(gpxPoints.length - 1, idx + 1)];
      const riderBearing = (Math.atan2(next.lon - prev.lon, next.lat - prev.lat) * 180 / Math.PI + 360) % 360;
      const t = idx / (gpxPoints.length - 1);
      const wpIdx = Math.round(t * (weatherPoints.length - 1));
      const windDeg = weatherPoints[wpIdx].wind.deg;
      relativeWindAngle = (windDeg - riderBearing + 360) % 360;
      const a = relativeWindAngle;
      relativeWindLabel = a < 45 || a >= 315 ? "Headwind"
                        : a < 135 ? "Right crosswind"
                        : a < 225 ? "Tailwind"
                        : "Left crosswind";
      const scaled = t * (weatherPoints.length - 1);
      const wi = Math.min(Math.floor(scaled), weatherPoints.length - 2);
      const f = scaled - wi;
      hoveredWindSpeed = weatherPoints[wi].wind.speed * (1 - f) + weatherPoints[wi + 1].wind.speed * f;
    }
  }

  const checkpoints = weatherPoints
    ? [
        { label: "Start",  w: weatherPoints[0] },
        { label: "Mid",    w: weatherPoints[Math.floor((weatherPoints.length - 1) / 2)] },
        { label: "Finish", w: weatherPoints[weatherPoints.length - 1] },
      ]
    : [];

  const tempColoredSegments =
    weatherPoints && gpxPoints ? buildTempColoredSegments(gpxPoints, weatherPoints) : null;
  const activeSegments = vizMode === "temp" ? tempColoredSegments : coloredSegments;

  return (
    <div>
      {gpxPoints ? (
        <WeatherMap
          weatherPoints={weatherPoints}
          gpxPoints={gpxPoints}
          gpxMidPoint={gpxMidPoint}
          coloredSegments={activeSegments}
          hoveredPoint={hoveredPoint}
          vizMode={vizMode}
        />
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
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", padding: "0 1rem", height: "34px", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px", fontSize: "0.85rem" }}>
            <Icon icon="mingcute:file-upload-line" />
            {gpxFileName || "Upload .gpx file"}
            <input type="file" accept=".gpx" onChange={handleGpxUpload} style={{ display: "none" }} />
          </label>
          {stravaConnected ? (
            <button
              onClick={() => setShowStravaRoutes(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0 1rem", height: "34px", border: "1px solid rgba(252,76,2,0.6)", borderRadius: "6px", background: "rgba(252,76,2,0.12)", color: "#fc4c02", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}
            >
              <Icon icon="simple-icons:strava" />
              Strava routes
            </button>
          ) : (
            <a
              href="http://localhost:8000/strava/auth"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0 1rem", height: "34px", border: "1px solid rgba(252,76,2,0.6)", borderRadius: "6px", background: "rgba(252,76,2,0.12)", color: "#fc4c02", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}
            >
              <Icon icon="simple-icons:strava" />
              Connect Strava
            </a>
          )}
          {!weatherPoints ? (
            <button
              disabled={!gpxPoints || loading}
              onClick={() => handleFetchWeather(gpxPoints, avgSpeed, getStartUnix())}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0 1rem", height: "34px", borderRadius: "6px", border: "none", cursor: gpxPoints && !loading ? "pointer" : "not-allowed", fontWeight: 600, fontSize: "0.85rem", background: gpxPoints && !loading ? "#3b82f6" : "rgba(255,255,255,0.1)", color: gpxPoints && !loading ? "#fff" : "rgba(255,255,255,0.35)", transition: "background 0.15s" }}
            >
              <Icon icon="mingcute:check-line" />
              Analyze route
            </button>
          ) : (
            <button
              onClick={() => handleFetchWeather(gpxPoints, avgSpeed, getStartUnix())}
              disabled={loading}
              title="Refresh weather"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff", cursor: loading ? "not-allowed" : "pointer", padding: "0.4rem 0.6rem", fontSize: "1rem", lineHeight: 1 }}
            >
              <Icon icon="mingcute:refresh-2-line" />
            </button>
          )}
        </div>
        {stravaConnected && (
          <div style={{ marginTop: "0.5rem" }}>
            <button onClick={handleDisconnectStrava} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline" }}>
              Disconnect Strava
            </button>
          </div>
        )}
        {loading && <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", opacity: 0.7 }}>Fetching weather and wind data</p>}
        {error && <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#f87171" }}>{error}</p>}
      </div>

      {/* Left column: weather + wind analysis */}
      {weatherPoints && (
        <div style={{ position: "fixed", left: "1rem", top: "1rem", bottom: "1rem", zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "flex-start", pointerEvents: "none", gap: "1rem" }}>

          <WeatherPanel
            loading={loading}
            routeAnalysis={routeAnalysis}
            avgTemp={avgTemp}
            avgWindSpeed={avgWindSpeed}
            avgWindGust={avgWindGust}
            checkpoints={checkpoints}
            startDate={startDate}
            startTime={startTime}
            nowUnixDisplay={nowUnixDisplay}
            speedInput={speedInput}
            setSpeedInput={setSpeedInput}
            avgSpeed={avgSpeed}
            setAvgSpeed={setAvgSpeed}
            gpxPoints={gpxPoints}
            fetchWeatherForRoute={handleFetchWeather}
            getStartUnix={getStartUnix}
          />

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

        </div>
      )}

      {/* Bottom-centre: elevation panel */}
      {gpxPoints && gpxPoints.some(p => p.ele != null) && (
        <div style={{ ...panelStyle, position: "fixed", bottom: "1rem", left: "50%", transform: "translateX(-50%)", zIndex: 10, width: "min(820px, calc(100vw - 2rem))", pointerEvents: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.72rem", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Elevation</div>
            {weatherPoints && (
              <div style={{ display: "flex", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "6px", overflow: "hidden" }}>
                {[
                  { key: "wind", label: "Wind" },
                  { key: "temp", label: "Temp" },
                ].map(({ key, label }, idx) => (
                  <button
                    key={key}
                    onClick={() => setVizMode(key)}
                    style={{
                      padding: "0.15rem 0.55rem",
                      border: "none",
                      borderRight: idx === 0 ? "1px solid rgba(255,255,255,0.18)" : "none",
                      background: vizMode === key ? "rgba(255,255,255,0.18)" : "transparent",
                      color: vizMode === key ? "#fff" : "rgba(255,255,255,0.45)",
                      fontSize: "0.72rem",
                      fontWeight: vizMode === key ? 600 : 400,
                      cursor: "pointer",
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <ElevationChart points={gpxPoints} coloredSegments={activeSegments} onHover={setHoveredPoint} />
        </div>
      )}

      {/* Top-right: wind compass */}
      {avgWindDeg !== null && (
        <WindCompass
          avgWindDeg={avgWindDeg}
          avgWindSpeed={avgWindSpeed}
          relativeWindAngle={relativeWindAngle}
          relativeWindLabel={relativeWindLabel}
          hoveredWindSpeed={hoveredWindSpeed}
          loading={loading}
        />
      )}

      {showStravaRoutes && (
        <StravaRoutes
          onSelectRoute={handleStravaRouteSelect}
          onClose={() => setShowStravaRoutes(false)}
        />
      )}
    </div>
  );
}

export default App;
