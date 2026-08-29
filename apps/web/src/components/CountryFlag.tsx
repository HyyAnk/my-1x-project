import React from "react";

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

function getFlagSvgContent(code: string): React.ReactNode {
  switch (code) {
    case "VN":
      return (
        <g>
          <rect width="640" height="480" fill="#da251d" />
          <polygon
            fill="#ff0"
            points="320,104 357.1,218.1 477,218.1 380,288.6 417.1,402.7 320,332.2 222.9,402.7 260,288.6 163,218.1 282.9,218.1"
          />
        </g>
      );

    case "US":
      return (
        <g>
          <rect width="640" height="480" fill="#bd3d44" />
          <path stroke="#fff" strokeWidth="36.9" d="M0,55.4H640M0,129.2H640M0,203H640M0,276.9H640M0,350.8H640M0,424.6H640" />
          <rect width="256" height="258.5" fill="#192f5d" />
          <g fill="#fff">
            {[
              [25, 25],
              [76, 25],
              [128, 25],
              [180, 25],
              [231, 25],
              [51, 51],
              [103, 51],
              [154, 51],
              [206, 51],
              [25, 77],
              [76, 77],
              [128, 77],
              [180, 77],
              [231, 77],
              [51, 103],
              [103, 103],
              [154, 103],
              [206, 103],
              [25, 129],
              [76, 129],
              [128, 129],
              [180, 129],
              [231, 129],
              [51, 155],
              [103, 155],
              [154, 155],
              [206, 155],
              [25, 181],
              [76, 181],
              [128, 181],
              [180, 181],
              [231, 181],
              [51, 207],
              [103, 207],
              [154, 207],
              [206, 207],
              [25, 233],
              [76, 233],
              [128, 233],
              [180, 233],
              [231, 233],
            ].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="6.5" />
            ))}
          </g>
        </g>
      );

    case "GB":
      return (
        <g>
          <rect width="640" height="480" fill="#012169" />
          <path d="M0,0 L640,480 M640,0 L0,480" stroke="#fff" strokeWidth="80" />
          <path d="M0,0 L640,480 M640,0 L0,480" stroke="#c8102e" strokeWidth="26.7" />
          <path d="M320,0 V480 M0,240 H640" stroke="#fff" strokeWidth="133.3" />
          <path d="M320,0 V480 M0,240 H640" stroke="#c8102e" strokeWidth="80" />
        </g>
      );

    case "JP":
      return (
        <g>
          <rect width="640" height="480" fill="#fff" />
          <circle cx="320" cy="240" r="144" fill="#bc002d" />
        </g>
      );

    case "KR":
      return (
        <g>
          <rect width="640" height="480" fill="#fff" />
          <g transform="translate(320,240) rotate(-56.31)">
            <path d="M-120,0 A120,120 0 0,1 120,0 A60,60 0 0,1 0,0 A60,60 0 0,0 -120,0" fill="#cd2e3a" />
            <path d="M120,0 A120,120 0 0,1 -120,0 A60,60 0 0,1 0,0 A60,60 0 0,0 120,0" fill="#0047a0" />
          </g>
          <g fill="#000" stroke="#000" strokeWidth="10">
            <rect x="110" y="80" width="60" height="10" transform="rotate(-33.69 140 85)" />
            <rect x="100" y="100" width="60" height="10" transform="rotate(-33.69 140 85)" />
            <rect x="90" y="120" width="60" height="10" transform="rotate(-33.69 140 85)" />
            <rect x="470" y="80" width="60" height="10" transform="rotate(33.69 500 85)" />
            <rect x="480" y="100" width="60" height="10" transform="rotate(33.69 500 85)" />
            <rect x="490" y="120" width="60" height="10" transform="rotate(33.69 500 85)" />
          </g>
        </g>
      );

    case "DE":
      return (
        <g>
          <rect width="640" height="160" fill="#000" />
          <rect y="160" width="640" height="160" fill="#dd0000" />
          <rect y="320" width="640" height="160" fill="#ffce00" />
        </g>
      );

    case "FR":
      return (
        <g>
          <rect width="213.3" height="480" fill="#002395" />
          <rect x="213.3" width="213.3" height="480" fill="#fff" />
          <rect x="426.6" width="213.4" height="480" fill="#ed2939" />
        </g>
      );

    case "ES":
      return (
        <g>
          <rect width="640" height="120" fill="#aa151b" />
          <rect y="120" width="640" height="240" fill="#f1bf00" />
          <rect y="360" width="640" height="120" fill="#aa151b" />
          <circle cx="200" cy="240" r="40" fill="#aa151b" opacity="0.85" />
        </g>
      );

    case "BR":
      return (
        <g>
          <rect width="640" height="480" fill="#009739" />
          <polygon points="320,60 580,240 320,420 60,240" fill="#fedf00" />
          <circle cx="320" cy="240" r="100" fill="#012169" />
          <path d="M220,240 A100,100 0 0,1 420,240" stroke="#fff" strokeWidth="12" fill="none" />
        </g>
      );

    case "CA":
      return (
        <g>
          <rect width="160" height="480" fill="#d80621" />
          <rect x="160" width="320" height="480" fill="#fff" />
          <rect x="480" width="160" height="480" fill="#d80621" />
          <polygon
            fill="#d80621"
            points="320,100 336,180 380,160 360,220 420,240 360,270 370,330 328,300 328,370 312,370 312,300 270,330 280,270 220,240 280,220 260,160 304,180"
          />
        </g>
      );

    case "AU":
      return (
        <g>
          <rect width="640" height="480" fill="#00008b" />
          <rect width="320" height="240" fill="#012169" />
          <path d="M0,0 L320,240 M320,0 L0,240" stroke="#fff" strokeWidth="40" />
          <path d="M0,0 L320,240 M320,0 L0,240" stroke="#c8102e" strokeWidth="13.3" />
          <path d="M160,0 V240 M0,120 H320" stroke="#fff" strokeWidth="66.6" />
          <path d="M160,0 V240 M0,120 H320" stroke="#c8102e" strokeWidth="40" />
          <circle cx="160" cy="360" r="36" fill="#fff" />
          <circle cx="480" cy="100" r="14" fill="#fff" />
          <circle cx="560" cy="180" r="14" fill="#fff" />
          <circle cx="480" cy="380" r="14" fill="#fff" />
          <circle cx="420" cy="220" r="14" fill="#fff" />
          <circle cx="510" cy="260" r="9" fill="#fff" />
        </g>
      );

    case "IN":
      return (
        <g>
          <rect width="640" height="160" fill="#ff9933" />
          <rect y="160" width="640" height="160" fill="#fff" />
          <rect y="320" width="640" height="160" fill="#138808" />
          <circle cx="320" cy="240" r="50" fill="none" stroke="#000080" strokeWidth="8" />
          <circle cx="320" cy="240" r="10" fill="#000080" />
        </g>
      );

    case "ID":
      return (
        <g>
          <rect width="640" height="240" fill="#e70000" />
          <rect y="240" width="640" height="240" fill="#fff" />
        </g>
      );

    case "MX":
      return (
        <g>
          <rect width="213.3" height="480" fill="#006847" />
          <rect x="213.3" width="213.3" height="480" fill="#fff" />
          <rect x="426.6" width="213.4" height="480" fill="#ce1126" />
          <circle cx="320" cy="240" r="36" fill="#8b5a2b" opacity="0.75" />
        </g>
      );

    case "PH":
      return (
        <g>
          <rect width="640" height="240" fill="#0038a8" />
          <rect y="240" width="640" height="240" fill="#ce1126" />
          <polygon points="0,0 280,240 0,480" fill="#fff" />
          <circle cx="95" cy="240" r="32" fill="#fcd116" />
        </g>
      );

    case "TH":
      return (
        <g>
          <rect width="640" height="80" fill="#a51931" />
          <rect y="80" width="640" height="80" fill="#f4f5f8" />
          <rect y="160" width="640" height="160" fill="#2d2a4a" />
          <rect y="320" width="640" height="80" fill="#f4f5f8" />
          <rect y="400" width="640" height="80" fill="#a51931" />
        </g>
      );

    case "IT":
      return (
        <g>
          <rect width="213.3" height="480" fill="#009246" />
          <rect x="213.3" width="213.3" height="480" fill="#fff" />
          <rect x="426.6" width="213.4" height="480" fill="#ce2b37" />
        </g>
      );

    case "TW":
      return (
        <g>
          <rect width="640" height="480" fill="#fe0000" />
          <rect width="320" height="240" fill="#000095" />
          <circle cx="160" cy="120" r="60" fill="#fff" />
          <circle cx="160" cy="120" r="45" fill="#000095" />
          <circle cx="160" cy="120" r="30" fill="#fff" />
        </g>
      );

    case "SG":
      return (
        <g>
          <rect width="640" height="240" fill="#ee2536" />
          <rect y="240" width="640" height="240" fill="#fff" />
          <path d="M120,70 A55,55 0 0,0 120,170 A70,70 0 0,1 120,70" fill="#fff" />
          <circle cx="150" cy="120" r="8" fill="#fff" />
          <circle cx="170" cy="100" r="8" fill="#fff" />
          <circle cx="170" cy="140" r="8" fill="#fff" />
          <circle cx="190" cy="110" r="8" fill="#fff" />
          <circle cx="190" cy="130" r="8" fill="#fff" />
        </g>
      );

    case "MY":
      return (
        <g>
          <rect width="640" height="480" fill="#cc0000" />
          <path stroke="#fff" strokeWidth="34.3" d="M0,51.4H640M0,120H640M0,188.6H640M0,257.1H640M0,325.7H640M0,394.3H640M0,462.9H640" />
          <rect width="320" height="274.3" fill="#000066" />
          <path d="M130,70 A70,70 0 0,0 130,210 A85,85 0 0,1 130,70" fill="#ffcc00" />
          <circle cx="190" cy="140" r="36" fill="#ffcc00" />
        </g>
      );

    case "NZ":
      return (
        <g>
          <rect width="640" height="480" fill="#00247d" />
          <rect width="320" height="240" fill="#012169" />
          <path d="M0,0 L320,240 M320,0 L0,240" stroke="#fff" strokeWidth="40" />
          <path d="M0,0 L320,240 M320,0 L0,240" stroke="#c8102e" strokeWidth="13.3" />
          <path d="M160,0 V240 M0,120 H320" stroke="#fff" strokeWidth="66.6" />
          <path d="M160,0 V240 M0,120 H320" stroke="#c8102e" strokeWidth="40" />
          <g transform="translate(480, 110)">
            <polygon points="0,-20 6,-6 20,-6 9,3 13,18 0,9 -13,18 -9,3 -20,-6 -6,-6" fill="#fff" />
            <polygon points="0,-14 4,-4 14,-4 6,2 9,13 0,6 -9,13 -6,2 -14,-4 -4,-4" fill="#cc142b" />
          </g>
          <g transform="translate(560, 200)">
            <polygon points="0,-18 5,-5 18,-5 8,3 12,16 0,8 -12,16 -8,3 -18,-5 -5,-5" fill="#fff" />
            <polygon points="0,-12 3,-3 12,-3 5,2 8,11 0,6 -8,11 -5,2 -12,-3 -3,-3" fill="#cc142b" />
          </g>
          <g transform="translate(480, 350)">
            <polygon points="0,-22 7,-7 22,-7 10,4 14,20 0,10 -14,20 -10,4 -22,-7 -7,-7" fill="#fff" />
            <polygon points="0,-15 5,-5 15,-5 7,3 10,14 0,7 -10,14 -7,3 -15,-5 -5,-5" fill="#cc142b" />
          </g>
          <g transform="translate(420, 230)">
            <polygon points="0,-16 5,-5 16,-5 7,2 10,14 0,7 -10,14 -7,2 -16,-5 -5,-5" fill="#fff" />
            <polygon points="0,-11 3,-3 11,-3 5,2 7,10 0,5 -7,10 -5,2 -11,-3 -3,-3" fill="#cc142b" />
          </g>
        </g>
      );

    case "CH":
      return (
        <g>
          <rect width="640" height="480" fill="#d52b1e" />
          <rect x="270" y="100" width="100" height="280" fill="#fff" rx="4" />
          <rect x="180" y="190" width="280" height="100" fill="#fff" rx="4" />
        </g>
      );

    case "NO":
      return (
        <g>
          <rect width="640" height="480" fill="#ba0c2f" />
          <path d="M210,0 V480 M0,240 H640" stroke="#fff" strokeWidth="120" />
          <path d="M210,0 V480 M0,240 H640" stroke="#00205b" strokeWidth="60" />
        </g>
      );

    case "IE":
      return (
        <g>
          <rect width="213.3" height="480" fill="#169b62" />
          <rect x="213.3" width="213.3" height="480" fill="#fff" />
          <rect x="426.6" width="213.4" height="480" fill="#ff883e" />
        </g>
      );

    case "NL":
      return (
        <g>
          <rect width="640" height="160" fill="#ae1c28" />
          <rect y="160" width="640" height="160" fill="#ffffff" />
          <rect y="320" width="640" height="160" fill="#21468b" />
        </g>
      );

    case "DK":
      return (
        <g>
          <rect width="640" height="480" fill="#c60c30" />
          <path d="M210,0 V480 M0,240 H640" stroke="#fff" strokeWidth="70" />
        </g>
      );

    case "SE":
      return (
        <g>
          <rect width="640" height="480" fill="#006aa7" />
          <path d="M220,0 V480 M0,240 H640" stroke="#fecc00" strokeWidth="85" />
        </g>
      );

    case "AT":
      return (
        <g>
          <rect width="640" height="160" fill="#ed2939" />
          <rect y="160" width="640" height="160" fill="#ffffff" />
          <rect y="320" width="640" height="160" fill="#ed2939" />
        </g>
      );

    case "FI":
      return (
        <g>
          <rect width="640" height="480" fill="#ffffff" />
          <path d="M210,0 V480 M0,240 H640" stroke="#003580" strokeWidth="95" />
        </g>
      );

    case "BE":
      return (
        <g>
          <rect width="213.3" height="480" fill="#000000" />
          <rect x="213.3" width="213.3" height="480" fill="#fdd116" />
          <rect x="426.6" width="213.4" height="480" fill="#ed2939" />
        </g>
      );

    case "AE":
      return (
        <g>
          <rect width="160" height="480" fill="#ff0000" />
          <rect x="160" width="480" height="160" fill="#00732f" />
          <rect x="160" y="160" width="480" height="160" fill="#ffffff" />
          <rect x="160" y="320" width="480" height="160" fill="#000000" />
        </g>
      );

    case "GLOBAL":
    default:
      return (
        <g>
          <rect width="640" height="480" fill="#0e7490" />
          <circle cx="320" cy="240" r="180" fill="#0284c7" stroke="#38bdf8" strokeWidth="16" />
          <ellipse cx="320" cy="240" rx="90" ry="180" fill="none" stroke="#e0f2fe" strokeWidth="14" opacity="0.85" />
          <line x1="140" y1="240" x2="500" y2="240" stroke="#e0f2fe" strokeWidth="14" opacity="0.85" />
          <line x1="180" y1="150" x2="460" y2="150" stroke="#e0f2fe" strokeWidth="12" opacity="0.65" />
          <line x1="180" y1="330" x2="460" y2="330" stroke="#e0f2fe" strokeWidth="12" opacity="0.65" />
        </g>
      );
  }
}
