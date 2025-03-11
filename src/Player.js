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

    // Set up idle animation
    if (animations && animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.mesh);
      this.idleAction = this.mixer.clipAction(animations[0]); // Assume first animation is idle
      this.idleAction.play();
    }

    // Movement properties
    this.moveSpeed = 5;
    this.jumpForce = 5;
    this.keys = { w: false, a: false, s: false, d: false, space: false };

    // Keyboard event listeners
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
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
    // Update animation
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

    // Rotate container to face movement direction
    if (movement.length() > 0) {
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
    }

    // Sync container position with physics body
    const position = this.body.translation();
    this.container.position.set(position.x, position.y, position.z);
  }
}