import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// =====================
// SCENE / CAMERA / RENDERER
// =====================
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setClearColor(0x000000, 0);

document.getElementById("container3D").appendChild(renderer.domElement);

// =====================
// DRAG + SMOOTH CONTROL
// =====================
let isDragging = false;
let previousMouse = { x: 0, y: 0 };

// smooth rotation targets
let targetRotation = { x: 0, y: 0 };
let currentRotation = { x: 0, y: 0 };

// inertia
let velocity = { x: 0, y: 0 };

// =====================
// TEXTURES
// =====================
const textureLoader = new THREE.TextureLoader();

const albedo = textureLoader.load('./textures/Diffuse_V3.png', (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
});

const normal = textureLoader.load('./textures/Normal_V5.png', (t) => {
  t.flipY = false;
});

const roughness = textureLoader.load('./textures/Roughness_V3.png', (t) => {
  t.flipY = false;
});

// =====================
// HDRI LIGHTING
// =====================
const pmrem = new THREE.PMREMGenerator(renderer);

new RGBELoader().load('./textures/environment.hdr', (hdr) => {
  const envMap = pmrem.fromEquirectangular(hdr).texture;
  scene.environment = envMap;

  hdr.dispose();
  pmrem.dispose();
});

// optional helper light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(2, 2, 2);
scene.add(light);

// =====================
// MODEL + PIVOT
// =====================
let model;
let pivot;

const loader = new GLTFLoader();

loader.load('./models/phone.gltf', (gltf) => {
  model = gltf.scene;

  model.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        map: albedo,
        normalMap: normal,
        roughnessMap: roughness,
        metalness: 0.0,
        roughness: 0.5,
        transparent: false,
        opacity: 1,
      });
    }
  });
model.scale.set(0.1, 0.1, 0.1);
  // center model
const box = new THREE.Box3().setFromObject(model);
const size = box.getSize(new THREE.Vector3()).length();
const center = box.getCenter(new THREE.Vector3());

camera.position.set(0, 0, size * 1.5);
camera.lookAt(center);
model.scale.set(0.3, 0.3, 0.3);


  // pivot setup
  pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);
});

// =====================
// MOUSE EVENTS
// =====================
renderer.domElement.addEventListener('mousedown', (e) => {
  isDragging = true;
  previousMouse.x = e.clientX;
  previousMouse.y = e.clientY;
});

renderer.domElement.addEventListener('mouseup', () => {
  isDragging = false;
});

renderer.domElement.addEventListener('mouseleave', () => {
  isDragging = false;
});

renderer.domElement.addEventListener('mousemove', (e) => {
  if (!isDragging || !pivot) return;

  const deltaX = e.clientX - previousMouse.x;
  const deltaY = e.clientY - previousMouse.y;

  // target rotation (smooth, not direct)
  targetRotation.y += deltaX * 0.005;
  targetRotation.x += deltaY * 0.005;

  // clamp vertical tilt
  targetRotation.x = Math.max(
    -Math.PI / 4,
    Math.min(Math.PI / 4, targetRotation.x)
  );

  // inertia
  velocity.x = deltaX * 0.001;
  velocity.y = deltaY * 0.001;

  previousMouse.x = e.clientX;
  previousMouse.y = e.clientY;
});

// =====================
// ANIMATION LOOP
// =====================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (pivot) {

    if (!isDragging) {
      // apply inertia
      targetRotation.y += velocity.x;
      targetRotation.x += velocity.y;

      velocity.x *= 0.95;
      velocity.y *= 0.95;

      // subtle auto-rotate
      targetRotation.y += delta * 0.2;
    }

    // ✨ SMOOTH EASING (Apple feel)
    currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1;
    currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1;

    pivot.rotation.x = currentRotation.x;
    pivot.rotation.y = currentRotation.y;
  }

  renderer.render(scene, camera);
}

animate();

// =====================
// RESIZE
// =====================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
