import type { QuizTimeline } from "@studio/shared";

type TimelineEvent = QuizTimeline["events"][number];

/** Brand-logo stinger leaving the topic title card into question 1. */
export const BRIDGE_TOPIC_TO_QUESTION_INSTANCE_ID = "bridge_topic_to_question";
/** Legacy id from timelines where the subscribe CTA followed the topic card. */
export const LEGACY_BRIDGE_TOPIC_TO_CTA_INSTANCE_ID = "bridge_topic_to_cta";
export const BRIDGE_CTA_TO_QUESTION_INSTANCE_ID = "bridge_cta_to_question";

const BRAND_STINGER_INSTANCE_IDS = new Set([BRIDGE_TOPIC_TO_QUESTION_INSTANCE_ID, LEGACY_BRIDGE_TOPIC_TO_CTA_INSTANCE_ID]);

export function isBridgeBrandStingerEvent(event: TimelineEvent): boolean {
  return (
    event.type === "transition.start" &&
    (BRAND_STINGER_INSTANCE_IDS.has(event.payload?.instance_id as string) ||
      event.payload?.transition_id === "brand_logo_stinger" ||
      event.event_id === `transition_${LEGACY_BRIDGE_TOPIC_TO_CTA_INSTANCE_ID}`)
  );
}

export function isBridgeCtaToQuestionEvent(event: TimelineEvent): boolean {
  return (
    event.type === "transition.start" &&
    (event.payload?.instance_id === BRIDGE_CTA_TO_QUESTION_INSTANCE_ID ||
      event.payload?.transition_id === "energy_whip" ||
      event.event_id === `transition_${BRIDGE_CTA_TO_QUESTION_INSTANCE_ID}`)
  );
}

/** Bridge stingers carry their own scheduled SFX, so the generic transition sound must be skipped. */
export function isBridgeStingerTransition(event: TimelineEvent): boolean {
  return isBridgeBrandStingerEvent(event) || isBridgeCtaToQuestionEvent(event);
}
