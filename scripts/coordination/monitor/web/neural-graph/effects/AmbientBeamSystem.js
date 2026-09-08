import * as THREE from "three";

const BEAM_POOL_SIZE = 5;

/**
 * Owns the ambient staggered synaptic light beams: a pool of 5 reusable
 * head-sphere + tail-streak beam objects that periodically traverse random
 * axon conduits in waves of 3-5 beams with 0.2s-0.7s launch staggering.
 */
export class AmbientBeamSystem {
  constructor(scene) {
    this.scene = scene;
    this.ambientBeams = [];
    this.nextAmbientWaveTime = 0;
    this.buildBeamPool();
  }

  buildBeamPool() {
    // Pre-allocate 5 reusable beam objects (pool for 3-5 concurrent staggered beams)
    for (let i = 0; i < BEAM_POOL_SIZE; i++) {
      const headGeo = new THREE.SphereGeometry(0.42, 8, 8);
      const headMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.visible = false;
      this.scene.add(headMesh);

      const tailSegments = 16;
      const tailGeo = new THREE.BufferGeometry();
      const tailPositions = new Float32Array(tailSegments * 3);
      tailGeo.setAttribute("position", new THREE.BufferAttribute(tailPositions, 3));
      const tailMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const tailLine = new THREE.Line(tailGeo, tailMat);
      tailLine.visible = false;
      this.scene.add(tailLine);

      this.ambientBeams.push({
        headMesh,
        tailLine,
        tailSegments,
        active: false,
        launchTime: 0,
        duration: 1300,
        axon: null,
        reverse: false,
        tailLength: 0.22,
      });
    }
  }

  /** Per-frame wave scheduling + active beam traversal. */
  update(now, axonLines, nodeMeshes) {
    if (!axonLines || axonLines.length === 0) return;

    // Check if it's time to trigger the next ambient wave
    if (now >= this.nextAmbientWaveTime) {
      this.scheduleAmbientBeamWave(now, axonLines);
    }

    for (const beam of this.ambientBeams) {
      this.animateBeam(beam, now, nodeMeshes);
    }
  }

  scheduleAmbientBeamWave(now, axonLines) {
    // Pick 3 to 5 random distinct connection lines (axons)
    const count = 3 + Math.floor(Math.random() * 3); // 3, 4, or 5
    const available = [...axonLines];
    const chosenAxons = [];

    for (let i = 0; i < count && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      chosenAxons.push(available.splice(idx, 1)[0]);
    }

    // Schedule each beam with non-simultaneous staggered launch (0.2s - 0.7s gap)
    let currentLaunchTime = now;
    for (let i = 0; i < chosenAxons.length; i++) {
      if (i > 0) {
        const staggerMs = 200 + Math.random() * 500;
        currentLaunchTime += staggerMs;
      }

      const beam = this.ambientBeams[i];
      beam.active = true;
      beam.axon = chosenAxons[i];
      beam.launchTime = currentLaunchTime;
      beam.duration = 1200 + Math.random() * 500; // 1.2s - 1.7s traversal time
      beam.reverse = Math.random() > 0.5; // Random transmission direction
      beam.headMesh.visible = false;
      beam.tailLine.visible = false;
    }

    // Schedule next wave after the final beam has finished traversing + random rest interval (2.0s - 4.5s)
    const lastBeamDuration = this.ambientBeams[chosenAxons.length - 1]?.duration || 1400;
    const waveCompletionTime = currentLaunchTime + lastBeamDuration;
    const waveRestMs = 2000 + Math.random() * 2500;
    this.nextAmbientWaveTime = waveCompletionTime + waveRestMs;
  }

  animateBeam(beam, now, nodeMeshes) {
    if (!beam.active || !beam.axon || !beam.axon.curve) return;

    // Waiting for staggered launch time
    if (now < beam.launchTime) {
      beam.headMesh.visible = false;
      beam.tailLine.visible = false;
      return;
    }

    const elapsed = now - beam.launchTime;
    const progress = elapsed / beam.duration;

    if (progress >= 1.0) {
      // Beam reached destination
      beam.active = false;
      beam.headMesh.visible = false;
      beam.tailLine.visible = false;

      // Subtle synaptic energy ripple at destination zone node
      const arrivalZoneId = beam.reverse ? beam.axon.source : beam.axon.target;
      const node = nodeMeshes.get(arrivalZoneId);
      if (node && node.excitation < 0.25) {
        node.excitation = Math.max(node.excitation, 0.2);
      }
      return;
    }

    const headT = beam.reverse ? 1.0 - progress : progress;
    const curve = beam.axon.curve;
    const headPos = curve.getPoint(headT);

    // Smooth opacity ramp: fade in at start, fade out at end
    let alpha = 1.0;
    if (progress < 0.12) {
      alpha = progress / 0.12;
    } else if (progress > 0.88) {
      alpha = (1.0 - progress) / 0.12;
    }

    // Update head mesh
    beam.headMesh.position.copy(headPos);
    beam.headMesh.material.opacity = alpha * 0.95;
    beam.headMesh.visible = true;

    // Update trailing streak line
    beam.tailLine.visible = true;
    beam.tailLine.material.opacity = alpha * 0.85;

    const tailLength = beam.tailLength;
    const tailPosArr = beam.tailLine.geometry.attributes.position.array;
    const numPts = beam.tailSegments;

    for (let j = 0; j < numPts; j++) {
      const frac = j / (numPts - 1); // 0 (tail tip) to 1 (head)
      let ptT;
      if (beam.reverse) {
        ptT = Math.min(1.0, Math.max(0.0, headT + (1.0 - frac) * tailLength));
      } else {
        ptT = Math.max(0.0, Math.min(1.0, headT - (1.0 - frac) * tailLength));
      }
      const pt = curve.getPoint(ptT);
      const idx = j * 3;
      tailPosArr[idx] = pt.x;
      tailPosArr[idx + 1] = pt.y;
      tailPosArr[idx + 2] = pt.z;
    }
    beam.tailLine.geometry.attributes.position.needsUpdate = true;
  }
}
