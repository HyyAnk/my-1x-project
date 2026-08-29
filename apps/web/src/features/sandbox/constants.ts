export interface SandboxPalette {
  id: string;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
}

export const PALETTES: SandboxPalette[] = [
  { id: "lime", label: "Lime Mint", primary: "#99D93E", secondary: "#31B87A", accent: "#FF6C78" },
  { id: "aqua", label: "Aqua Blue", primary: "#21C8CF", secondary: "#1973CF", accent: "#FF7A63" },
  { id: "sunny", label: "Sunny Gold", primary: "#FFD23F", secondary: "#FF9D31", accent: "#E94F6D" },
  { id: "purple", label: "Purple Galaxy", primary: "#9A66E6", secondary: "#594DDC", accent: "#FFAA42" },
  { id: "pink", label: "Candy Pink", primary: "#FF82AF", secondary: "#E94F8A", accent: "#FFD44D" },
  { id: "orange", label: "Sunset Orange", primary: "#FF964F", secondary: "#EF5A62", accent: "#3BC7C9" },
  { id: "red", label: "Ruby Burst", primary: "#F15B68", secondary: "#C93D78", accent: "#FFD047" },
  { id: "blue", label: "Ocean Deep", primary: "#438CE8", secondary: "#2A55C8", accent: "#FFCE45" },
];
