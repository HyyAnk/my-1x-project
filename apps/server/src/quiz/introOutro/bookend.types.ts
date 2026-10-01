export type BookendPlacement = "intro" | "outro";

export interface PreparedBookendMedia {
  placement: BookendPlacement;
  absolutePath: string;
  videoPath: string;
}
