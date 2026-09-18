import type { FastifyPluginCallback } from "fastify";
import type { QuizV2RouteDeps } from "./quizV2/index.js";
import { registerQuizV2ArtifactRoutes, registerQuizV2PipelineRoutes, registerQuizV2MediaRoutes } from "./quizV2/index.js";

export type { QuizV2RouteDeps } from "./quizV2/index.js";
export {
  registerQuizV2ArtifactRoutes,
  registerQuizV2PipelineRoutes,
  registerQuizV2MediaRoutes,
  resolveTopicFields,
  mergeUpdatedDescription,
} from "./quizV2/index.js";

/**
 * Fastify plugin orchestrating all Quiz V2 routes.
 * Registers artifact, pipeline, and media routes across modular sub-modules.
 */
export function registerQuizV2Routes(deps: QuizV2RouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    registerQuizV2ArtifactRoutes(server, deps);
    registerQuizV2PipelineRoutes(server, deps);
    registerQuizV2MediaRoutes(server, deps);
    done();
  };
}
