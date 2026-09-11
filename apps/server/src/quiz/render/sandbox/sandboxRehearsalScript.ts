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
        var timeMs = Math.max(0, num * 1000);
        window.__hyperframesRehearsal.currentTimeSec = Math.max(0, num);
        var anims = document.getAnimations ? document.getAnimations({ subtree: true }) : [];
        for (var i = 0; i < anims.length; i++) {
          try {
            var anim = anims[i];
            if (window.__hyperframesRehearsal.isPlaying) {
              if (anim.playState === "finished") {
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
        var hasTime = typeof timeSec === "number" && !isNaN(timeSec);
        var timeMs = hasTime ? Math.max(0, timeSec * 1000) : null;
        if (hasTime) {
          window.__hyperframesRehearsal.currentTimeSec = Math.max(0, timeSec);
        }
        var anims = document.getAnimations ? document.getAnimations({ subtree: true }) : [];
        for (var i = 0; i < anims.length; i++) {
          try {
            var anim = anims[i];
            if (timeMs !== null) {
              anim.currentTime = timeMs;
            }
            anim.play();
            if (timeMs !== null) {
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
            var cur = anim.currentTime;
            anim.pause();
            if (cur !== null && cur !== undefined) {
              anim.currentTime = cur;
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
