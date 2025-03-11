# Animation Assets

This directory contains animation files for the Capybara Vibing game.

## Animation Types

The game requires various animations for the capybara character:

1. **Idle Animation** - Default animation when the character is not moving
2. **Walk/Run Animations** - For character movement
3. **Jump Animation** - For jumping action
4. **Special Animations** - For unique actions or "vibing" moments

## Animation Formats

Animations can be stored in several formats:

- As part of GLB/GLTF files (preferred)
- As separate animation files that can be applied to the character
- As JSON files for custom animation systems

## Required Animations

At minimum, the game needs:

- **idle.glb** - A looping idle animation
- **walk.glb** - A walking animation
- **run.glb** - A running animation
- **jump.glb** - A jump animation

## Animation Guidelines

When creating or adding animations:

1. Ensure animations loop smoothly where appropriate (idle, walk, run)
2. Maintain consistent timing and scale with other animations
3. Test animations with the character model to ensure proper rigging
4. Keep animations lightweight for web performance
5. Include metadata about animation duration, loop points, etc.

## Resources for Animations

- [Mixamo](https://www.mixamo.com/) - Free animations that can be retargeted
- [Sketchfab](https://sketchfab.com/) - Many models come with animations
- [CGTrader](https://www.cgtrader.com/) - Marketplace for 3D models with animations
- [Blender](https://www.blender.org/) - Create custom animations