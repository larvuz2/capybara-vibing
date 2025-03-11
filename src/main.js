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
let environmentAssets = {};
let animationClips = {};

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
  }
};

// Function to load a model
function loadModel(path, onLoad) {
  loader.load(
    path,
    onLoad,
    (xhr) => {
      // Progress callback not needed as we're using LoadingManager
    },
    (error) => {
      console.error(`Error loading model from ${path}:`, error);
    }
  );
}

// Preload the capybara model
loadModel(ASSET_PATHS.character, (gltf) => {
  capybaraModel = gltf.scene;
  capybaraAnimations = gltf.animations;
  
  // Enable shadows for all meshes in the model
  capybaraModel.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
});

// Load environment assets (optional)
Object.entries(ASSET_PATHS.environments).forEach(([key, path]) => {
  // Try to load environment assets, but don't block game initialization if they fail
  try {
    loadModel(path, (gltf) => {
      environmentAssets[key] = gltf.scene;
      
      // Enable shadows for all meshes in the environment
      environmentAssets[key].traverse((child) => {
        if (child.isMesh) {
          child.receiveShadow = true;
          child.castShadow = true;
        }
      });
      
      // Add to scene if it's already created
      if (sceneSetup) {
        sceneSetup.scene.add(environmentAssets[key]);
      }
    });
  } catch (error) {
    console.warn(`Environment asset ${key} could not be loaded. This is non-critical.`);
  }
});

// Load animation clips (optional)
Object.entries(ASSET_PATHS.animations).forEach(([key, path]) => {
  // Try to load animation assets, but don't block game initialization if they fail
  try {
    loadModel(path, (gltf) => {
      if (gltf.animations && gltf.animations.length > 0) {
        animationClips[key] = gltf.animations[0];
      }
    });
  } catch (error) {
    console.warn(`Animation ${key} could not be loaded. This is non-critical.`);
  }
});

async function init() {
  try {
    // Initialize Rapier physics
    await RAPIER.init();
    
    // Set up scene and physics
    sceneSetup = new SceneSetup();
    physicsWorld = new PhysicsWorld();
    
    // Add any loaded environment assets to the scene
    Object.values(environmentAssets).forEach(model => {
      sceneSetup.scene.add(model);
    });
    
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
    
    // Combine default animations with any separately loaded animation clips
    const allAnimations = [...(capybaraAnimations || []), ...Object.values(animationClips)];
    
    // Create the player
    player = new Player(sceneSetup.scene, physicsWorld.world, capybaraModel, allAnimations);
    
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