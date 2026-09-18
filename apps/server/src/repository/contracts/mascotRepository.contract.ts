import type {
  CalibrateMascotActionInput,
  Channel,
  ChannelMascotConfig,
  CreateMascotStyleInput,
  MascotActionType,
  MascotProfile,
  MascotStyle,
  UpdateMascotSlotInput,
  UpdateMascotStyleInput,
} from "@studio/shared";
import type { TransparentMascotAssetOptions, TransparentMascotAssetResult } from "../mascot/mascotTransparentCache.js";

export interface IMascotRepository {
  listMascots(): Promise<MascotProfile[]>;
  getMascot(mascotId: string): Promise<MascotProfile>;
  saveMascot(mascot: Partial<MascotProfile> & { name: string }): Promise<MascotProfile>;
  deleteMascot(mascotId: string): Promise<void>;
  saveMascotAsset(mascotId: string, filename: string, content: Uint8Array): Promise<string>;
  getMascotAssetFile(mascotId: string, filename: string): Promise<{ absolutePath: string; size: number; modified_at: string }>;
  calibrateMascotAction(mascotId: string, action: MascotActionType, calibration: CalibrateMascotActionInput): Promise<MascotProfile>;
  listMascotAssets(mascotId: string): Promise<string[]>;
  deleteMascotAssetFile(mascotId: string, filename: string): Promise<void>;
  getTransparentMascotAssetFile(mascotId: string, filename: string): Promise<{ absolutePath: string; size: number; modified_at: string }>;
  deleteTransparentMascotAssetFile(mascotId: string, filename: string): Promise<void>;
  getOrCreateTransparentMascotAsset(
    mascotId: string,
    filename: string,
    options?: TransparentMascotAssetOptions,
  ): Promise<TransparentMascotAssetResult>;
  assignMascotToChannel(channelId: string, mascotId: string | null, config?: Partial<ChannelMascotConfig>): Promise<Channel>;
  createMascotStyle(mascotId: string, input: CreateMascotStyleInput): Promise<{ mascot: MascotProfile; style: MascotStyle }>;
  updateMascotStyle(mascotId: string, styleId: string, input: UpdateMascotStyleInput): Promise<MascotProfile>;
  deleteMascotStyle(mascotId: string, styleId: string): Promise<MascotProfile>;
  updateMascotSlot(mascotId: string, input: UpdateMascotSlotInput): Promise<MascotProfile>;
  setActiveMascotStyle(mascotId: string, styleId: string): Promise<MascotProfile>;
}
