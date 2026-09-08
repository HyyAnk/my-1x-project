import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { StarfieldBackground } from "./StarfieldBackground.js";

/**
 * Owns the raw Three.js scene, camera, renderer, OrbitControls, lights,
 * raycaster/mouse picking primitives, and the resize/mouse event wiring.
 * Exposes a small update/render API for the render loop.
 */
export class SceneManager {
  constructor(container) {
    this.container = container;
    this.initScene();
    this.initLights();
    this.starfield = new StarfieldBackground(this.scene);
    this.initControls();
    this.initEvents();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x070a13, 0.0032);

    const width = this.container.clientWidth || window.innerWidth || 800;
    const height = this.container.clientHeight || window.innerHeight || 600;

    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    this.defaultCameraPos = new THREE.Vector3(0, 35, 175);
    this.camera.position.copy(this.defaultCameraPos);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x070a13, 1);
    this.container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-9999, -9999);
  }

  initLights() {
    const ambient = new THREE.AmbientLight(0x38bdf8, 0.65);
    this.scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(120, 160, 100);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 0.6);
    dirLight2.position.set(-120, -60, -100);
    this.scene.add(dirLight2);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 350;
    this.controls.minDistance = 25;
    this.controls.target.set(0, 5, 0);
  }

  initEvents() {
    window.addEventListener("resize", () => {
      if (!this.container) return;
      const width = this.container.clientWidth || window.innerWidth || 800;
      const height = this.container.clientHeight || window.innerHeight || 600;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });

    this.renderer.domElement.addEventListener("mousemove", (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.onMouseMove?.(e.clientX, e.clientY);
    });
  }

  /** Per-frame controls damping + starfield drift + final render. */
  update() {
    this.starfield.update();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
