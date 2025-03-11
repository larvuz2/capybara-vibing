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
  },
  // Legacy path for backward compatibility
  legacy: 'assets/models/capybara.glb'
};

// Function to load a model with better error handling
function loadModel(path, onLoad, isRequired = false) {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        if (onLoad) onLoad(gltf);
        resolve(gltf);
      },
      (xhr) => {
        // Progress callback not needed as we're using LoadingManager
      },
      (error) => {
        console.warn(`Error loading model from ${path}:`, error);
        if (isRequired) {
          console.error(`Required model ${path} could not be loaded.`);
        } else {
          console.warn(`Optional model ${path} could not be loaded. Continuing without it.`);
        }
        resolve(null); // Resolve with null instead of rejecting to prevent blocking
      }
    );
  });
}

// Load the capybara model (required)
let capybaraModelPromise = loadModel(ASSET_PATHS.character, (gltf) => {
  capybaraModel = gltf.scene;
  capybaraAnimations = gltf.animations;
  
  // Enable shadows for all meshes in the model
  capybaraModel.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}, true);

// Fallback to legacy path if needed
capybaraModelPromise.then((gltf) => {
  if (!gltf) {
    console.warn("Trying legacy capybara model path as fallback...");
    loadModel(ASSET_PATHS.legacy, (gltf) => {
      if (gltf) {
        capybaraModel = gltf.scene;
        capybaraAnimations = gltf.animations;
        
        // Enable shadows for all meshes in the model
        capybaraModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
      } else {
        console.error("Failed to load capybara model from both primary and legacy paths.");
        // Create a simple placeholder cube as a last resort
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        capybaraModel = new THREE.Mesh(geometry, material);
        capybaraModel.castShadow = true;
        capybaraModel.receiveShadow = true;
      }
    }, true);
  }
});

// Load environment assets (optional)
Object.entries(ASSET_PATHS.environments).forEach(([key, path]) => {
  // Try to load environment assets, but don't block game initialization if they fail
  loadModel(path, (gltf) => {
    if (gltf) {
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
    }
  });
});

// Load animation clips (optional)
Object.entries(ASSET_PATHS.animations).forEach(([key, path]) => {
  // Try to load animation assets, but don't block game initialization if they fail
  loadModel(path, (gltf) => {
    if (gltf && gltf.animations && gltf.animations.length > 0) {
      animationClips[key] = gltf.animations[0];
    } else if (key === 'idle' && (!gltf || !gltf.animations || gltf.animations.length === 0)) {
      // For idle animation, create a simple fallback if it's missing
      console.warn("Creating fallback idle animation");
      const track = new THREE.NumberKeyframeTrack(
        '.position[y]',
        [0, 1, 2],
        [0, 0.05, 0]
      );
      animationClips[key] = new THREE.AnimationClip('idle', 2, [track]);
    }
  });
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
      if (model) {
        sceneSetup.scene.add(model);
      }
    });
    
    // Create default environment if no terrain was loaded
    if (!environmentAssets.terrain) {
      console.warn('Creating default terrain because terrain model failed to load');
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
    
    // Create the player with the loaded model and animations
    // If model failed to load, create a placeholder
    if (!capybaraModel) {
      console.warn('Using placeholder model because capybara model failed to load');
      // Create a simple capsule as placeholder
      const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
      const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      capybaraModel = new THREE.Mesh(geometry, material);
      capybaraAnimations = [];
    }
    
    // Ensure we have at least a basic idle animation
    if (!animationClips.idle) {
      console.warn('Creating default idle animation');
      const track = new THREE.NumberKeyframeTrack(
        '.position[y]',
        [0, 1, 2],
        [0, 0.05, 0]
      );
      animationClips.idle = new THREE.AnimationClip('idle', 2, [track]);
    }
    
    // Combine default animations with any separately loaded animation clips
    const allAnimations = [...(capybaraAnimations || []), ...Object.values(animationClips).filter(Boolean)];
    
    // Create the player
    player = new Player(sceneSetup.scene, physicsWorld.world, capybaraModel, allAnimations);
    
    // Initial camera position
    sceneSetup.camera.position.set(0, 5, 10);
    
    // Start the animation loop
    animate(0);
    
  } catch (error) {
    console.error('Error initializing the game:', error);
    // Display error message to user
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.innerHTML = `<p>Error initializing game: ${error.message}</p><p>Please try refreshing the page.</p>`;
    }
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
    
    // Update animation mixer
    if (player.mixer) {
      player.mixer.update(delta);
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