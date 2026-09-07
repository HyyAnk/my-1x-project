import type { SandboxPhaseTimeline } from "@studio/shared";

/**
 * Generates the client-side JavaScript for controlling animations in rehearsal mode.
 */
export function getSandboxRehearsalClientScript(timeline: SandboxPhaseTimeline | { totalDuration: number } | number): string {
  const totalDuration = typeof timeline === "number" ? timeline : timeline.totalDuration;
  return `
    window.__hyperframesRehearsal = {
      duration: ${totalDuration.toFixed(3)},
      seek: function(timeSec) {
        var timeMs = Math.max(0, timeSec * 1000);
        var anims = document.getAnimations ? document.getAnimations({ subtree: true }) : [];
        for (var i = 0; i < anims.length; i++) {
          try { anims[i].currentTime = timeMs; } catch (e) {}
        }
      },
      play: function(timeSec) {
        if (typeof timeSec === "number") {
          window.__hyperframesRehearsal.seek(timeSec);
        }
        var anims = document.getAnimations ? document.getAnimations({ subtree: true }) : [];
        for (var i = 0; i < anims.length; i++) {
          try {
            var cur = anims[i].currentTime;
            anims[i].play();
            if (cur !== null && cur !== undefined) {
              anims[i].currentTime = cur;
            }
          } catch (e) {}
        }
      },
      pause: function() {
        var anims = document.getAnimations ? document.getAnimations({ subtree: true }) : [];
        for (var i = 0; i < anims.length; i++) {
          try {
            var cur = anims[i].currentTime;
            anims[i].pause();
            if (cur !== null && cur !== undefined) {
              anims[i].currentTime = cur;
            }
          } catch (e) {}
        }
      }
    };
    // Immediately pause on initialization so animations never run ahead of user interaction
    window.__hyperframesRehearsal.seek(0);
    window.__hyperframesRehearsal.pause();
    window.addEventListener("message", function(event) {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "REHEARSAL_SEEK") {
        window.__hyperframesRehearsal.seek(event.data.time);
      } else if (event.data.type === "REHEARSAL_PLAY") {
        window.__hyperframesRehearsal.play(event.data.time);
      } else if (event.data.type === "REHEARSAL_PAUSE") {
        window.__hyperframesRehearsal.pause();
      }
    });
  `;
}
