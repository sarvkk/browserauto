import { ImageResponse } from "next/og"

export const alt = "Browserauto — Visual browser automation"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Shared link-preview card for Messenger, Slack, iMessage, X, etc.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f4f0e8",
          padding: "64px 72px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#1a1814",
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#1a1814",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f4f0e8",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            B
          </div>
          Browserauto
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              color: "#1a1814",
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              maxWidth: 900,
            }}
          >
            Visual workflows that drive real browsers.
          </div>
          <div
            style={{
              color: "rgba(26, 24, 20, 0.55)",
              fontSize: 28,
              lineHeight: 1.35,
              maxWidth: 820,
            }}
          >
            AI act, extract, and branch on a canvas — with live view and session
            replay.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            color: "rgba(26, 24, 20, 0.4)",
            fontSize: 22,
            fontWeight: 500,
          }}
        >
          browserauto.sarvajit.com.np
        </div>
      </div>
    ),
    { ...size }
  )
}
