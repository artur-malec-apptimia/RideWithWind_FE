import { useState } from "react";
import { Icon } from "@iconify/react";

export default function BottomSheet({ children, peekContent, bottomOffset = 0 }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      position: "fixed",
      left: 0,
      right: 0,
      bottom: bottomOffset,
      zIndex: 20,
      background: "rgba(15,15,25,0.88)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderRadius: "14px 14px 0 0",
      border: "1px solid rgba(255,255,255,0.12)",
      borderBottom: "none",
      color: "#fff",
      transition: "height 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
      height: expanded ? "65vh" : "64px",
      overflow: "hidden",
    }}>
      {/* Handle + peek row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          height: "64px",
          display: "flex",
          alignItems: "center",
          padding: "0 1.2rem",
          cursor: "pointer",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div style={{
          position: "absolute",
          top: "8px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "36px",
          height: "4px",
          borderRadius: "2px",
          background: "rgba(255,255,255,0.25)",
        }} />
        <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", flex: 1, overflow: "hidden" }}>
          {peekContent}
        </div>
        <Icon
          icon={expanded ? "mingcute:chevron-down-line" : "mingcute:chevron-up-line"}
          style={{ fontSize: "1.2rem", opacity: 0.5, flexShrink: 0, marginLeft: "0.5rem" }}
        />
      </div>

      {/* Scrollable content */}
      <div style={{ height: "calc(100% - 64px)", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}
