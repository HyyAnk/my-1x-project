import { deleteEpisode, listEpisodes, getEpisode, getEpisodeFile, saveEpisodeFile } from "../episodes.js";
import {
  clearSequenceDrafts,
  removeEpisodeRuntimeArtifacts,
  saveSequenceDraft,
  readSequenceDrafts,
  commitSequenceDrafts,
  updateEpisodeStage,
  backupEpisodeFile,
} from "../sequenceDrafts.js";

export const episodeBindings = {
  deleteEpisode,
  listEpisodes,
  getEpisode,
  getEpisodeFile,
  saveEpisodeFile,
  clearSequenceDrafts,
  removeEpisodeRuntimeArtifacts,
  saveSequenceDraft,
  readSequenceDrafts,
  commitSequenceDrafts,
  updateEpisodeStage,
  backupEpisodeFile,
};
