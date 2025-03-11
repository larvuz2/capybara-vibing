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
    
    // If we have an idle animation, play it by default
    if (this.actions['idle']) {
      this.playAnimation('idle');
    } else if (animations.length > 0) {
      // Otherwise play the first animation
      const firstAnimName = animations[0].name.toLowerCase();
      this.playAnimation(firstAnimName);
    }
  }

  playAnimation(name, crossFadeDuration = 0.3) {
    // Find the animation by name or partial match
    const animationName = Object.keys(this.actions).find(key => 
      key === name || key.includes(name)
    );
    
    if (!animationName) {
      console.warn(`Animation "${name}" not found`);
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
    
    action.play();
    this.currentAction = action;
  }

  onKeyDown(e) {
    switch (e.key.toLowerCase()) {
      case 'w': this.keys.w = true; break;
      case 'a': this.keys.a = true; break;
      case 's': this.keys.s = true; break;
      case 'd': this.keys.d = true; break;
      case ' ': this.keys.space = true; break;
    }
  }

  onKeyUp(e) {
    switch (e.key.toLowerCase()) {
      case 'w': this.keys.w = false; break;
      case 'a': this.keys.a = false; break;
      case 's': this.keys.s = false; break;
      case 'd': this.keys.d = false; break;
      case ' ': this.keys.space = false; break;
    }
  }

  update(delta) {
    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(delta);
    }

    const velocity = this.body.linvel();
    let movement = new THREE.Vector3();

    // WASD movement
    if (this.keys.w) movement.z -= 1;
    if (this.keys.s) movement.z += 1;
    if (this.keys.a) movement.x -= 1;
    if (this.keys.d) movement.x += 1;

    // Check if player is moving
    const wasMoving = this.isMoving;
    this.isMoving = movement.length() > 0;
    
    // Check if player is jumping
    const wasJumping = this.isJumping;
    this.isJumping = Math.abs(velocity.y) > 0.5;
    
    // Update animations based on movement state
    this.updateAnimationState(wasMoving, wasJumping);

    // Rotate container to face movement direction
    if (this.isMoving) {
      movement.normalize().multiplyScalar(this.moveSpeed);
      const direction = movement.clone().normalize();
      const lookAtPosition = this.container.position.clone().add(direction);
      this.container.lookAt(lookAtPosition);
    }

    // Apply movement to physics body
    this.body.setLinvel({ x: movement.x, y: velocity.y, z: movement.z }, true);

    // Jump (only if on ground)
    if (this.keys.space && Math.abs(velocity.y) < 0.1) {
      this.body.applyImpulse({ x: 0, y: this.jumpForce, z: 0 }, true);
      this.keys.space = false;
      
      // Play jump animation if available
      if (this.actions['jump']) {
        this.playAnimation('jump');
      }
    }

    // Sync container position with physics body
    const position = this.body.translation();
    this.container.position.set(position.x, position.y, position.z);
  }
  
  updateAnimationState(wasMoving, wasJumping) {
    // Only change animations if state changed
    if (!this.actions) return;
    
    // Handle jumping animation
    if (this.isJumping && !wasJumping) {
      if (this.actions['jump']) {
        this.playAnimation('jump');
      }
      return;
    }
    
    // Handle landing from jump
    if (!this.isJumping && wasJumping) {
      if (this.isMoving) {
        // If moving when landing, play walk/run
        if (this.actions['run']) {
          this.playAnimation('run');
        } else if (this.actions['walk']) {
          this.playAnimation('walk');
        }
      } else {
        // If standing still when landing, play idle
        if (this.actions['idle']) {
          this.playAnimation('idle');
        }
      }
      return;
    }
    
    // Handle movement animations
    if (this.isMoving && !wasMoving) {
      // Started moving
      if (this.actions['run']) {
        this.playAnimation('run');
      } else if (this.actions['walk']) {
        this.playAnimation('walk');
      }
    } else if (!this.isMoving && wasMoving) {
      // Stopped moving
      if (this.actions['idle']) {
        this.playAnimation('idle');
      }
    }
  }
}