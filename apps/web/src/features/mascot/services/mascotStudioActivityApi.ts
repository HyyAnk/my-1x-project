import type { MascotStudioActivityStatusResponse } from "@studio/shared";
import { request } from "../../../api/client";

export const mascotStudioActivityApi = {
  getStatus: (mascotId: string): Promise<MascotStudioActivityStatusResponse> =>
    request<MascotStudioActivityStatusResponse>(`/api/mascots/${encodeURIComponent(mascotId)}/activity`),
};
