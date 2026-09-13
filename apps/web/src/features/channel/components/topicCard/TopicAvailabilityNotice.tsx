import type { TopicAvailability } from "@studio/shared";

export interface TopicAvailabilityNoticeProps {
  availability: TopicAvailability;
}

export function TopicAvailabilityNotice({ availability }: TopicAvailabilityNoticeProps) {
  if (availability.can_confirm) {
    return null;
  }

  return (
    <div className="topic-availability-notice" role="alert">
      <strong>{availability.reason_code.replace(/_/g, " ")}</strong>
      <span>{availability.recovery_action}</span>
    </div>
  );
}
