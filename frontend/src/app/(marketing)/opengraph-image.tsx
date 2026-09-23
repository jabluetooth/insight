import { ImageResponse } from "next/og";

export const alt = "Insight — why your n8n workflow failed";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Type only, in the site's own palette: no stock imagery, no fabricated UI.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#101314",
          color: "#e9eeed",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontFamily: "monospace" }}>
          insight
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#4fd1c5", marginLeft: 8 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 100, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>
          <div>Your workflow failed.</div>
          <div>Here&apos;s the node, and why.</div>
          <div style={{ color: "#8b9895", marginTop: 8 }}>Or: not sure.</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#8b9895", fontFamily: "monospace" }}>
          n8n root-cause diagnosis · npx insight-n8n
        </div>
      </div>
    ),
    size,
  );
}
