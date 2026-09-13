import type { FastifyPluginCallback } from "fastify";
import type { QuizV2RouteDeps } from "./quizV2Types.js";
import { registerQuizV2ArtifactRoutes } from "./quizV2ArtifactRoutes.js";
import { registerQuizV2PipelineRoutes } from "./quizV2PipelineRoutes.js";
import { registerQuizV2MediaRoutes } from "./quizV2MediaRoutes.js";

export type { QuizV2RouteDeps } from "./quizV2Types.js";
export { registerQuizV2PipelineRoutes } from "./quizV2PipelineRoutes.js";
export {
  registerQuizV2ArtifactRoutes,
  resolveTopicFields,
  mergeUpdatedDescription,
} from "./quizV2ArtifactRoutes.js";
export { registerQuizV2MediaRoutes } from "./quizV2MediaRoutes.js";

/**
 * Registers all Quiz V2 sub-route modules into a Fastify plugin.
 */
export function registerQuizV2Routes(deps: QuizV2RouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    registerQuizV2ArtifactRoutes(server, deps);
    registerQuizV2PipelineRoutes(server, deps);
    registerQuizV2MediaRoutes(server, deps);
    done();
  };
}
