import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

export const alt = `${SITE_NAME} — Sistema de Ideación en Gravedad Cero`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const tagline = `${SITE_DESCRIPTION.split(". ")[0]}.`;

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: "#0B0F19",
          backgroundImage:
            "radial-gradient(circle at 18% 20%, rgba(124,92,255,0.40), transparent 45%), radial-gradient(circle at 85% 82%, rgba(56,189,248,0.32), transparent 45%)",
          color: "#F0F4FF",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 32,
            color: "#A9B4D6",
            letterSpacing: 4,
          }}
        >
          NOTHING SENSE
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", fontSize: 104, fontWeight: 700, lineHeight: 1.05 }}>
            GraviNote
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 38,
              color: "#C3CBE8",
              maxWidth: 940,
              lineHeight: 1.3,
            }}
          >
            {tagline}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#7C8BB5" }}>
          gavi-note.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
