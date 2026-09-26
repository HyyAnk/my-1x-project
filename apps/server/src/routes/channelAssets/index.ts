import type { FastifyPluginCallback } from "fastify";
import type { ChannelAssetsRouteDeps } from "./channelAssetTypes.js";
import { registerChannelAssetReadRoutes } from "./channelAssetReadRoutes.js";
import { registerChannelAssetMutationRoutes } from "./channelAssetMutationRoutes.js";
import { registerChannelAssetExportRoutes } from "./channelAssetExportRoutes.js";
import { registerBrandIdentityExportRoutes } from "./brandIdentityExportRoutes.js";

export type { ChannelAssetsRouteDeps } from "./channelAssetTypes.js";
export { registerChannelAssetReadRoutes } from "./channelAssetReadRoutes.js";
export { registerChannelAssetMutationRoutes } from "./channelAssetMutationRoutes.js";
export { registerChannelAssetExportRoutes } from "./channelAssetExportRoutes.js";
export * from "./channelAssetHelpers.js";

export function registerChannelAssetsRoutes(deps: ChannelAssetsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    registerChannelAssetReadRoutes(server, deps);
    registerChannelAssetMutationRoutes(server, deps);
    registerChannelAssetExportRoutes(server, deps);
    registerBrandIdentityExportRoutes(server, deps);
    done();
  };
}
