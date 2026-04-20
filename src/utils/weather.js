export function getWeatherIcon(iconCode) {
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

export function getWindDirection(degrees) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

export function formatEta(etaUnix, nowUnix) {
  const diff = etaUnix - nowUnix;
  if (diff <= 60) return "Now";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return h > 0 ? `+${h}h ${m}m` : `+${m}m`;
}

export function windAngleBgColor(angle, opacity = 0.38) {
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

export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
