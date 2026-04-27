import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { MapContainer, TileLayer, Polyline, Tooltip, CircleMarker, Marker, Pane, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import riderIcon from "../assets/RiderIcon.png";

function makePrecipIcon(iconName) {
  const src = `https://api.iconify.design/${iconName.replace(":", "/")}.svg`;
  return L.divIcon({
    className: "",
    html: `<img src="${src}" width="64" height="64" style="display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))" />`,
    iconSize: [64, 64],
    iconAnchor: [32, 80],
  });
}

const PRECIP_ICONS = {
  rainHeavy: makePrecipIcon("meteocons:raindrops-fill"),
  rainLight:  makePrecipIcon("meteocons:raindrop-fill"),
  snow:       makePrecipIcon("meteocons:snowflake-fill"),
};

const BLEND = 12; // points on each side of a boundary used for color blending

function parseColor(color) {
  if (color.startsWith("#")) {
    return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
  }
  const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  return m ? [+m[1], +m[2], +m[3]] : [128, 128, 128];
}

function lerpColor(colorA, colorB, t) {
  const [r1, g1, b1] = parseColor(colorA);
  const [r2, g2, b2] = parseColor(colorB);
  const r = Math.round(r1 + t * (r2 - r1));
  const g = Math.round(g1 + t * (g2 - g1));
  const bl = Math.round(b1 + t * (b2 - b1));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function etaStr(t, weatherPoints) {
  const n = weatherPoints.length;
  const scaled = t * (n - 1);
  const i = Math.min(Math.floor(scaled), n - 2);
  const f = scaled - i;
  const eta = weatherPoints[i]._eta * (1 - f) + weatherPoints[i + 1]._eta * f;
  return new Date(eta * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function interpolate(t, weatherPoints, getValue) {
  const n = weatherPoints.length;
  const scaled = t * (n - 1);
  const i = Math.min(Math.floor(scaled), n - 2);
  const f = scaled - i;
  return getValue(weatherPoints[i]) * (1 - f) + getValue(weatherPoints[i + 1]) * f;
}

const LAPSE_RATE = 0.0065;

function interpolateTemp(t, weatherPoints, pointEle) {
  const n = weatherPoints.length;
  const scaled = t * (n - 1);
  const i = Math.min(Math.floor(scaled), n - 2);
  const f = scaled - i;
  const baseTemp = weatherPoints[i].main.temp * (1 - f) + weatherPoints[i + 1].main.temp * f;
  const w0Ele = weatherPoints[i]._ele;
  const w1Ele = weatherPoints[i + 1]._ele;
  if (pointEle != null && w0Ele != null && w1Ele != null) {
    const refEle = w0Ele * (1 - f) + w1Ele * f;
    return baseTemp - LAPSE_RATE * (pointEle - refEle);
  }
  return baseTemp;
}


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

function nearestGpxPoint(gpxPoints, latlng) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < gpxPoints.length; i++) {
    const d = (gpxPoints[i].lat - latlng.lat) ** 2 + (gpxPoints[i].lon - latlng.lng) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return gpxPoints[best];
}

export default function WeatherMap({ weatherPoints, gpxPoints, gpxMidPoint, coloredSegments, hoveredPoint, vizMode, onHoverPoint }) {

  const startWeather = weatherPoints?.[0];
  const lat = startWeather?.coord.lat ?? 20;
  const lon = startWeather?.coord.lon ?? 0;
  const zoom = startWeather ? 12 : 2;
  const polyline = gpxPoints ? gpxPoints.map((p) => [p.lat, p.lon]) : null;

  const rainPolylines = (() => {
    if (!weatherPoints || !gpxPoints || gpxPoints.length < 2) return [];
    const RAINY = ["Rain", "Drizzle", "Thunderstorm"];
    const n = weatherPoints.length;
    const m = gpxPoints.length;
    const result = [];
    for (let wi = 0; wi < n - 1; wi++) {
      const w0 = weatherPoints[wi], w1 = weatherPoints[wi + 1];
      const isRainy = RAINY.includes(w0.weather?.[0]?.main) || RAINY.includes(w1.weather?.[0]?.main);
      if (!isRainy) continue;
      const mm = ((w0.rain?.["1h"] ?? w0.rain?.["3h"] ?? 0) + (w1.rain?.["1h"] ?? w1.rain?.["3h"] ?? 0)) / 2;
      const startIdx = Math.round((wi / (n - 1)) * (m - 1));
      const endIdx = Math.round(((wi + 1) / (n - 1)) * (m - 1));
      result.push({ positions: gpxPoints.slice(startIdx, endIdx + 1).map(p => [p.lat, p.lon]), heavy: mm >= 1 });
    }
    return result;
  })();

  const snowPolylines = (() => {
    if (!weatherPoints || !gpxPoints || gpxPoints.length < 2) return [];
    const n = weatherPoints.length;
    const m = gpxPoints.length;
    const result = [];
    for (let wi = 0; wi < n - 1; wi++) {
      const w0 = weatherPoints[wi], w1 = weatherPoints[wi + 1];
      const isSnowy = w0.weather?.[0]?.main === "Snow" || w1.weather?.[0]?.main === "Snow";
      if (!isSnowy) continue;
      const startIdx = Math.round((wi / (n - 1)) * (m - 1));
      const endIdx = Math.round(((wi + 1) / (n - 1)) * (m - 1));
      const mm = ((w0.snow?.["1h"] ?? w0.snow?.["3h"] ?? 0) + (w1.snow?.["1h"] ?? w1.snow?.["3h"] ?? 0)) / 2;
      result.push({ positions: gpxPoints.slice(startIdx, endIdx + 1).map(p => [p.lat, p.lon]), heavy: mm >= 1 });
    }
    return result;
  })();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
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
            <Pane name="precip-underlay" style={{ zIndex: 390 }}>
              {rainPolylines.map((seg, i) => (
                <Polyline key={`rain-${i}`} positions={seg.positions} pathOptions={{ color: "#60a5fa", weight: 16, opacity: 0.5, interactive: false }} />
              ))}
              {snowPolylines.map((seg, i) => (
                <Polyline key={`snow-${i}`} positions={seg.positions} pathOptions={{ color: "#60a5fa", weight: 16, opacity: 0.5, interactive: false }} />
              ))}
            </Pane>
            <Pane name="precip-icons" style={{ zIndex: 580 }}>
              {rainPolylines.filter(s => s.heavy).map((seg, i) => (
                <Marker key={`rain-heavy-icon-${i}`} position={seg.positions[0]} icon={PRECIP_ICONS.rainHeavy} />
              ))}
              {rainPolylines.filter(s => !s.heavy).map((seg, i) => (
                <Marker key={`rain-light-icon-${i}`} position={seg.positions[0]} icon={PRECIP_ICONS.rainLight} />
              ))}
              {snowPolylines.map((seg, i) => (
                <Marker key={`snow-icon-${i}`} position={seg.positions[0]} icon={PRECIP_ICONS.snow} />
              ))}
            </Pane>
            {coloredSegments ? (
              <>
                {/* Solid base segments */}
                {coloredSegments.map((seg, i) => {
                  const t = gpxPoints && seg.startIdx != null
                    ? (seg.startIdx + seg.endIdx) / 2 / (gpxPoints.length - 1)
                    : 0.5;
                  let tooltipText = null;
                  if (weatherPoints && vizMode === "wind") {
                    tooltipText = `💨 ${(interpolate(t, weatherPoints, w => w.wind.speed) * 3.6).toFixed(1)} km/h`;
                  } else if (weatherPoints && vizMode === "temp") {
                    const midIdx = Math.floor((seg.startIdx + (seg.endIdx ?? seg.startIdx)) / 2);
                    const pointEle = gpxPoints?.[midIdx]?.ele ?? null;
                    tooltipText = `🌡️ ${interpolateTemp(t, weatherPoints, pointEle).toFixed(1)}°C`;
                  }
                  const rainMm = weatherPoints ? interpolate(t, weatherPoints, w => w.rain?.["1h"] ?? w.rain?.["3h"] ?? 0) : 0;
                  const snowMm = weatherPoints ? interpolate(t, weatherPoints, w => w.snow?.["1h"] ?? w.snow?.["3h"] ?? 0) : 0;
                  const tooltipContent = tooltipText && (
                    <div>
                      <div>{tooltipText}</div>
                      {rainMm > 0 && <div>🌧️ {rainMm.toFixed(1)} mm</div>}
                      {snowMm > 0 && <div>❄️ {snowMm.toFixed(1)} mm</div>}
                    </div>
                  );
                  return (
                    <Polyline key={i} positions={seg.positions} pathOptions={{ color: seg.color, weight: 4 }}
                      eventHandlers={{
                        mousemove: onHoverPoint ? (e) => onHoverPoint(nearestGpxPoint(gpxPoints, e.latlng)) : undefined,
                        mouseout: onHoverPoint ? () => onHoverPoint(null) : undefined,
                      }}
                    >
                      {tooltipContent && (
                        <Tooltip sticky direction="top" offset={[0, -4]} opacity={1} className="wind-tooltip">
                          {tooltipContent}
                        </Tooltip>
                      )}
                    </Polyline>
                  );
                })}
                {/* Gradient transition zones rendered on top (non-interactive so base segments get mouse events) */}
                {coloredSegments.flatMap((seg, i) => {
                  const next = coloredSegments[i + 1];
                  if (!next || next.color === seg.color) return [];
                  const n = Math.min(BLEND, Math.floor(seg.positions.length / 2), Math.floor(next.positions.length / 2));
                  if (n < 1) return [];
                  const pts = [...seg.positions.slice(-n), ...next.positions.slice(0, n)];
                  return pts.slice(0, -1).map((p, j) => (
                    <Polyline
                      key={`g-${i}-${j}`}
                      positions={[p, pts[j + 1]]}
                      pathOptions={{ color: lerpColor(seg.color, next.color, j / (pts.length - 2)), weight: 4, interactive: false }}
                    />
                  ));
                })}
              </>
            ) : (
              <Polyline positions={polyline} pathOptions={{ color: "#555566", weight: 4 }} />
            )}
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
        {hoveredPoint && (() => {
          let tooltipText = null;
          if (weatherPoints && gpxPoints) {
            const idx = gpxPoints.findIndex(p => p.lat === hoveredPoint.lat && p.lon === hoveredPoint.lon);
            if (idx >= 0) {
              const t = idx / (gpxPoints.length - 1);
              if (vizMode === "wind")
                tooltipText = `💨 ${(interpolate(t, weatherPoints, w => w.wind.speed) * 3.6).toFixed(1)} km/h`;
              else
                tooltipText = `🌡️ ${interpolateTemp(t, weatherPoints, gpxPoints[idx]?.ele ?? null).toFixed(1)}°C`;
              const rainMm = interpolate(t, weatherPoints, w => w.rain?.["1h"] ?? w.rain?.["3h"] ?? 0);
              const snowMm = interpolate(t, weatherPoints, w => w.snow?.["1h"] ?? w.snow?.["3h"] ?? 0);
              tooltipText = { main: tooltipText, rain: rainMm > 0 ? `🌧️ ${rainMm.toFixed(1)} mm` : null, snow: snowMm > 0 ? `❄️ ${snowMm.toFixed(1)} mm` : null };
            }
          }
          const tooltipContent = tooltipText && (
            <div>
              <div>{tooltipText.main}</div>
              {tooltipText.rain && <div>{tooltipText.rain}</div>}
              {tooltipText.snow && <div>{tooltipText.snow}</div>}
            </div>
          );
          return (
            <Marker
              position={[hoveredPoint.lat, hoveredPoint.lon]}
              icon={L.divIcon({
                className: "",
                html: `<div style="width:30px;height:30px;border-radius:50%;background:#60a5fa;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4)"><img src="${riderIcon}" style="width:28px;height:28px;object-fit:contain" /></div>`,
                iconAnchor: [20, 20],
              })}
            >
              {tooltipContent && (
                <Tooltip permanent direction="top" offset={[0, -34]} opacity={1} className="wind-tooltip">
                  {tooltipContent}
                </Tooltip>
              )}
            </Marker>
          );
        })()}
      </MapContainer>
    </div>
  );
}
