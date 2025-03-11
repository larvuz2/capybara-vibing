import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SceneSetup } from './SceneSetup.js';
import { PhysicsWorld } from './PhysicsWorld.js';
import { Player } from './Player.js';

// Global variables
let sceneSetup, physicsWorld, player;
let capybaraModel, capybaraAnimations;
let environmentAssets = {};
let animationClips = {};

// Simple initialization - no async loading
window.addEventListener('load', () => {
  console.log('Window loaded');
  // Start the game with placeholder assets
  startGame();
});

// Start the game with placeholder assets
function startGame() {
  try {
    console.log('Starting game with placeholder assets');
    
    // Initialize physics
    RAPIER.init().then(() => {
      console.log('Physics initialized');
      
      // Set up scene and physics
      sceneSetup = new SceneSetup();
      physicsWorld = new PhysicsWorld();
      
      // Create default environment
      createDefaultEnvironment();
      
      // Create placeholder model
      capybaraModel = createPlaceholderModel();
      capybaraAnimations = [];
      
      // Create fallback animations
      createFallbackAnimations();
      
      // Combine animations
      const allAnimations = Object.values(animationClips).filter(Boolean);
      
      // Create player
      player = new Player(sceneSetup.scene, physicsWorld.world, capybaraModel, allAnimations);
      
      // Set camera position
      sceneSetup.camera.position.set(0, 5, 10);
      
      // Start animation loop
      animate(0);
      
      // Hide loading screen
      const loadingElement = document.getElementById('loading');
      if (loadingElement) {
        loadingElement.style.display = 'none';
        console.log('Loading screen hidden');
      }
    });
  } catch (error) {
    console.error('Error starting game:', error);
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.innerHTML = `<p>Error starting game: ${error.message}</p><p>Please try refreshing the page.</p>`;
    }
  }
}

// Asset paths
const ASSET_PATHS = {
  character: 'assets/character/capybara.glb',
  animations: {
    idle: 'assets/animations/idle.glb',
    walk: 'assets/animations/walk.glb',
    run: 'assets/animations/run.glb',
    jump: 'assets/animations/jump.glb'
  },
  environments: {
    terrain: 'assets/environments/terrain.glb',
    trees: 'assets/environments/trees.glb',
    water: 'assets/environments/water.glb'
  },
  legacy: 'assets/models/capybara.glb'
};

// Create a default placeholder model
function createPlaceholderModel() {
  console.log('Creating placeholder model');
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
  const model = new THREE.Mesh(geometry, material);
  model.castShadow = true;
  model.receiveShadow = true;
  return model;
}

// Create fallback animations
function createFallbackAnimations() {
  console.log('Creating fallback animations');
  
  // Idle animation
  const idleTrack = new THREE.NumberKeyframeTrack(
    '.position[y]',
    [0, 1, 2],
    [0, 0.05, 0]
  );
  animationClips.idle = new THREE.AnimationClip('idle', 2, [idleTrack]);
  
  // Walk animation
  const walkTrack = new THREE.NumberKeyframeTrack(
    '.position[y]',
    [0, 0.25, 0.5, 0.75, 1],
    [0, 0.1, 0, 0.1, 0]
  );
  animationClips.walk = new THREE.AnimationClip('walk', 1, [walkTrack]);
  
  // Jump animation
  const jumpTrack = new THREE.NumberKeyframeTrack(
    '.position[y]',
    [0, 0.5, 1],
    [0, 0.2, 0]
  );
  animationClips.jump = new THREE.AnimationClip('jump', 0.5, [jumpTrack]);
}

// Create a default environment
function createDefaultEnvironment() {
  console.log('Creating default environment');
  // Create a simple ground plane
  const groundGeometry = new THREE.PlaneGeometry(50, 50);
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x7CFC00,
    roughness: 0.8,
    metalness: 0.2
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.receiveShadow = true;
  sceneSetup.scene.add(ground);
  
  // Add a physics collider for the ground
  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(25, 0.1, 25);
  groundColliderDesc.setTranslation(0, -0.1, 0);
  physicsWorld.world.createCollider(groundColliderDesc);
}

// Animation loop
let lastTime = 0;
function animate(time) {
  requestAnimationFrame(animate);
  
  // Calculate delta time in seconds
  const delta = Math.min((time - lastTime) / 1000, 0.1); // Cap at 0.1 to prevent large jumps
  lastTime = time;
  
  if (physicsWorld && player) {
    try {
      // Update physics
      physicsWorld.update();
      
      // Update player
      player.update(delta);
      
      // Update camera to follow the player
      updateCamera();
      
      // Update animation mixer
      if (player.mixer) {
        player.mixer.update(delta);
      }
    } catch (error) {
      console.error('Error in animation loop:', error);
    }
  }
  
  // Render the scene
  if (sceneSetup) {
    sceneSetup.renderer.render(sceneSetup.scene, sceneSetup.camera);
  }
}

// Update camera to follow player
function updateCamera() {
  if (!player || !sceneSetup) return;
  
  // Get player position
  const playerPos = player.container.position;
  
  // Camera follows player with offset
  const cameraTargetPos = new THREE.Vector3(
    playerPos.x,
    playerPos.y + 2, // Camera is 2 units above player
    playerPos.z + 5  // Camera is 5 units behind player
  );
  
  // Smoothly interpolate camera position
  sceneSetup.camera.position.lerp(cameraTargetPos, 0.1);
  
  // Camera looks at player
  sceneSetup.camera.lookAt(
    playerPos.x,
    playerPos.y + 1, // Look at player's head
    playerPos.z
  );
}