import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07080c",
        }}
      >
        <div style={{ position: "relative", width: 116, height: 47, display: "flex" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 2,
              width: 43,
              height: 43,
              borderRadius: 22,
              background: "#6366f1",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 32,
              top: 17,
              width: 52,
              height: 13,
              background: "#6366f1",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 2,
              width: 43,
              height: 43,
              borderRadius: 22,
              background: "#6366f1",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
