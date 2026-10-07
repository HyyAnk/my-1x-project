/**
 * Injects a lightweight client-side motion execution runtime for Hyperframes and browser rehearsals.
 * Guarantees that styles and SVG attributes are evaluated as pure mathematical functions of time t.
 */

export function generateDeterministicMotionRuntimeScript(): string {
  return `
(function() {
  if (window.__motionRuntimeInitialized) return;
  window.__motionRuntimeInitialized = true;

  var scenes = {};
  var currentTime = 0;

  function sampleSpringMath(t, stiffness, damping, mass) {
    if (t <= 0) return 0;
    var k = stiffness || 180;
    var c = damping || 12;
    var m = mass || 1;
    var w0 = Math.sqrt(k / m);
    var zeta = c / (2 * Math.sqrt(k * m));
    if (zeta < 1) {
      var wd = w0 * Math.sqrt(1 - zeta * zeta);
      var decay = Math.exp(-zeta * w0 * t);
      return 1 - decay * (Math.cos(wd * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * t));
    }
    return 1 - (1 + w0 * t) * Math.exp(-w0 * t);
  }

  function easeInOutCubicMath(t) {
    var p = Math.max(0, Math.min(1, t));
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  }

  window.__motionMath = {
    spring: sampleSpringMath,
    easeInOutCubic: easeInOutCubicMath
  };

  window.__registerMotionScene = function(id, renderFn) {
    scenes[id] = renderFn;
    try {
      renderFn(currentTime, window.__motionMath);
    } catch (e) {
      console.warn("Error rendering motion scene on register:", id, e);
    }
  };

  window.__motionSeek = function(timeSeconds) {
    currentTime = Math.max(0, Number(timeSeconds) || 0);
    for (var key in scenes) {
      if (Object.prototype.hasOwnProperty.call(scenes, key)) {
        try {
          scenes[key](currentTime, window.__motionMath);
        } catch (err) {
          console.warn("Motion render error in scene " + key + ":", err);
        }
      }
    }
  };

  // Wire into existing hyperframesRehearsal if present
  if (window.__hyperframesRehearsal) {
    var originalSeek = window.__hyperframesRehearsal.seek;
    window.__hyperframesRehearsal.seek = function(t) {
      if (originalSeek) originalSeek(t);
      window.__motionSeek(t);
    };
  }
})();
`.trim();
}
