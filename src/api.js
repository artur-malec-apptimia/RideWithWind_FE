const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function parseGPX(text) {
  const res = await fetch(`${BASE}/parse-gpx`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: text,
  });
  return res.json();
}

export async function fetchRouteWeather(points, speedKmh, startUnix) {
  const res = await fetch(`${BASE}/route-weather`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points, speed_kmh: speedKmh, start_unix: startUnix, num_points: 5 }),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json(); // { mid_point, weather_points }
}

export async function fetchWindAnalysis(points, windDegrees) {
  const res = await fetch(`${BASE}/analyze-wind`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points, wind_degrees: windDegrees }),
  });
  return res.json();
}

export async function fetchColoredSegments(points, windDegrees) {
  const res = await fetch(`${BASE}/colored-segments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points, wind_degrees: windDegrees }),
  });
  return res.json();
}

// ── Strava ────────────────────────────────────────────────────────────────────

export async function fetchStravaStatus() {
  const res = await fetch(`${BASE}/strava/status`);
  return res.json(); // { connected: bool }
}

export async function disconnectStrava() {
  await fetch(`${BASE}/strava/disconnect`, { method: "POST" });
}
