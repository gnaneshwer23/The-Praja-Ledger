import { ImageResponse } from "next/og";
import en from "../../../messages/en.json";

export const alt = en.HomePage.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#e7f0ea",
          color: "#102028",
          padding: "80px",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 600 }}>{en.HomePage.title}</div>
        <div style={{ fontSize: 32, marginTop: 28, maxWidth: 900 }}>{en.HomePage.lede}</div>
      </div>
    ),
    { ...size },
  );
}
