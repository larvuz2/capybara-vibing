# Capybara Vibing

A 3D game featuring a capybara with physics-based character controls using Three.js and Rapier.js.

![Capybara Vibing](https://github.com/larvuz2/capybara-vibing/raw/main/screenshot.png)

## Features

- 3D capybara character with idle animation
- Physics-based movement using Rapier.js
- Third-person camera that follows the character
- WASD movement and space to jump
- Simple grassy environment

## Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/larvuz2/capybara-vibing.git
   cd capybara-vibing
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Add your 3D assets:
   - **Character**: Place your capybara model in `assets/character/capybara.glb`
   - **Animations**: Add animation files to `assets/animations/` (idle.glb, walk.glb, etc.)
   - **Environments**: Add environment models to `assets/environments/` (terrain.glb, trees.glb, etc.)
   
   If you don't have models, the game will use simple placeholders.

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Controls

- **W**: Move forward
- **A**: Move left
- **S**: Move backward
- **D**: Move right
- **Space**: Jump

## Building for Production

To build the project for production:

```
npm run build
```

The built files will be in the `dist/` directory.

## Project Structure

```
capybara-vibing/
├── assets/
│   ├── character/     # Character models
│   │   └── capybara.glb
│   ├── animations/    # Animation files
│   │   ├── idle.glb
│   │   ├── walk.glb
│   │   ├── run.glb
│   │   └── jump.glb
│   ├── environments/  # Environment models
│   │   ├── terrain.glb
│   │   └── trees.glb
│   └── models/        # Legacy directory (for backward compatibility)
├── src/
│   ├── SceneSetup.js   # Three.js scene, camera, and renderer setup
│   ├── PhysicsWorld.js # Rapier.js physics world setup
│   ├── Player.js       # Capybara character controller
│   └── main.js         # Main application entry point
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Asset Guidelines

### Character Model
- The capybara model should be properly rigged for animation
- Forward direction should be along the positive Z-axis
- Recommended scale: 1-2 units in height

### Animations
- Idle animation: A looping animation for when the character is stationary
- Walk/Run animations: For character movement
- Jump animation: For the jumping action
- All animations should be properly rigged to the character model

### Environment Assets
- Terrain models should be properly scaled to match the game world
- Optimize meshes and textures for web performance

## Technologies Used

- [Three.js](https://threejs.org/) - 3D graphics library
- [Rapier.js](https://rapier.rs/javascript3d/) - Physics engine
- [Vite](https://vitejs.dev/) - Frontend build tool

## License

MIT

## Acknowledgements

- This project was created as a demonstration of integrating 3D models with physics-based character controllers.
- Special thanks to the Three.js and Rapier.js communities for their excellent documentation and examples.