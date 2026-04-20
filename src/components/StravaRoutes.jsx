import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

export default function StravaRoutes({ onSelectRoute, onClose }) {
  const [routes, setRoutes] = useState(null);
  const [error, setError] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/strava/routes")
      .then(r => r.json())
      .then(setRoutes)
      .catch(() => setError("Failed to load routes"));
  }, []);

  const handleSelect = async (route) => {
    setLoadingId(route.id);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/strava/routes/${route.id}/points`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const points = await res.json();
      if (!Array.isArray(points) || points.length < 2) throw new Error("Route has no GPS data");
      onSelectRoute(points, route.name);
    } catch (e) {
      setError(e.message || "Failed to load route points");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div style={{
        background: "rgba(15,15,25,0.95)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "14px",
        padding: "1.25rem",
        width: "360px",
        maxHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        color: "#fff",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Icon icon="simple-icons:strava" style={{ color: "#fc4c02", fontSize: "1.2rem" }} />
            <span style={{ fontWeight: 700, fontSize: "1rem" }}>Your Strava routes</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: "0.2rem" }}>
            <Icon icon="mingcute:close-line" />
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {!routes && !error && (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
              <span className="spinner" style={{ width: "24px", height: "24px", borderWidth: "3px" }} />
            </div>
          )}
          {error && (
            <div style={{ color: "#f87171", fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>{error}</div>
          )}
          {routes && routes.length === 0 && (
            <div style={{ opacity: 0.5, fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>No saved routes found</div>
          )}
          {routes && routes.map(route => (
            <button
              key={route.id}
              onClick={() => handleSelect(route)}
              disabled={loadingId !== null}
              style={{
                width: "100%", textAlign: "left", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px",
                color: "#fff", cursor: loadingId ? "not-allowed" : "pointer",
                padding: "0.65rem 0.85rem", marginBottom: "0.5rem",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.2rem" }}>{route.name}</div>
                <div style={{ fontSize: "0.75rem", opacity: 0.6, display: "flex", gap: "0.75rem" }}>
                  <span>📍 {(route.distance / 1000).toFixed(1)} km</span>
                  <span>↑ {Math.round(route.elevation_gain)} m</span>
                </div>
              </div>
              {loadingId === route.id
                ? <span className="spinner" style={{ width: "18px", height: "18px", borderWidth: "2px", flexShrink: 0 }} />
                : <Icon icon="mingcute:arrow-right-line" style={{ opacity: 0.4, flexShrink: 0 }} />
              }
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
