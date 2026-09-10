import {
  listChannels,
  getChannel,
  getChannelBySlug,
  createChannel,
  updateChannel,
  readChannelBySlug,
  safeEpisodeCount,
  deleteChannel,
} from "../channels.js";
import { getChannelDna, saveChannelDna, resetChannelDna } from "../episodes.js";

export const channelBindings = {
  listChannels,
  getChannel,
  getChannelBySlug,
  createChannel,
  updateChannel,
  readChannelBySlug,
  safeEpisodeCount,
  deleteChannel,
  getChannelDna,
  saveChannelDna,
  resetChannelDna,
};
