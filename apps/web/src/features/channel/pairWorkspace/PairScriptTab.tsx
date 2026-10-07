import { AutoIdentityControl } from "./AutoIdentityControl";
import { ArrowsClockwise, Sparkle } from "@phosphor-icons/react";
import type { usePairDraft } from "./usePairDraft";
import type { usePairGeneration } from "./usePairGeneration";
import { PairGenerationStatus } from "./PairGenerationStatus";
import { PromptBox } from "./PromptBox";
import { PairResources } from "./PairResources";

export function PairScriptTab({
  draft,
  generation,
  uploading,
  channelId,
  stylePresetId,
}: {
  channelId: string;
  stylePresetId: string;
  draft: ReturnType<typeof usePairDraft>;
  generation: ReturnType<typeof usePairGeneration>;
  uploading: boolean;
}) {
  const hasText = Boolean(draft.texts.intro || draft.texts.outro);
  const { pending } = generation;
  const disabled = pending || uploading || draft.loading || !draft.project || draft.conflict;
  return (
    <div className="pair-script-tab">
      <div className="pair-script-toolbar">
        <button type="button" className="primary-button" disabled={disabled} onClick={() => void generation.generate()}>
          {hasText ? <ArrowsClockwise size={18} /> : <Sparkle size={18} />} {hasText ? "Regenerate" : "Generate Script"}
        </button>
        <AutoIdentityControl checked={generation.autoIdentity} disabled={pending || uploading} onChange={generation.setAutoIdentity} />
        <label className="pair-outro-duration-control">
          <span>Intro:</span>
          <select
            aria-label="Intro duration"
            value={generation.introDuration}
            disabled={disabled}
            onChange={(e) => generation.setIntroDuration(Number(e.target.value))}
          >
            <option value={10}>10s (Standard)</option>
            <option value={8}>8s (Fast)</option>
            <option value={6}>6s (Ultra-Fast)</option>
            <option value={12}>12s (Extended)</option>
          </select>
        </label>
        <label className="pair-outro-duration-control">
          <span>Outro:</span>
          <select
            aria-label="Outro duration"
            value={generation.outroDuration}
            disabled={disabled}
            onChange={(e) => generation.setOutroDuration(Number(e.target.value))}
          >
            <option value={10}>10s (Single Clip)</option>
            <option value={8}>8s (Single Clip)</option>
            <option value={12}>12s (2-Part Sequence)</option>
            <option value={16}>16s (2-Part Match Cut)</option>
            <option value={20}>20s (2-Part Sequence)</option>
          </select>
        </label>
        <label className="pair-outro-duration-control">
          <span>Entrance:</span>
          <select
            aria-label="Outro entrance motion"
            value={generation.outroMotionSeed}
            disabled={disabled}
            onChange={(e) => generation.setOutroMotionSeed(e.target.value)}
          >
            <option value="">Random Entrance (30 Seeds)</option>
            <optgroup label="Mounts & Flying Vehicles">
              <option value="J01">J01 - Dino & Creature Mount</option>
              <option value="J02">J02 - Plane & Aerial Glider</option>
              <option value="J05">J05 - Magic Broom & Flight</option>
              <option value="J08">J08 - Skydiving & Jetpack Soar</option>
              <option value="J15">J15 - Magic Flying Carpet</option>
            </optgroup>
            <optgroup label="Ground Vehicles & Racers">
              <option value="J03">J03 - Bicycle & Kart Dash</option>
              <option value="J07">J07 - Racecar & Cruiser Drive</option>
              <option value="J14">J14 - Hovercraft & Water Scooter</option>
              <option value="J18">J18 - Segway & Self-Balancing Board</option>
              <option value="J20">J20 - Sled & Snowmobile Rush</option>
              <option value="J24">J24 - Mini Steam Locomotive</option>
              <option value="J29">J29 - Soapbox Derby Gravity Racer</option>
              <option value="J30">J30 - Mecha-Suit Exosuit Stride</option>
            </optgroup>
            <optgroup label="Boards, Skates & Gliders">
              <option value="J04">J04 - Surfboard & Skate Slide</option>
              <option value="J10">J10 - Roller Skate Cruise</option>
              <option value="J19">J19 - Ice Skates & Figure Spin</option>
              <option value="J25">J25 - Windsurf & Land-Sail Glide</option>
            </optgroup>
            <optgroup label="Acrobatic & Cartoon Stunts">
              <option value="J06">J06 - Canopy Vine Swing</option>
              <option value="J09">J09 - Parkour Sprint & Vault</option>
              <option value="J11">J11 - Acrobatic Tumbling Roll</option>
              <option value="J12">J12 - Springboard & Trampoline Bounce</option>
              <option value="J13">J13 - Athletic Sprint & Skid</option>
              <option value="J16">J16 - Pogo Stick Cartoon Bounces</option>
              <option value="J17">J17 - Gyrosphere Bubble Roll</option>
              <option value="J21">J21 - Superhero Sky-Drop Landing</option>
              <option value="J22">J22 - Rainbow Energy Slide</option>
              <option value="J23">J23 - Unicycle Juggling Balance</option>
              <option value="J26">J26 - Space Hopper Ball Bounce</option>
              <option value="J27">J27 - Teleport Hologram Materialization</option>
              <option value="J28">J28 - Trapeze Cable Acrobatics</option>
            </optgroup>
          </select>
        </label>
        <label className="pair-outro-duration-control">
          <span>Celebration:</span>
          <select
            aria-label="Outro celebration tone"
            value={generation.outroToneSeed}
            disabled={disabled}
            onChange={(e) => generation.setOutroToneSeed(e.target.value)}
          >
            <option value="">Random Celebration</option>
            <option value="E01">E01 - Delighted Response</option>
            <option value="E02">E02 - Reward & Trophy Reveal</option>
            <option value="E03">E03 - Shared Celebration</option>
            <option value="E04">E04 - Festive Confetti Accent</option>
            <option value="E05">E05 - Effort Recognition</option>
            <option value="E06">E06 - Warm Appreciation</option>
            <option value="E07">E07 - Victory Lap</option>
            <option value="E08">E08 - Comic Playful Silliness</option>
            <option value="E09">E09 - Proud Hero Fist Pump</option>
            <option value="E10">E10 - High-Energy Bouncy Joy</option>
            <option value="E11">E11 - Golden Star Shower</option>
            <option value="E12">E12 - Sparkling Wonder</option>
            <option value="E13">E13 - Air High-Five Salute</option>
            <option value="E14">E14 - Standing Ovation</option>
            <option value="E15">E15 - Brain Champion Salute</option>
          </select>
        </label>
        <label className="pair-outro-duration-control">
          <span>Dialogue:</span>
          <select
            aria-label="Outro dialogue hook"
            value={generation.outroDialogueSeed}
            disabled={disabled}
            onChange={(e) => generation.setOutroDialogueSeed(e.target.value)}
          >
            <option value="">Random Hook (30 Seeds)</option>
            <optgroup label="Brain Club & Subscriptions">
              <option value="F01">F01 - Subscribe Invitation</option>
              <option value="F08">F08 - Brain Quest Club</option>
              <option value="F09">F09 - Brain Power Level Up</option>
              <option value="F10">F10 - Daily Brain Snacks</option>
              <option value="F11">F11 - Ultimate Quiz Squad</option>
            </optgroup>
            <optgroup label="Challenge & Mystery Teasers">
              <option value="F04">F04 - Next Challenge</option>
              <option value="F05">F05 - Next Episode Teaser</option>
              <option value="F12">F12 - Tomorrow's Mystery Quiz</option>
              <option value="F13">F13 - Perfect Ten Showdown</option>
              <option value="F14">F14 - Epic Brain Buster</option>
              <option value="F15">F15 - Lightning Speed Round</option>
              <option value="F16">F16 - Riddle Master Challenge</option>
            </optgroup>
            <optgroup label="Audience Engagement & Score">
              <option value="F17">F17 - Comment Your Score</option>
              <option value="F18">F18 - Trickiest Question Poll</option>
              <option value="F19">F19 - Quiz Champion High Score</option>
              <option value="F20">F20 - Leaderboard Beat Mascot</option>
              <option value="F21">F21 - Topic Suggestion Prompt</option>
            </optgroup>
            <optgroup label="Mascot Persona & Humor">
              <option value="F22">F22 - Brain Gears Spinning</option>
              <option value="F23">F23 - Air High-Five Salute</option>
              <option value="F24">F24 - Daily Brain Workout</option>
              <option value="F25">F25 - Spark of Genius Cheer</option>
              <option value="F26">F26 - Celebratory Victory Groove</option>
            </optgroup>
            <optgroup label="Curiosity & Discovery">
              <option value="F27">F27 - Curious Minds Discovery</option>
              <option value="F28">F28 - Stay Sharp Motivation</option>
              <option value="F29">F29 - Superpower Knowledge Boost</option>
              <option value="F30">F30 - Tomorrow's Grand Adventure</option>
            </optgroup>
            <optgroup label="Warm Sign-offs">
              <option value="F02">F02 - Return Invitation</option>
              <option value="F03">F03 - Community Warmth</option>
              <option value="F06">F06 - Closing Acknowledgement</option>
              <option value="F07">F07 - Invitation Banner</option>
            </optgroup>
          </select>
        </label>
      </div>
      <PairGenerationStatus generation={generation} disabled={disabled} />
      <PairResources channelId={channelId} stylePresetId={stylePresetId} />
      <div className="pair-prompt-grid">
        {(["intro", "outro"] as const).map((kind) => (
          <PromptBox
            key={kind}
            kind={kind}
            value={draft.texts[kind]}
            duration={kind === "outro" ? generation.outroDuration : generation.introDuration}
            disabled={pending || uploading || draft.loading}
            onChange={(text) => draft.edit(kind, text)}
          />
        ))}
      </div>
      <div className="pair-save-status" role="status">
        {draft.loading
          ? "Loading draft..."
          : draft.status === "saving" || draft.status === "unsaved"
            ? "Saving draft..."
            : draft.status === "failed"
              ? "Draft not saved"
              : hasText
                ? "Draft saved"
                : ""}
      </div>
      {draft.error ? (
        <div className="script-alert error" role="alert">
          <span>{draft.error}</span>
          <button
            type="button"
            className="quiet-button"
            onClick={() => void (draft.conflict ? draft.reload() : draft.project ? draft.flush() : draft.open()).catch(() => undefined)}
          >
            {draft.conflict ? "Reload draft" : draft.project ? "Retry save" : "Retry"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
