import type { Channel, Episode, QuizV2 } from "@studio/shared";
import { calculateScoringTiers, formatScoringRange } from "./scoringTiers.js";

export interface CompileVideoDescriptionPromptInput {
  quiz: QuizV2;
  channel: Channel;
  episode: Episode;
  toneHint?: string;
}

/**
 * Compiles a structured, high-performing AI prompt to generate an optimized video description.
 * Implements the 11 Quiz Description rules with strict anti-hallucination and SEO LSI constraints.
 */
export function compileVideoDescriptionPrompt(input: CompileVideoDescriptionPromptInput): string {
  const { quiz, channel, episode, toneHint } = input;
  const questions = quiz.questions;
  const questionCount = questions.length;
  const tiers = calculateScoringTiers(questionCount);
  const language = channel.language || "Vietnamese";

  const questionSummaries = questions
    .map((q, index) => {
      const correctChoice = q.choices.find((c) => c.id === q.correct_choice_id)?.text ?? "";
      return `Q${index + 1}: ${q.question} | Ans: ${correctChoice} | Exp: ${q.explanation}`;
    })
    .join("\n");

  const tier1Range = formatScoringRange(tiers.tier1.min, tiers.tier1.max, language);
  const tier2Range = formatScoringRange(tiers.tier2.min, tiers.tier2.max, language);
  const tier3Range = formatScoringRange(tiers.tier3.min, tiers.tier3.max, language);

  const isPreschool =
    episode.quiz_config?.age_band === "4-6" ||
    /preschool|toddler|mầm non/i.test(channel.target_audience);

  return [
    `You are an elite YouTube SEO strategist and copywriter for educational quiz channels.`,
    `Analyze the fact-checked Quiz script below and generate a high-performing video description.`,
    ``,
    `[CHANNEL & EPISODE CONTEXT]:`,
    `- Channel: "${channel.display_name}"`,
    `- Brand Name: "${episode.quiz_config?.channel_brand_name || channel.display_name}"`,
    `- Language: ${language}`,
    `- Topic Title: "${episode.topic.title}"`,
    `- Topic Hook: "${episode.topic.hook}"`,
    `- Total Questions (Exact Ground Truth): ${questionCount}`,
    ...(toneHint ? [`- Tone Hint / Angle: "${toneHint}"`] : []),
    ``,
    `[EXACT SCORING TIERS TO USE]:`,
    `- Tier 1 (Beginner): ${tier1Range}`,
    `- Tier 2 (Intermediate): ${tier2Range}`,
    `- Tier 3 (Expert): ${tier3Range}`,
    ``,
    `[FACT-CHECKED QUESTIONS IN SCRIPT]:`,
    questionSummaries,
    ``,
    `[11 MANDATORY GENERATION RULES]:`,
    `1. TOPIC & PRIMARY KEYWORD: Identify the main niche topic and 1 high-intent search phrase (e.g. "đố vui lịch sử việt nam", "world geography quiz").`,
    `2. QUESTION COUNT: Explicitly mention the exact number (${questionCount}) in the hook. Do NOT alter or guess this number.`,
    `3. HOOK (2-3 lines, max 150 chars): Line 1 must contain the primary search keyword verbatim. Line 2 must use a natural synonym or semantic variation. Line 3 sets up the challenge.`,
    `4. LSI SEMANTIC PARAGRAPH: Write a cohesive, natural 3-4 sentence paragraph weaving specific entities, facts, and concepts directly from the questions above. Do NOT list items as bullet points. Do NOT invent concepts not in the script.`,
    `5. SCORING CTA: Use the calculated ranges (${tier1Range}, ${tier2Range}, ${tier3Range}) and assign engaging rank titles in ${language} (e.g. "Tập sự", "Thông thái", "Bậc thầy"). Add an inviting comment prompt.`,
    `6. PLAYLIST THEME: State 1 clean playlist category name (plain text only, NEVER invent or write URLs).`,
    `7. HASHTAGS: Provide 3-5 relevant hashtags: 1 niche brand/topic tag, 2 content keyword tags, and 1 general quiz tag (e.g. #quiz, #trivia, #dovui).`,
    `8. DIVERSITY & ANTI-DUPLICATION: Use fresh, engaging phrasing instead of generic template cliches.`,
    `9. AUDIENCE COMPLIANCE: ${isPreschool ? "Preschool/young child audience allowed." : "Do NOT use sensitive keywords like 'for kids', 'toddler', 'preschool', 'cho bé học' unless strictly applicable."}`,
    `10. ZERO HALLUCINATION: Ground 100% of facts in the provided question list.`,
    `11. LENGTH & LANGUAGE: Write strictly in ${language}. Keep the full main description under 800 characters.`,
    ``,
    `Return ONLY a valid JSON object matching this exact schema:`,
    `{`,
    `  "topic_category": "Topic Category Name",`,
    `  "primary_keyword": "exact primary keyword phrase",`,
    `  "keyword_variations": ["variation 1", "variation 2"],`,
    `  "question_count": ${questionCount},`,
    `  "hook_lines": "Line 1 with keyword\\nLine 2 with variation\\nLine 3 challenge",`,
    `  "semantic_paragraph": "Natural 3-4 sentence paragraph mentioning actual entities from questions.",`,
    `  "scoring_cta": {`,
    `    "beginner": "${tier1Range}: Rank Title 1",`,
    `    "intermediate": "${tier2Range}: Rank Title 2",`,
    `    "expert": "${tier3Range}: Rank Title 3",`,
    `    "cta_text": "Comment prompt question"`,
    `  },`,
    `  "suggested_playlist_category": "Playlist Category Name",`,
    `  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4"]`,
    `}`,
  ].join("\n");
}
