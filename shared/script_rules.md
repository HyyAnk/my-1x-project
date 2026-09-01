# Quiz Script Rules

- Write exactly the configured number of question blocks using one second-level `## Question N — Title` heading per question. Do not add standalone welcome, closing, or interstitial sections.
- Fold the welcome into Question 1 and the closing into the final question.
- Preserve the approved question order, evidence-linked canonical answers, configured choice count, and Claim IDs. Put Claim IDs in an HTML comment within their question block so they are auditable but not spoken.
- Keep every spoken question and answer choice concise, direct, child-friendly, and easy to distinguish by ear.
- Make Think/reveal timing clear in each block: ask the question, speak the choices or clue, invite a guess, leave the approved thinking beat, reveal the answer, then explain it.
- Give every answer exactly one concise explanation. Do not add a second fact, recap paragraph, or filler after the explanation.
- Do not invent facts, quotes, sources, reactions, statistics, or anecdotes. When the evidence is ambiguous, use the qualified answer approved by the treatment.
- Add the hidden marker `<!-- HUMOR_POLICY: v1 -->` immediately after the script title. Humor is optional, restrained, and limited to a short observation or analogy that clarifies the answer without adding unsupported claims.
- Put an audio cue after a humorous spoken line using only `<!-- AUDIO_CUE: chuckle -->` or, rarely, `<!-- AUDIO_CUE: laugh -->`. Never write spoken production directions such as `(laughs)` or `[laugh]`.
- Never mock victims, vulnerable people, tragedies, or cultures. Use neutral, respectful wording for sensitive subjects.
- Apply strict copyright and trademark safety. Do not use protected commercial characters, logos, or franchise-specific likenesses in questions, choices, examples, or narration.
- Keep spoken text TTS-safe: avoid dotted single-letter abbreviations and scientific names; spell out titles and common abbreviations; express numbers, measurements, and symbols conversationally.
- Keep visual or editing directions out of narration. Only the approved hidden HTML comments may carry non-spoken metadata.
