import React from "react";
import { getFlagSvgContent } from "./flags/flagSvgContent";

export type CountryFlagProps = {
  code?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
};

export function CountryFlag({ code, size = 14, className = "", style, title }: CountryFlagProps) {
  const normalized = (code || "GLOBAL").trim().toUpperCase();
  const width = Math.round((size * 4) / 3);
  const height = size;

  const flagContent = getFlagSvgContent(normalized);

  return (
    <span
      className={`country-flag-icon ${className}`}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${width}px`,
        height: `${height}px`,
        minWidth: `${width}px`,
        minHeight: `${height}px`,
        borderRadius: "2.5px",
        overflow: "hidden",
        boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.12)",
        verticalAlign: "middle",
        flexShrink: 0,
        ...style,
      }}
    >
      <svg
        viewBox="0 0 640 480"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        {flagContent}
      </svg>
    </span>
  );
}
