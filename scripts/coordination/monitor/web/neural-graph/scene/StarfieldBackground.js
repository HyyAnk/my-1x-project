import * as THREE from "three";

/**
 * Minimal, elegant deep-space perimeter starfield rendered as vertex-colored points.
 * Owns the starfield Points object and its gentle drift animation.
 */
export class StarfieldBackground {
  constructor(scene) {
    this.starfield = null;
    this.build(scene);
  }

  build(scene) {
    // Clean & clutter-free distant spherical shell far behind the neural graph
    const starCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 400 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = r * Math.cos(phi);

      // Deep celestial slate & muted cyan tint
      colors[i] = 0.25 + Math.random() * 0.2;
      colors[i + 1] = 0.45 + Math.random() * 0.25;
      colors[i + 2] = 0.7 + Math.random() * 0.2;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.85,
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
    });

    this.starfield = new THREE.Points(geometry, material);
    scene.add(this.starfield);
  }

  /** Gentle deep space starfield drift (called each frame). */
  update() {
    if (this.starfield) {
      this.starfield.rotation.y += 0.00015;
    }
  }
}
