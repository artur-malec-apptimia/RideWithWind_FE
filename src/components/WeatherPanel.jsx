import { Icon } from "@iconify/react";
import { panelStyle } from "../styles";
import { getWeatherIcon, getWindDirection, formatEta, todayStr } from "../utils/weather";

export default function WeatherPanel({
  loading,
  routeAnalysis,
  avgTemp,
  avgWindSpeed,
  checkpoints,
  startDate,
  startTime,
  nowUnixDisplay,
  speedInput,
  setSpeedInput,
  avgSpeed,
  setAvgSpeed,
  gpxPoints,
  fetchWeatherForRoute,
  getStartUnix,
}) {
  return (
    <div style={{ ...panelStyle, position: "relative", pointerEvents: "auto" }}>
      {loading && (
        <div style={{ position: "absolute", inset: 0, borderRadius: "12px", background: "rgba(15,15,25,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          <span className="spinner" style={{ width: "28px", height: "28px", borderWidth: "3px" }} />
        </div>
      )}
      <div style={{ fontSize: "0.75rem", opacity: 0.5, marginBottom: "0.6rem" }}>
        Conditions on your {routeAnalysis ? routeAnalysis.totalKm.toFixed(1) : "—"} km route
      </div>
      {/* Averages row */}
      <div style={{ display: "flex", gap: "1.2rem", justifyContent: "center", marginBottom: "0.75rem", paddingBottom: "0.65rem", borderBottom: "1px solid rgba(255,255,255,0.1)", fontSize: "0.85rem" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ opacity: 0.6, fontSize: "0.75rem" }}>Avg temp</div>
          <strong style={{ fontSize: "1.2rem" }}>{avgTemp.toFixed(1)}°C</strong>
        </div>
        <div style={{ textAlign: "center" }}>
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
    </div>
  );
}
