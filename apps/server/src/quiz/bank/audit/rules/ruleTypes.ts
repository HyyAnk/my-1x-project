export interface TrademarkIpDef {
  namePattern: RegExp;
  category: "GAME_IP" | "DISNEY_CORE" | "LION_CUB" | "MARVEL_SUPERHERO" | "DC_SUPERHERO" | "CINEMA_IP" | "STUDIO_IP";
  forbiddenKeywords: string[];
  safeVisualProxy: string;
}
