import { Icon } from "@iconify/react";
import cyclistAbove from "../assets/CyclistAbove.png";
import { panelStyle } from "../styles";
import { windAngleBgColor, getWindDirection } from "../utils/weather";

export default function WindCompass({ avgWindDeg, avgWindSpeed, relativeWindAngle, relativeWindLabel, loading }) {
  return (
    <div style={{ ...panelStyle, top: "1rem", right: "1rem", textAlign: "center", minWidth: "180px" }}>
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
          <>
            <g transform={`rotate(${relativeWindAngle}, 60, 60)`}>
              <polygon points="60,20 53,5 67,5" fill={windAngleBgColor(relativeWindAngle, 1)} />
            </g>
            <image href={cyclistAbove} x="24" y="24" width="72" height="72" clipPath="url(#cyclist-above-clip)" />
          </>
        ) : (
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
  );
}
