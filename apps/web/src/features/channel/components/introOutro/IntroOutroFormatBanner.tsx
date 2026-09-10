import React from "react";

export const IntroOutroFormatBanner: React.FC = () => {
  return (
    <div className="intro-outro-format-banner">
      <span className="intro-outro-format-badge">
        <span>1080p FHD</span> 1920x1080
      </span>
      <span className="intro-outro-format-badge">
        <span>MP4</span> H.264 Codec
      </span>
      <span className="intro-outro-format-badge">
        <span>16:9</span> Widescreen Aspect
      </span>
    </div>
  );
};
