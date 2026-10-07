import type { CreativeSeed } from "@studio/shared";
import { buildSeedsFromDefinitions, type SeedDefinition } from "./seedTypes.js";
import { OUTRO_ENTRANCE_DEFINITIONS } from "./outroEntranceSeeds.js";

export const OUTRO_SEED_DEFINITIONS: Record<string, SeedDefinition[]> = {
  outro_entrance: OUTRO_ENTRANCE_DEFINITIONS,
  outro_recognition: [
    ["E01", "Delighted Response", "Appear already in active celebration, reacting with delight to the viewer's participation without claiming a score."],
    ["E02", "Reward Reveal", "Appear already in dynamic motion, revealing a symbolic reward or gleaming quiz trophy without requiring the mascot to hold it."],
    ["E03", "Shared Celebration", "Offer an in-motion shared celebratory gesture compatible with the mascot."],
    ["E04", "Festive Accent", "Add one restrained festive accent of colorful confetti and floating sparkles around the moving mascot."],
    ["E05", "Effort Recognition", "Recognize effort and curiosity with pre-existing celebratory applause and cheer."],
    ["E06", "Appreciation", "Show sincere appreciation and gratitude using supported kinetic body language."],
    ["E07", "Victory Motion", "Use an energetic celebration victory lap within the style's motion limits."],
    ["E08", "Comic Playful Silliness", "Celebrate with cheeky, humorous cartoon antics, making funny faces or an exaggerated goofy grin."],
    ["E09", "Proud Hero Fist Pump", "Strike a triumphant hero pose with a proud fist pump celebrating the viewer's intelligence."],
    ["E10", "High-Energy Bouncy Joy", "Bounce with overflowing vitality and excitement, radiating infectious joy across the stage."],
    ["E11", "Golden Star Shower", "Trigger a radiant shower of golden star particles cascading around the mascot in celebration."],
    ["E12", "Sparkling Wonder", "React with wide, awe-struck starry eyes and an admiring smile celebrating the viewer's trivia mastery."],
    ["E13", "Air High-Five Salute", "Offer an energetic air high-five toward the camera lens in mutual triumph with the viewer."],
    ["E14", "Standing Ovation", "Give a passionate two-handed standing ovation with an affectionate beaming smile."],
    ["E15", "Brain Champion Salute", "Present an imaginary crown or champion laurel gesture honoring the viewer as the quiz winner."],
  ],
  outro_invitation: [
    ["F01", "Subscribe Invitation", "Offer a concise, age-appropriate subscribe invitation finishing with a cheerful 'see ya' sign-off."],
    ["F02", "Return Invitation", "Invite viewers to return for another quiz with an affectionate wave and farewell."],
    ["F03", "Community Warmth", "Close with a warm sense of shared participation and a cheerful 'bye' sign-off."],
    ["F04", "Next Challenge", "Invite viewers to try another challenge soon with an upbeat goodbye."],
    ["F05", "Next Episode Teaser", "Tease a future quiz and wave goodbye without inventing unavailable topics."],
    ["F06", "Closing Acknowledgement", "Deliver a sincere thank-you and warm 'see ya' sign-off."],
    ["F07", "Invitation Banner", "Reveal one approved invitation banner while giving a cheerful farewell sign-off."],
    ["F08", "Brain Quest Club", "Invite viewers into the official brain quest club by subscribing for daily puzzle adventures."],
    ["F09", "Brain Power Level Up", "Inspire viewers to level up their brain power every day by subscribing to train together."],
    ["F10", "Daily Brain Snacks", "Frame quizzes as delicious daily brain snacks and invite viewers to subscribe so they never miss a bite."],
    ["F11", "Ultimate Quiz Squad", "Call on viewers to join the ultimate quiz squad by tapping the subscribe button."],
    ["F12", "Tomorrow's Mystery Quiz", "Tease an exciting mystery quiz dropping tomorrow and challenge viewers to subscribe to play along."],
    ["F13", "Perfect Ten Showdown", "Challenge viewers to score a perfect ten on the next quiz and subscribe to test their skills."],
    ["F14", "Epic Brain Buster", "Playfully warn of an upcoming wild brain buster quiz and urge viewers to subscribe so they are ready."],
    ["F15", "Lightning Speed Round", "Tease an ultra-fast lightning trivia round coming next and invite subscribers to jump in."],
    ["F16", "Riddle Master Challenge", "Dare viewers to test their wit against the riddle master in the next quest."],
    ["F17", "Comment Your Score", "Ask viewers how many points they scored, inviting them to comment below and subscribe."],
    ["F18", "Trickiest Question Poll", "Ask viewers which question was the trickiest today, encouraging comments and subscriptions."],
    ["F19", "Quiz Champion High Score", "Salute viewers as quiz champions and invite them to leave their high score in the comments."],
    ["F20", "Leaderboard Beat Mascot", "Ask if viewers beat the mascot's score today and encourage them to subscribe for the leaderboard."],
    ["F21", "Topic Suggestion Prompt", "Prompt viewers to comment what topic the next quiz should explore and subscribe to see it."],
    ["F22", "Brain Gears Spinning", "Playfully joke that the mascot's brain gears are still smoking from the workout, asking for a subscribe."],
    ["F23", "Air High-Five Salute", "Offer an enthusiastic air high-five through the lens for completing the quiz, paired with a cheerful subscribe."],
    ["F24", "Daily Brain Workout", "Treat today's quiz as an energizing gym session for the brain, urging a subscribe to stay sharp."],
    ["F25", "Spark of Genius Cheer", "Celebrate the viewer's spark of genius and invite them to join the channel family."],
    ["F26", "Celebratory Victory Groove", "Perform a playful victory dance while encouraging viewers to tap subscribe for more happy quizzing."],
    ["F27", "Curious Minds Discovery", "Inspire curious minds to explore new quizzes every day by tapping subscribe."],
    ["F28", "Stay Sharp Motivation", "Deliver an inspiring sign-off urging viewers to stay sharp, stay curious, and subscribe for the next quest."],
    ["F29", "Superpower Knowledge Boost", "Remind viewers that knowledge is their true superpower and urge a subscribe to charge it up."],
    ["F30", "Tomorrow's Grand Adventure", "Build eager anticipation for tomorrow's unforgettable quiz adventure with an affectionate farewell."],
  ],
  outro_farewell: [
    ["G01", "Supported Farewell", "Deliver a warm, affectionate goodbye wave or gesture directly to the viewer."],
    ["G02", "Permitted Departure", "Exit through flight only when supported; otherwise use supported locomotion.", ["flight"]],
    ["G03", "Partial Hide and Reveal", "Move partly behind the intact logo, then give one final friendly sign-off."],
    ["G04", "Respectful Sign-Off", "Use a simple respectful closing pose and goodbye."],
    ["G05", "Horizon Departure", "Move toward a clean background destination using supported locomotion.", ["locomotion"]],
    ["G06", "Friendly Closing Pose", "End with a friendly silhouette-readable goodbye pose."],
    ["G07", "Stage Close", "Use a simple stage-closing element without trapping or obscuring the mascot."],
  ],
  outro_kinematic_transition: [
    [
      "H01",
      "Portal Ring Dive & Roll",
      "Sprint forward and dive into a floating golden energy ring detonating a 100% whiteout lens flare, bursting out into a parkour roll and slide.",
      ["locomotion"],
    ],
    [
      "H02",
      "Virtual High-Five Lens Wipe",
      "Sprint toward the camera and slap the lens affectionately for a high-five, creating an explosive starburst contact flash that wipes the frame.",
    ],
    [
      "H03",
      "Hyper-Speed Whip-Pan Swipe",
      "Dash across frame with heavy motion blur, triggering an aggressive 90-degree camera whip-pan that seamlessly masks the cut into a slide stop.",
      ["locomotion"],
    ],
    [
      "H04",
      "Acrobatic Vault & Particle Bloom",
      "Launch into an aerial vault detonating festive confetti and fireworks that bleach the screen before a hero landing.",
      ["locomotion"],
    ],
    [
      "H05",
      "Quiz Trophy Badge Toss",
      "Flick a gleaming golden Quiz Champion badge directly toward the lens, bleaching the screen in gold before a seamless momentum roll.",
    ],
    [
      "H06",
      "Low Slide & Light Underpass",
      "Execute an athletic slide under an illuminated neon structure, using the blinding light beam to wash the frame into a slide-stop.",
      ["locomotion"],
    ],
    [
      "H07",
      "Quiz Placard Lens Occlusion",
      "Step forward and sweep a large quiz placard or prize box directly past the camera lens to create a 100% foreground occlusion wipe before revealing the stage.",
    ],
    [
      "H08",
      "Whirlwind Spin Match Cut",
      "Perform an energetic 360-degree whirlwind spin that peaks at maximum rotational velocity at the midpoint before unfurling into a hero landing.",
      ["locomotion"],
    ],
    [
      "H09",
      "Thematic Particle Glitch Burst",
      "Trigger a dense burst of magical smoke, cyber glitch pixels, or festive bubbles engulfing the lens at the seam before dispersing.",
    ],
    [
      "H10",
      "Comic Springboard & Starburst Wipe",
      "Launch forward off a bouncy comic springboard directly toward the lens, detonating an explosive starburst contact flash wipe before bouncing into a clean cartoon landing.",
    ],
  ],
};

const OUTRO_MEDIUM_COMPLEXITY_IDS = new Set([
  ...OUTRO_ENTRANCE_DEFINITIONS.map(([id]) => id),
  "H01", "H03", "H04", "H06", "H07", "H08", "H09", "H10",
]);

export const OUTRO_SEEDS: CreativeSeed[] = buildSeedsFromDefinitions(
  OUTRO_SEED_DEFINITIONS,
  "outro",
  OUTRO_MEDIUM_COMPLEXITY_IDS,
);
