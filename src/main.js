import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SceneSetup } from './SceneSetup.js';
import { PhysicsWorld } from './PhysicsWorld.js';
import { Player } from './Player.js';

// Loading manager to track loading progress
const loadingManager = new THREE.LoadingManager(
  // onLoad callback
  () => {
    // Hide loading screen when everything is loaded
    document.getElementById('loading').style.display = 'none';
    // Start the game
    init();
  },
  // onProgress callback
  (url, itemsLoaded, itemsTotal) => {
    const progress = (itemsLoaded / itemsTotal * 100).toFixed(0);
    document.getElementById('loading').querySelector('p').textContent = 
      `Loading... ${progress}%`;
  }
);

// Create a GLTFLoader with the loading manager
const loader = new GLTFLoader(loadingManager);

// Global variables
let sceneSetup, physicsWorld, player;
let capybaraModel, capybaraAnimations;

// Preload the capybara model
loader.load(
  'assets/models/capybara.glb',
  (gltf) => {
    capybaraModel = gltf.scene;
    capybaraAnimations = gltf.animations;
    
    // Enable shadows for all meshes in the model
    capybaraModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  },
  (xhr) => {
    // This callback is not needed as we're using LoadingManager
  },
  (error) => {
    console.error('An error happened loading the capybara model:', error);
    // Show error on loading screen
    document.getElementById('loading').querySelector('p').textContent = 
      'Error loading model. Please refresh the page.';
  }
);

async function init() {
  try {
    // Initialize Rapier physics
    await RAPIER.init();
    
    // Set up scene and physics
    sceneSetup = new SceneSetup();
    physicsWorld = new PhysicsWorld();
    
    // Create the player with the loaded model and animations
    // If model failed to load, create a placeholder
    if (!capybaraModel) {
      console.warn('Using placeholder model because capybara.glb failed to load');
      // Create a simple capsule as placeholder
      const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
      const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      capybaraModel = new THREE.Mesh(geometry, material);
      capybaraAnimations = [];
    }
    
    // Create the player
    player = new Player(sceneSetup.scene, physicsWorld.world, capybaraModel, capybaraAnimations);
    
    // Initial camera position
    sceneSetup.camera.position.set(0, 5, 10);
    
    // Start the animation loop
    animate(0);
    
  } catch (error) {
    console.error('Error initializing the game:', error);
  }
}

// Animation loop
let lastTime = 0;
function animate(time) {
  requestAnimationFrame(animate);
  
  // Calculate delta time in seconds
  const delta = Math.min((time - lastTime) / 1000, 0.1); // Cap at 0.1 to prevent large jumps
  lastTime = time;
  
  if (physicsWorld && player) {
    // Update physics
    physicsWorld.update();
    
    // Update player
    player.update(delta);
    
    // Update camera to follow the player
    updateCamera();
  }
  
  // Render the scene
  if (sceneSetup) {
    sceneSetup.renderer.render(sceneSetup.scene, sceneSetup.camera);
  }
}

// Third-person camera that follows the player
function updateCamera() {
  const playerPosition = player.container.position;
  
  // Get the direction the player is facing
  const forward = new THREE.Vector3();
  player.container.getWorldDirection(forward);
  
  // Calculate the position behind the player
  const backward = forward.clone().negate();
  const cameraOffset = backward.multiplyScalar(5).add(new THREE.Vector3(0, 2, 0));
  
  // Set camera position and look at the player
  sceneSetup.camera.position.copy(playerPosition).add(cameraOffset);
  sceneSetup.camera.lookAt(playerPosition);
}