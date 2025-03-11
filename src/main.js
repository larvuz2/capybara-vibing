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

// Debug flag to track loading state
let gameInitialized = false;
let modelsLoaded = false;

// Initialize the game immediately without waiting for model loading
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded event fired');
  try {
    // Show loading screen
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'block';
      loadingElement.querySelector('p').textContent = 'Initializing game...';
      console.log('Loading screen displayed');
    } else {
      console.error('Loading element not found');
    }
    
    // Initialize the game first
    await initGame();
    gameInitialized = true;
    console.log('Game initialized successfully');
    
    // Hide loading screen immediately after game init
    if (loadingElement) {
      loadingElement.style.display = 'none';
      console.log('Loading screen hidden after game init');
    }
    
    // Then load models asynchronously
    loadModels().then(() => {
      modelsLoaded = true;
      console.log('Models loaded successfully');
    }).catch(error => {
      console.error('Error loading models:', error);
    });
  } catch (error) {
    console.error('Error during game startup:', error);
    // Show error message
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.innerHTML = `<p>Error starting game: ${error.message}</p><p>Please try refreshing the page.</p>`;
    }
  }
});

// Ensure loading screen is hidden after a timeout (failsafe)
setTimeout(() => {
  const loadingElement = document.getElementById('loading');
  if (loadingElement && loadingElement.style.display !== 'none') {
    console.warn('Forcing loading screen to hide after timeout');
    loadingElement.style.display = 'none';
  }
}, 5000); // 5 second timeout

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

// Create a default placeholder model
function createPlaceholderModel() {
  console.warn('Creating placeholder capybara model');
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
  const model = new THREE.Mesh(geometry, material);
  model.castShadow = true;
  model.receiveShadow = true;
  return model;
}

// Create fallback animations
function createFallbackAnimations() {
  // Idle animation (small up and down movement)
  if (!animationClips.idle) {
    console.warn('Creating default idle animation');
    const track = new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 1, 2],
      [0, 0.05, 0]
    );
    animationClips.idle = new THREE.AnimationClip('idle', 2, [track]);
  }
  
  // Walk animation (if missing)
  if (!animationClips.walk) {
    console.warn('Creating default walk animation');
    const walkTrack = new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 0.25, 0.5, 0.75, 1],
      [0, 0.1, 0, 0.1, 0]
    );
    animationClips.walk = new THREE.AnimationClip('walk', 1, [walkTrack]);
  }
  
  // Jump animation (if missing)
  if (!animationClips.jump) {
    console.warn('Creating default jump animation');
    const jumpTrack = new THREE.NumberKeyframeTrack(
      '.position[y]',
      [0, 0.5, 1],
      [0, 0.2, 0]
    );
    animationClips.jump = new THREE.AnimationClip('jump', 0.5, [jumpTrack]);
  }
}

// Initialize the game without waiting for models
async function initGame() {
  try {
    console.log('Initializing game...');
    // Initialize Rapier physics
    await RAPIER.init();
    console.log('Rapier physics initialized');
    
    // Set up scene and physics
    sceneSetup = new SceneSetup();
    physicsWorld = new PhysicsWorld();
    console.log('Scene and physics set up');
    
    // Create default environment
    createDefaultEnvironment();
    console.log('Default environment created');
    
    // Create a placeholder model to start with
    capybaraModel = createPlaceholderModel();
    capybaraAnimations = [];
    console.log('Placeholder model created');
    
    // Create fallback animations
    createFallbackAnimations();
    console.log('Fallback animations created');
    
    // Combine default animations
    const allAnimations = Object.values(animationClips).filter(Boolean);
    
    // Create the player
    player = new Player(sceneSetup.scene, physicsWorld.world, capybaraModel, allAnimations);
    console.log('Player created');
    
    // Initial camera position
    sceneSetup.camera.position.set(0, 5, 10);
    
    // Start the animation loop
    animate(0);
    console.log('Animation loop started');
    
    return true;
  } catch (error) {
    console.error('Error initializing the game:', error);
    throw error;
  }
}

