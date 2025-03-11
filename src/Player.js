import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';

export class Player {
  constructor(scene, physicsWorld, model, animations) {
    this.scene = scene;
    this.world = physicsWorld;

    // Create a container group to handle rotation
    this.container = new THREE.Group();
    this.scene.add(this.container);

    // Add the model to the container with a 180-degree rotation around Y
    this.mesh = model;
    this.mesh.rotation.y = Math.PI; // Rotate 180 degrees so front (positive Z) aligns with container's negative Z
    
    // Scale the model if needed
    this.mesh.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
    
    // Add the model to the container
    this.container.add(this.mesh);

    // Set initial position
    this.container.position.set(0, 1, 0);

    // Create physics body (keep capsule collider for simplicity)
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1, 0);
    this.body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.5); // Half-height 0.5, radius 0.5
    this.world.createCollider(colliderDesc, this.body);

    // Set up animation mixer
    this.mixer = new THREE.AnimationMixer(this.mesh);
    this.actions = {};
    this.currentAction = null;

    // Process animations
    if (animations && animations.length > 0) {
      this.setupAnimations(animations);
    }

    // Movement properties
    this.moveSpeed = 5;
    this.jumpForce = 5;
    this.keys = { w: false, a: false, s: false, d: false, space: false };
    this.isMoving = false;
    this.isJumping = false;

    // Keyboard event listeners
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  setupAnimations(animations) {
    // Try to identify animations by name
    animations.forEach(clip => {
      if (!clip) return; // Skip null animations
      
      // Store animation by name (lowercase)
      const name = clip.name.toLowerCase();
      this.actions[name] = this.mixer.clipAction(clip);
      
      // Set default properties for all animations
      this.actions[name].setEffectiveTimeScale(1);
      this.actions[name].setEffectiveWeight(1);
      
      // If it's a looping animation like idle, walk, or run
      if (name.includes('idle') || name.includes('walk') || name.includes('run')) {
        this.actions[name].setLoop(THREE.LoopRepeat);
      }
    });
    
    // Create fallback animations if needed
    this.createFallbackAnimations();
    
    // If we have an idle animation, play it by default
    if (this.actions['idle']) {
      this.playAnimation('idle');
    } else if (Object.keys(this.actions).length > 0) {
      // Otherwise play the first animation
      const firstAnimName = Object.keys(this.actions)[0];
      this.playAnimation(firstAnimName);
    }
  }
  
  createFallbackAnimations() {
    // Create fallback animations for essential movements if they don't exist
    
    // Idle animation (small up and down movement)
    if (!this.actions['idle']) {
      const idleTrack = new THREE.NumberKeyframeTrack(
        '.position[y]',
        [0, 1, 2],
        [0, 0.05, 0]
      );
      const idleClip = new THREE.AnimationClip('idle', 2, [idleTrack]);
      this.actions['idle'] = this.mixer.clipAction(idleClip);
      this.actions['idle'].setLoop(THREE.LoopRepeat);
    }
    
    // Walk animation (if missing)
    if (!this.actions['walk'] && !Object.keys(this.actions).some(key => key.includes('walk'))) {
      const walkTrack = new THREE.NumberKeyframeTrack(
        '.position[y]',
        [0, 0.25, 0.5, 0.75, 1],
        [0, 0.1, 0, 0.1, 0]
      );
      const walkClip = new THREE.AnimationClip('walk', 1, [walkTrack]);
      this.actions['walk'] = this.mixer.clipAction(walkClip);
      this.actions['walk'].setLoop(THREE.LoopRepeat);
    }
    
    // Jump animation (if missing)
    if (!this.actions['jump'] && !Object.keys(this.actions).some(key => key.includes('jump'))) {
      const jumpTrack = new THREE.NumberKeyframeTrack(
        '.position[y]',
        [0, 0.5, 1],
        [0, 0.2, 0]
      );
      const jumpClip = new THREE.AnimationClip('jump', 0.5, [jumpTrack]);
      this.actions['jump'] = this.mixer.clipAction(jumpClip);
      this.actions['jump'].setLoop(THREE.LoopOnce);
      this.actions['jump'].clampWhenFinished = true;
    }
  }

  playAnimation(name, crossFadeDuration = 0.3) {
    // Find the animation by name or partial match
    const animationName = Object.keys(this.actions).find(key => 
      key === name || key.includes(name)
    );
    
    if (!animationName) {
      console.warn(`Animation "${name}" not found, using fallback`);
      // Use idle as fallback
      if (this.actions['idle'] && this.currentAction !== this.actions['idle']) {
        this.playAnimation('idle');
      }
      return;
    }
    
    const action = this.actions[animationName];
    
    // Don't do anything if this animation is already playing
    if (this.currentAction === action) return;
    
    // Cross fade to the new animation
    if (this.currentAction) {
      action.reset();
      action.setEffectiveWeight(1);
      action.crossFadeFrom(this.currentAction, crossFadeDuration, true);
    }
    
    this.currentAction = action;
    action.play();
  }

  onKeyDown(e) {
    // Update key state
    if (e.key === 'w' || e.key === 'ArrowUp') this.keys.w = true;
    if (e.key === 'a' || e.key === 'ArrowLeft') this.keys.a = true;
    if (e.key === 's' || e.key === 'ArrowDown') this.keys.s = true;
    if (e.key === 'd' || e.key === 'ArrowRight') this.keys.d = true;
    if (e.key === ' ') this.keys.space = true;
  }

  onKeyUp(e) {
    // Update key state
    if (e.key === 'w' || e.key === 'ArrowUp') this.keys.w = false;
    if (e.key === 'a' || e.key === 'ArrowLeft') this.keys.a = false;
    if (e.key === 's' || e.key === 'ArrowDown') this.keys.s = false;
    if (e.key === 'd' || e.key === 'ArrowRight') this.keys.d = false;
    if (e.key === ' ') this.keys.space = false;
  }

  update(delta) {
    // Store previous state for animation transitions
    const wasMoving = this.isMoving;
    const wasJumping = this.isJumping;
    
    // Reset movement flag
    this.isMoving = false;
    
    // Get current velocity
    const velocity = this.body.linvel();
    
    // Calculate movement direction
    let moveX = 0;
    let moveZ = 0;
    
    if (this.keys.w) moveZ -= 1;
    if (this.keys.s) moveZ += 1;
    if (this.keys.a) moveX -= 1;
    if (this.keys.d) moveX += 1;
    
    // Normalize movement vector if moving diagonally
    if (moveX !== 0 && moveZ !== 0) {
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX /= length;
      moveZ /= length;
    }
    
    // Apply movement if any keys are pressed
    if (moveX !== 0 || moveZ !== 0) {
      this.isMoving = true;
      
      // Rotate the container to face the movement direction
      const angle = Math.atan2(moveX, moveZ);
      this.container.rotation.y = angle;
      
      // Apply movement force
      this.body.setLinvel(
        new RAPIER.Vector3(moveX * this.moveSpeed, velocity.y, moveZ * this.moveSpeed),
        true
      );
    } else {
      // Stop horizontal movement if no keys are pressed
      this.body.setLinvel(new RAPIER.Vector3(0, velocity.y, 0), true);
    }
    
    // Handle jumping
    // Check if on ground (simple check: y velocity close to 0 and y position close to ground)
    const position = this.body.translation();
    const isOnGround = Math.abs(velocity.y) < 0.1 && position.y < 1.1;
    
    if (isOnGround && this.keys.space) {
      // Apply jump impulse
      this.body.applyImpulse(new RAPIER.Vector3(0, this.jumpForce, 0), true);
      this.isJumping = true;
    } else if (isOnGround) {
      this.isJumping = false;
    }
    
    // Update position of the container to match physics body
    const bodyPosition = this.body.translation();
    this.container.position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
    
    // Update animations based on movement state
    this.updateAnimationState(wasMoving, wasJumping);
    
    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }
  
  updateAnimationState(wasMoving, wasJumping) {
    // Determine which animation to play based on movement state
    if (this.isJumping && !wasJumping) {
      // Started jumping
      this.playAnimation('jump');
    } else if (!this.isJumping && wasJumping) {
      // Landed from jump
      if (this.isMoving) {
        this.playAnimation('walk');
      } else {
        this.playAnimation('idle');
      }
    } else if (this.isMoving && !wasMoving) {
      // Started moving
      this.playAnimation('walk');
    } else if (!this.isMoving && wasMoving) {
      // Stopped moving
      this.playAnimation('idle');
    }
  }
}