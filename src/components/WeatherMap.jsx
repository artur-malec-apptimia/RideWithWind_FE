import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Pane, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import riderIcon from "../assets/RiderIcon.png";

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

export default function WeatherMap({ weatherPoints, gpxPoints, gpxMidPoint, coloredSegments, hoveredPoint }) {
  const startWeather = weatherPoints?.[0];
  const lat = startWeather?.coord.lat ?? 20;
  const lon = startWeather?.coord.lon ?? 0;
  const zoom = startWeather ? 12 : 2;
  const polyline = gpxPoints ? gpxPoints.map((p) => [p.lat, p.lon]) : null;

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
