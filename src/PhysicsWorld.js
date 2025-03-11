import * as RAPIER from '@dimforge/rapier3d';

export class PhysicsWorld {
  constructor() {
    // Create a physics world with gravity
    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.world = new RAPIER.World(gravity);
    
    // Create the ground collider
    this.addGroundCollider();
  }
  
  addGroundCollider() {
    // Create a static rigid body for the ground
    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed();
    const groundBody = this.world.createRigidBody(groundBodyDesc);
    
    // Create a collider for the ground (a thin cuboid)
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(50.0, 0.1, 50.0);
    this.world.createCollider(groundColliderDesc, groundBody);
  }
  
  update() {
    // Step the physics simulation
    this.world.step();
  }
  
  // Helper method to create a physics body for an object
  createBody(position, isStatic = false) {
    let bodyDesc;
    
    if (isStatic) {
      bodyDesc = RAPIER.RigidBodyDesc.fixed();
    } else {
      bodyDesc = RAPIER.RigidBodyDesc.dynamic();
    }
    
    bodyDesc.setTranslation(position.x, position.y, position.z);
    return this.world.createRigidBody(bodyDesc);
  }
  
  // Helper method to create a collider for a body
  createCollider(body, shape, size, offset = { x: 0, y: 0, z: 0 }) {
    let colliderDesc;
    
    switch (shape) {
      case 'box':
        colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
        break;
      case 'sphere':
        colliderDesc = RAPIER.ColliderDesc.ball(size.radius);
        break;
      case 'capsule':
        colliderDesc = RAPIER.ColliderDesc.capsule(size.halfHeight, size.radius);
        break;
      default:
        console.error('Unsupported collider shape:', shape);
        return null;
    }
    
    // Set the collider offset if provided
    if (offset) {
      colliderDesc.setTranslation(offset.x, offset.y, offset.z);
    }
    
    return this.world.createCollider(colliderDesc, body);
  }
}