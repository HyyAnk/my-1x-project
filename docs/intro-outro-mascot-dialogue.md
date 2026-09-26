# Mascot dialogue policy

New v7 generations use the visible mascot as the speaker with synchronized mouth movement, not an off-screen narrator. Speech is an explicit creative direction, independent of what can be inferred from a still image; cached visual identity is not rewritten.

The server supplies one short line at 3–5.5 seconds: intro “Quiz time!” (joyful, enthusiastic), outro “See you next quiz!” (warm, playful). Both use the same character voice, preserve the reference mouth design, and finish before the final hold. Verbal seeds cannot add countdowns or filler. This adds no provider calls or review gates.

The optional dialogue policy preserves legacy revision behavior. Existing saved prompts are not overwritten: Generate/Regenerate creates the new version. Validation requires one mascot-spoken line for the new policy while retaining timing and other capability checks. Actual rendered lip-sync remains dependent on the video model and requires video QA.