// Create a default environment
function createDefaultEnvironment() {
  console.warn('Creating default terrain');
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

// Load models asynchronously after the game has started
async function loadModels() {
  try {
    console.log('Starting to load models...');
    // Create a loader - use the imported GLTFLoader, not THREE.GLTFLoader
    const loader = new GLTFLoader();
    
    // Function to load a model with error handling
    const loadModel = (path) => {
      return new Promise((resolve) => {
        try {
          console.log(`Loading model from ${path}...`);
          loader.load(
            path,
            (gltf) => {
              console.log(`Successfully loaded model from ${path}`);
              resolve(gltf);
            },
            (progress) => {
              // Optional progress callback
              if (progress.lengthComputable) {
                const percentComplete = (progress.loaded / progress.total) * 100;
                console.log(`${path} loading: ${percentComplete.toFixed(2)}%`);
              }
            },
            (error) => {
              console.warn(`Error loading model from ${path}:`, error);
              console.warn(`Optional model ${path} could not be loaded. Continuing without it.`);
              resolve(null);
            }
          );
        } catch (error) {
          console.error(`Exception trying to load ${path}:`, error);
          resolve(null);
        }
      });
    };
    
    // Try to load the capybara model
    console.log('Attempting to load capybara model from primary path');
    let gltf = await loadModel(ASSET_PATHS.character);
    
    // If primary path fails, try legacy path
    if (!gltf || !gltf.scene) {
      console.warn("Trying legacy capybara model path as fallback...");
      gltf = await loadModel(ASSET_PATHS.legacy);
    }
    
    // If we successfully loaded a model, replace the placeholder
    if (gltf && gltf.scene) {
      console.log('Successfully loaded capybara model, replacing placeholder');
      // Remove the old model from the scene
      if (player && player.mesh) {
        player.container.remove(player.mesh);
      }
      
      // Set up the new model
      capybaraModel = gltf.scene;
      capybaraAnimations = gltf.animations || [];
      
      // Enable shadows for all meshes in the model
      capybaraModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      // Update the player with the new model
      if (player) {
        // Scale and rotate the model
        capybaraModel.scale.set(0.5, 0.5, 0.5);
        capybaraModel.rotation.y = Math.PI;
        
        // Add to the player container
        player.mesh = capybaraModel;
        player.container.add(capybaraModel);
        
        // Update animations
        if (capybaraAnimations.length > 0) {
          // Create a new mixer for the model
          player.mixer = new THREE.AnimationMixer(capybaraModel);
          
          // Add the animations
          capybaraAnimations.forEach(clip => {
            const name = clip.name.toLowerCase();
            player.actions[name] = player.mixer.clipAction(clip);
            player.actions[name].setEffectiveTimeScale(1);
            player.actions[name].setEffectiveWeight(1);
            
            if (name.includes('idle') || name.includes('walk') || name.includes('run')) {
              player.actions[name].setLoop(THREE.LoopRepeat);
            }
          });
          
          // Play idle animation if available
          if (player.actions['idle']) {
            player.playAnimation('idle');
          }
        }
      }
    } else {
      console.warn('Failed to load capybara model from both paths, using placeholder');
    }
    
    // Load environment assets
    console.log('Loading environment assets...');
    const environmentPromises = Object.entries(ASSET_PATHS.environments).map(async ([key, path]) => {
      const envGltf = await loadModel(path);
      if (envGltf && envGltf.scene) {
        environmentAssets[key] = envGltf.scene;
        
        // Enable shadows for all meshes in the environment
        environmentAssets[key].traverse((child) => {
          if (child.isMesh) {
            child.receiveShadow = true;
            child.castShadow = true;
          }
        });
        
        // Add to scene
        if (sceneSetup) {
          sceneSetup.scene.add(environmentAssets[key]);
        }
      }
    });
    
    // Load animation clips
    console.log('Loading animation clips...');
    const animationPromises = Object.entries(ASSET_PATHS.animations).map(async ([key, path]) => {
      const animGltf = await loadModel(path);
      if (animGltf && animGltf.animations && animGltf.animations.length > 0) {
        animationClips[key] = animGltf.animations[0];
        
        // Add to player if it exists
        if (player && player.mixer) {
          const name = animGltf.animations[0].name.toLowerCase();
          player.actions[name] = player.mixer.clipAction(animGltf.animations[0]);
          player.actions[name].setEffectiveTimeScale(1);
          player.actions[name].setEffectiveWeight(1);
          
          if (name.includes('idle') || name.includes('walk') || name.includes('run')) {
            player.actions[name].setLoop(THREE.LoopRepeat);
          }
        }
      }
    });
    
    // Wait for all assets to load
    await Promise.all([...environmentPromises, ...animationPromises]);
    
    console.log('All models loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading models:', error);
    return false;
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