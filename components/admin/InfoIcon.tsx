// components/admin/InfoIcon.tsx

// Lightweight tooltip trigger for the office dashboard.
// Uses CSS-only hover via the `group` utility — no useState, no external deps.
// SVG preferred over unicode ⓘ glyph for consistent cross-platform rendering.
// Scoped to admin use only — do not import in storefront components.

export function InfoIcon({ tip }: { tip: string }) {
  return (
    <div className="group relative ml-2 inline-flex  items-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "#9b9b96" }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>

      {/* Tooltip bubble */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          width: "200px",
          background: "#1e1e1c",
          border: "0.5px solid rgba(255,255,255,0.1)",
          color: "#e8e8e4",
          fontSize: "0.72rem",
          lineHeight: "1.45",
          padding: "8px 10px",
          borderRadius: "6px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          zIndex: 50,
          pointerEvents: "none",
          textAlign: "center",
          textTransform: "none",
          letterSpacing: "normal",
          fontWeight: "normal",
        }}
        className="invisible opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100"
      >
        {tip}
        {/* Downward caret */}
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "5px solid #1e1e1c",
          }}
        />
      </div>
    </div>
  )
}
