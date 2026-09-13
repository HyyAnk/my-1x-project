export interface TopicInsightsProps {
  whyItFits: string;
  hook: string;
}

export function TopicInsights({ whyItFits, hook }: TopicInsightsProps) {
  return (
    <div className="topic-insights-panel">
      <div className="topic-insight-item topic-detail">
        <span>Why it fits</span>
        <p title={whyItFits}>{whyItFits}</p>
      </div>
      <div className="topic-insight-item topic-detail">
        <span>Hook</span>
        <p title={hook}>{hook}</p>
      </div>
    </div>
  );
}
