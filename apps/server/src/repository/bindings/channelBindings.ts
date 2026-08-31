import {
  listChannels,
  getChannel,
  getChannelBySlug,
  createChannel,
  updateChannel,
  readChannelBySlug,
  safeEpisodeCount,
} from "../channels.js";
import { deleteChannel, getChannelDna, saveChannelDna, resetChannelDna } from "../episodes.js";

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
