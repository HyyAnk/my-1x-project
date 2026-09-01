export type DnaCreationMode = "ai" | "example" | "upload";

export interface CreateChannelFormData {
  name: string;
  description: string;
  target_audience: string;
  language: string;
  country: string;
  market: string;
  dna_mode: DnaCreationMode;
  dna_content: string;
}

export interface AudiencePreset {
  id: string;
  labelVi: string;
  labelEn: string;
  value: string;
  icon: string;
}

export interface MarketPreset {
  id: string;
  labelVi: string;
  labelEn: string;
  value: string;
}
