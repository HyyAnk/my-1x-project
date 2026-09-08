import * as THREE from "three";

/**
 * Owns the floating hologram file-activity badges: canvas-rendered sprites in
 * deterministic tiered non-overlapping slots with neon leader lines, plus the
 * localized micro-halo energy ripples at excited micro-neurons.
 */
export class HologramBadgeSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.hologramBadges = [];
    this.microHalos = [];
    this.badgeSideToggle = 0;
  }

  /** Spawns a rising hologram badge anchored at a world position. */
  spawnHologramBadgeAtPos(pos, fileName, eventType, agentName = null, isBatch = false) {
    const canvas = document.createElement("canvas");
    canvas.width = 440;
    canvas.height = 104;
    const ctx = canvas.getContext("2d");

    const theme = this.getBadgeTheme(eventType, isBatch);

    ctx.fillStyle = theme.bgColor;
    ctx.strokeStyle = theme.strokeColor;
    ctx.lineWidth = 4.0;
    ctx.shadowColor = theme.strokeColor;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(8, 8, 424, 88, 24);
    } else {
      ctx.rect(8, 8, 424, 88);
    }
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = "bold 26px 'JetBrains Mono', monospace";
    ctx.fillStyle = theme.textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const agentTag = agentName ? `[${agentName}] ` : "";
    const cleanFileName = fileName.length > 20 ? fileName.slice(0, 18) + "…" : fileName;
    const fullText = `${agentTag}${theme.prefix}${cleanFileName}`;

    ctx.fillText(fullText, 220, 52);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    // Scaled down to 30% of previous dimensions for compact, high signal-to-noise display
    sprite.scale.set(2.0, 0.48, 1);
    const startY = pos.y + 0.8;
    sprite.position.set(pos.x, startY, pos.z);

    const slot = this.reserveSlot();
    const leaderLine = this.createLeaderLine(pos, startY, theme.strokeColor);

    this.scene.add(leaderLine);
    this.scene.add(sprite);
    this.hologramBadges.push({
      sprite,
      texture,
      leaderLine,
      baseX: pos.x,
      baseY: pos.y,
      baseZ: pos.z,
      startY,
      slotIndex: slot.slotIndex,
      horizontalOffset: slot.horizontalOffset,
      targetHeight: slot.targetHeight,
      startTime: performance.now(),
      durationMs: 7200, // 7.2s lifetime
    });
  }

  getBadgeTheme(eventType, isBatch) {
    if (isBatch) {
      return { strokeColor: "#00f0ff", textColor: "#a5f3fc", prefix: "📦 ", bgColor: "rgba(6, 26, 44, 0.94)" };
    }
    if (eventType === "add") {
      return { strokeColor: "#10b981", textColor: "#a7f3d0", prefix: "+ ", bgColor: "rgba(6, 32, 22, 0.94)" };
    }
    if (eventType === "unlink") {
      return { strokeColor: "#ef4444", textColor: "#fca5a5", prefix: "✕ ", bgColor: "rgba(36, 10, 16, 0.94)" };
    }
    return { strokeColor: "#ff2244", textColor: "#fca5a5", prefix: "⚡ ", bgColor: "rgba(36, 8, 14, 0.94)" };
  }

  // Find the lowest unoccupied slot index (0, 1, 2, 3...)
  reserveSlot() {
    const occupiedSlots = new Set(this.hologramBadges.map((b) => b.slotIndex));
    let slotIndex = 0;
    while (occupiedSlots.has(slotIndex)) {
      slotIndex++;
    }

    const col = slotIndex % 2; // 0 = Left, 1 = Right
    const tier = Math.floor(slotIndex / 2);
    const sideSign = col === 0 ? -1 : 1;
    return {
      slotIndex,
      // Compact 12 units separation between Left and Right
      horizontalOffset: sideSign * 6.0,
      // Compact 4 units vertical gap between tiers
      targetHeight: 6.0 + tier * 4.0,
    };
  }

  // Glowing neon leader line connecting source to the rising badge
  createLeaderLine(pos, startY, strokeColor) {
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(pos.x, pos.y, pos.z),
      new THREE.Vector3(pos.x, startY, pos.z),
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(strokeColor),
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Line(lineGeo, lineMat);
  }

  /** Spawns an expanding radiant cyber red ripple ring at a position. */
  spawnMicroHalo(pos) {
    const haloColor = 0xff2244; // Radiant Cyber Red
    const ringGeo = new THREE.RingGeometry(0.165, 0.246, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: haloColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(pos);
    ringMesh.quaternion.copy(this.camera.quaternion);
    this.scene.add(ringMesh);

    this.microHalos.push({
      mesh: ringMesh,
      startTime: performance.now(),
      durationMs: 1200,
    });
  }

  /** Per-frame badge rise/drift/fade + micro-halo ripple animation. */
  update(now) {
    this.updateBadges(now);
    this.updateMicroHalos(now);
  }

  // 1. Clean up expired badges, then animate survivors along slot trajectories
  updateBadges(now) {
    for (let i = this.hologramBadges.length - 1; i >= 0; i--) {
      const badge = this.hologramBadges[i];
      if (now - badge.startTime >= badge.durationMs) {
        this.scene.remove(badge.sprite);
        badge.sprite.material.map.dispose();
        badge.sprite.material.dispose();
        if (badge.leaderLine) {
          this.scene.remove(badge.leaderLine);
          badge.leaderLine.geometry.dispose();
          badge.leaderLine.material.dispose();
        }
        this.hologramBadges.splice(i, 1);
      }
    }

    // 2. Purely horizontal camera-right vector (orthogonal to view direction, strictly in XZ plane with Y = 0)
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const camRightFlat = new THREE.Vector3(camRight.x, 0, camRight.z);
    if (camRightFlat.lengthSq() > 0.001) {
      camRightFlat.normalize();
    } else {
      camRightFlat.set(1, 0, 0);
    }

    // 3. Update each badge along its dedicated, non-overlapping slot trajectory
    for (let i = 0; i < this.hologramBadges.length; i++) {
      this.animateBadge(this.hologramBadges[i], camRightFlat, now);
    }
  }

  animateBadge(badge, camRightFlat, now) {
    const elapsed = now - badge.startTime;
    const progress = elapsed / badge.durationMs;

    // Vertical rise: strictly world Y, rising up to its allocated tier height
    const verticalRise = Math.pow(progress, 0.75) * badge.targetHeight;

    // Horizontal drift: strictly along camRightFlat, ZERO depth distortion!
    const horizontalDrift = Math.pow(progress, 0.8) * badge.horizontalOffset;

    const curX = badge.baseX + camRightFlat.x * horizontalDrift;
    const curY = badge.startY + verticalRise;
    const curZ = badge.baseZ + camRightFlat.z * horizontalDrift;

    badge.sprite.position.set(curX, curY, curZ);

    // Scaled down to 30% of previous dimensions (3.6x * scaleMult, 0.9y * scaleMult)
    let scaleMult;
    if (progress < 0.25) {
      const inProg = progress / 0.25;
      scaleMult = 1.0 + Math.pow(inProg, 0.6) * 2.0;
    } else if (progress < 0.75) {
      scaleMult = 3.0;
    } else {
      const exitProg = (progress - 0.75) / 0.25;
      scaleMult = 3.0 + exitProg * 0.35;
    }

    badge.sprite.scale.set(3.6 * scaleMult, 0.9 * scaleMult, 1);

    // Smooth fade out in the last 20%
    let opacity = 1.0;
    if (progress > 0.8) {
      opacity = (1.0 - progress) / 0.2;
    }
    badge.sprite.material.opacity = opacity;

    // Update glowing neon leader line from micro-neuron to badge bottom
    if (badge.leaderLine) {
      const linePos = badge.leaderLine.geometry.attributes.position.array;
      linePos[0] = badge.baseX;
      linePos[1] = badge.baseY;
      linePos[2] = badge.baseZ;
      linePos[3] = curX;
      linePos[4] = curY - 0.45 * scaleMult;
      linePos[5] = curZ;
      badge.leaderLine.geometry.attributes.position.needsUpdate = true;
      badge.leaderLine.material.opacity = opacity * 0.55;
    }
  }

  // Localized micro-halo energy ripples: expand 1.0x -> 5.0x and fade out
  updateMicroHalos(now) {
    for (let i = this.microHalos.length - 1; i >= 0; i--) {
      const halo = this.microHalos[i];
      const elapsed = now - halo.startTime;
      const progress = elapsed / halo.durationMs;

      if (progress >= 1.0) {
        this.scene.remove(halo.mesh);
        halo.mesh.geometry.dispose();
        halo.mesh.material.dispose();
        this.microHalos.splice(i, 1);
        continue;
      }

      // Smooth energetic expansion 1.0x to 5.0x
      const scale = 1.0 + Math.pow(progress, 0.5) * 4.2;
      halo.mesh.scale.set(scale, scale, scale);
      // Soft power fade out
      halo.mesh.material.opacity = Math.pow(1.0 - progress, 1.4) * 0.95;
      halo.mesh.quaternion.copy(this.camera.quaternion);
    }
  }
}
