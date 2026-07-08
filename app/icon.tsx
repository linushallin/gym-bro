import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
        <div style={{ position: "relative", width: 320, height: 130, display: "flex" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 5,
              width: 120,
              height: 120,
              borderRadius: 60,
              background: "#6366f1",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 90,
              top: 47,
              width: 140,
              height: 36,
              background: "#6366f1",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 5,
              width: 120,
              height: 120,
              borderRadius: 60,
              background: "#6366f1",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
