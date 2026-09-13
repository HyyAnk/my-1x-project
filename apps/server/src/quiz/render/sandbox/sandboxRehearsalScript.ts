import type { SandboxPhaseTimeline } from "@studio/shared";

/**
 * Generates the client-side JavaScript for controlling animations in rehearsal mode.
 */
export function getSandboxRehearsalClientScript(timeline: SandboxPhaseTimeline | { totalDuration: number } | number): string {
  const totalDuration = typeof timeline === "number" ? timeline : timeline.totalDuration;
  return `
    window.__hyperframesRehearsal = {
      duration: ${totalDuration.toFixed(3)},
      isPlaying: false,
      currentTimeSec: 0,
      seek: function(timeSec) {
        var num = typeof timeSec === "number" && !isNaN(timeSec) ? timeSec : Number(timeSec) || 0;
        var targetSec = Math.max(0, num);
        var timeMs = targetSec * 1000;
        window.__hyperframesRehearsal.currentTimeSec = targetSec;
        var anims = document.getAnimations ? document.getAnimations({ subtree: true }) : [];
        for (var i = 0; i < anims.length; i++) {
          try {
            var anim = anims[i];
            if (window.__hyperframesRehearsal.isPlaying) {
              if (anim.playState === "finished" || anim.playState === "paused") {
                anim.play();
              }
              anim.currentTime = timeMs;
            } else {
              anim.pause();
              anim.currentTime = timeMs;
            }
          } catch (e) {}
        }
      },
      play: function(timeSec) {
        window.__hyperframesRehearsal.isPlaying = true;
        var anims = document.getAnimations ? document.getAnimations({ subtree: true }) : [];
        var hasTime = (typeof timeSec === "number" && !isNaN(timeSec)) || (typeof timeSec === "string" && !isNaN(Number(timeSec)) && timeSec.trim() !== "");
        var targetSec;
        if (hasTime) {
          targetSec = Math.max(0, Number(timeSec));
        } else if (window.__hyperframesRehearsal.currentTimeSec !== undefined && window.__hyperframesRehearsal.currentTimeSec !== null) {
          targetSec = window.__hyperframesRehearsal.currentTimeSec;
        } else {
          targetSec = 0;
        }
        if (!hasTime && window.__hyperframesRehearsal.duration > 0 && targetSec >= window.__hyperframesRehearsal.duration) {
          targetSec = 0;
        }
        window.__hyperframesRehearsal.currentTimeSec = targetSec;
        var timeMs = targetSec * 1000;
        for (var i = 0; i < anims.length; i++) {
          try {
            var anim = anims[i];
            if (anim.playState === "finished") {
              anim.play();
              anim.currentTime = timeMs;
            } else {
              anim.currentTime = timeMs;
              anim.play();
              anim.currentTime = timeMs;
            }
          } catch (e) {}
        }
      },
      pause: function() {
        window.__hyperframesRehearsal.isPlaying = false;
        var anims = document.getAnimations ? document.getAnimations({ subtree: true }) : [];
        for (var i = 0; i < anims.length; i++) {
          try {
            var anim = anims[i];
            anim.pause();
            if (anim.currentTime !== null && anim.currentTime !== undefined) {
              anim.currentTime = anim.currentTime;
            }
          } catch (e) {}
        }
        if (anims.length > 0 && anims[0].currentTime !== null && anims[0].currentTime !== undefined) {
          window.__hyperframesRehearsal.currentTimeSec = Math.max(0, anims[0].currentTime / 1000);
        }
      }
    };
    // Immediately pause on initialization so animations never run ahead of user interaction
    window.__hyperframesRehearsal.seek(0);
    window.__hyperframesRehearsal.pause();
    window.addEventListener("message", function(event) {
      if (!event.data || typeof event.data !== "object") return;
      try {
        if (event.data.type === "REHEARSAL_SEEK") {
          window.__hyperframesRehearsal.seek(event.data.time);
        } else if (event.data.type === "REHEARSAL_PLAY") {
          window.__hyperframesRehearsal.play(event.data.time);
        } else if (event.data.type === "REHEARSAL_PAUSE") {
          window.__hyperframesRehearsal.pause();
        }
      } catch (e) {}
    });
  `;
}
