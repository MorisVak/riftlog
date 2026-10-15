import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The link preview for riftlog.net (social posts, chats). Rendered once at
// build time. ImageResponse takes inline styles, not Tailwind classes, so the
// colors below mirror the design tokens in globals.css — keep them in sync.
const BACKGROUND = "#0d1b2a"; // background
const SURFACE = "#18223a"; // surface
const BORDER = "#3e506e"; // border
const ACCENT = "#8b93d9"; // accent
const INK = "#e4e5f2"; // ink-primary
const INK_SECONDARY = "#868fb0"; // ink-secondary

export const alt =
  "Riftlog, a free, fan-made match companion for Riftbound, beside the app's score board";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const asset = (file: string) => readFile(join(process.cwd(), "assets", file));
  const [bold, medium, board] = await Promise.all([
    asset("fonts/SpaceGrotesk_700Bold.ttf"),
    asset("fonts/SpaceGrotesk_500Medium.ttf"),
    asset("og-board.png"),
  ]);
  const boardSrc = `data:image/png;base64,${board.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 90px",
          background: `radial-gradient(circle at 75% 20%, ${SURFACE} 0%, ${BACKGROUND} 60%)`,
          fontFamily: "Space Grotesk",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 680 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 17,
                background: ACCENT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Feather hexagon, as in the wordmark */}
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                  stroke={BACKGROUND}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: INK }}>Riftlog</div>
          </div>
          <div
            style={{
              marginTop: 44,
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: INK,
            }}
          >
            Your Riftbound match companion.
          </div>
          <div style={{ marginTop: 28, fontSize: 30, fontWeight: 500, color: INK_SECONDARY }}>
            Keep score at the table. Keep every match.
          </div>
          <div style={{ marginTop: 36, fontSize: 22, fontWeight: 500, color: ACCENT }}>
            Free and fan-made · riftlog.net
          </div>
        </div>

        <div
          style={{
            display: "flex",
            padding: 10,
            borderRadius: 40,
            background: SURFACE,
            border: `2px solid ${BORDER}`,
            boxShadow: `0 10px 50px rgba(139, 147, 217, 0.45)`,
            marginTop: 160,
          }}
        >
          <img src={boardSrc} width={270} height={551} style={{ borderRadius: 30 }} alt="" />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Space Grotesk", data: bold, weight: 700, style: "normal" },
        { name: "Space Grotesk", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
