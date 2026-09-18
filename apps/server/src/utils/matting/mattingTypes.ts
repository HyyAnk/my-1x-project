export type MattingOptions = {
  /**
   * Color distance tolerance for background detection (0-255). Default is 28.
   */
  tolerance?: number;
  /**
   * Edge feathering width in distance space for smooth anti-aliasing. Default is 16.
   */
  feather?: number;
  /**
   * Target background color [R, G, B] to remove. If omitted, automatically sampled from borders.
   */
  targetColor?: [number, number, number];
  /**
   * Minimum alpha threshold below which a pixel is considered fully transparent. Default is 5.
   */
  alphaCutoff?: number;
  /**
   * Whether to prefer AI segmentation model (RMBG) over procedural flood fill. Default is true.
   */
  preferAi?: boolean;
  /**
   * Whether to detect and remove enclosed background cavities (e.g. gaps under wings, between limbs). Default is true.
   */
  removeEnclosedCavities?: boolean;
  /**
   * Color distance tolerance for seeding interior enclosed cavities. Default is 8.
   */
  cavityTolerance?: number;
  /**
   * Minimum connected pixel cluster size to qualify as an enclosed cavity. Default is 16.
   */
  minCavitySize?: number;
};

export type EnclosedCavityOptions = {
  data: Uint8Array;
  width: number;
  height: number;
  visited: Uint8Array;
  targetBg: [number, number, number];
  isBgNeutral: boolean;
  isGreenKey: boolean;
  cavityTolerance: number;
  feather: number;
  alphaCutoff: number;
  minCavitySize: number;
};
