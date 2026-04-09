import { useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapUpdater({ lat, lon, zoom }) {
  const map = useMap();
  map.setView([lat, lon], zoom);
  return null;
}

function formatTime(unix) {
  return new Date(unix * 1000).toLocaleTimeString([], { 
    hour: "2-digit", 
    minute: "2-digit",
    hour12: false 
  });
}

function WeatherMap({ weather }) {
  const lat = weather?.coord.lat ?? 20;
  const lon = weather?.coord.lon ?? 0;
  const zoom = weather ? 13 : 2;
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: -1,
      opacity: 0.3,
      pointerEvents: "none",
    }}>
      <MapContainer
        center={[lat, lon]}
        zoom={zoom}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapUpdater lat={lat} lon={lon} zoom={zoom} />
      </MapContainer>
    </div>
  );
}

function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getWeather = async () => {
    if (!city) return;
    setLoading(true);
    setError(null);

    try {
      const response_actual_weather = await fetch(
        `http://localhost:8000/weather?city=${city}`,
      );
      const response_forecast = await fetch(
        `http://localhost:8000/forecast?city=${city}`,
      );
      if (!response_actual_weather.ok && !response_forecast.ok) {
        throw new Error("City not found");
      }
      const actual_weather_data = await response_actual_weather.json();
      const forecast_data = await response_forecast.json();
      setWeather(actual_weather_data);
      setForecast(forecast_data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  function getDailyForecasts(list) {
    const today = new Date().toISOString().slice(0, 10);
    const byDay = {};
    for (const entry of list) {
      const date = entry.dt_txt.slice(0, 10);
      if (date === today) continue;
      if (!byDay[date]) byDay[date] = [];
      byDay[date].push(entry);
    }
    return Object.entries(byDay)
      .slice(0, 4)
      .map(([date, entries]) => {
        const noon = entries.reduce((prev, curr) => {
          const prevDiff = Math.abs(parseInt(prev.dt_txt.slice(11, 13)) - 12);
          const currDiff = Math.abs(parseInt(curr.dt_txt.slice(11, 13)) - 12);
          return currDiff < prevDiff ? curr : prev;
        });
        const minTemp = Math.min(...entries.map((e) => e.main.temp));
        return { date, minTemp, ...noon };
      });
  }

  function getWindDirection(degrees) {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  return (
    <div>
      <h1>Weather App</h1>

      <input
        type="text"
        placeholder="Enter city..."
        value={city}
        onChange={(e) => setCity(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && getWeather()}
      />
      <button onClick={getWeather}>Search</button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {weather && (
        <div style={{ marginTop: "2rem" }}>
          <h2
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "2.5rem",
              marginBottom: "1rem",
            }}
          >
            {weather.name}
          </h2>
          <p>🌅 {formatTime(weather.sys.sunrise)} &nbsp;|&nbsp; 🌇 {formatTime(weather.sys.sunset)}</p>
          <p style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
            Last updated:{" "}
            <strong>{formatTime(weather.dt)}</strong>
          </p>
          <img
            src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
            alt="weather icon"
          />
          <h2 style={{ marginBottom: "1.5rem" }}>
            {weather.weather[0].description}
          </h2>
          <p>
            Temperature: <strong>{weather.main.temp.toFixed(1)}°C</strong>
          </p>
          <p>
            Wind: <strong>{(weather.wind.speed * 3.6).toFixed(1)} km/h</strong>
          </p>
          <p>
            Wind direction:{" "}
            <strong>
              {getWindDirection(weather.wind.deg)}{" "}
              <span style={{ display: "inline-block", transform: `rotate(${weather.wind.deg + 180}deg)` }}>↑</span>
            </strong>
          </p>
          <p>
            Pressure: <strong>{weather.main.pressure} hPa</strong>
          </p>
          <p>
            Humidity: <strong>{weather.main.humidity}%</strong>
          </p>
        </div>
      )}
      {forecast && (
        <div>
          <h3>4-Day Forecast</h3>
          <div
            style={{ display: "flex", gap: "1rem", justifyContent: "center" }}
          >
            {getDailyForecasts(forecast.list).map(
              ({ date, minTemp, main, weather, wind }) => (
                <div
                  key={date}
                  style={{ textAlign: "center", minWidth: "120px" }}
                >
                  <p>
                    <strong>
                      {new Date(date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </strong>
                  </p>
                  <img
                    src={`https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`}
                    alt={weather[0].description}
                  />
                  <p>{weather[0].description}</p>
                  <p>
                    <strong>
                      {main.temp.toFixed(1)}°C / {minTemp.toFixed(1)}°C
                    </strong>
                  </p>
                  <p>
                    Wind: <strong>{(wind.speed * 3.6).toFixed(1)} km/h</strong>
                  </p>
                  <p>
                    Wind direction:{" "}
                    <strong>
                      {getWindDirection(wind.deg)}{" "}
                      <span style={{ display: "inline-block", transform: `rotate(${wind.deg + 180}deg)` }}>↑</span>
                    </strong>
                  </p>
                  <p>
                    Pressure: <strong>{main.pressure} hPa</strong>
                  </p>
                  <p>
                    Humidity: <strong>{main.humidity}%</strong>
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      )}
      <WeatherMap weather={weather} />
    </div>
  );
}

export default App;
