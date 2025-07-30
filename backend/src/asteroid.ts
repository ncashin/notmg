import { BASE_ENTITY_COMPONENT_DEF, ASTEROID_COMPONENT_DEF, Vector2 } from "core";
import { addComponent, createEntity } from "./ecsProvider";

// World boundaries for asteroid spawning
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const ASTEROID_COUNT = 100;
const MAX_ASTEROID_SPEED = 30;

// Helper to generate a random convex polygon (asteroid shape)
// This algorithm ensures convexity by generating points in sorted angle order
// and then slightly perturbing the radii, but not enough to allow self-intersection.
function generateRandomConvexPolygon(
  pointCount: number = 8,
  minRadius: number = 20,
  maxRadius: number = 60
): Vector2[] {
  // Generate sorted angles
  const angles = Array.from({ length: pointCount }, (_, i) => (i / pointCount) * Math.PI * 2);
  // Shuffle the angles slightly to avoid perfect regularity, but keep order for convexity
  for (let i = 0; i < angles.length; i++) {
    angles[i] += (Math.random() - 0.5) * (Math.PI * 2 / pointCount) * 0.3; // small perturbation
  }
  // Ensure angles are sorted to maintain convexity
  angles.sort((a, b) => a - b);

  // Generate radii with small random variation, but not enough to cause concavity
  const radii = Array.from({ length: pointCount }, () => {
    const base = (minRadius + maxRadius) / 2;
    const variation = (maxRadius - minRadius) * 0.4; // keep variation small
    return base + (Math.random() - 0.5) * variation;
  });

  // Convert polar to cartesian
  return angles.map((angle, i) => 
    Vector2.fromPolar(angle, radii[i])
  );
}

export const spawnAsteroid = (position?: Vector2, velocity?: Vector2) => {
  const asteroidEntity = createEntity();

  // Generate random velocity if not provided
  let finalVelocity = velocity;
  if (!velocity) {
    // Random direction and speed
    const speed = Math.random() * MAX_ASTEROID_SPEED;
    const direction = Math.random() * Math.PI * 2;
    finalVelocity = Vector2.fromPolar(direction, speed);
  }

  // Generate random position if not provided
  let finalPosition = position;
  if (!position) {
    finalPosition = new Vector2(
      (Math.random() - 0.5) * WORLD_WIDTH,
      (Math.random() - 0.5) * WORLD_HEIGHT
    );
  }

  // Generate random convex polygon points for the asteroid shape
  const points = generateRandomConvexPolygon(
    8 + Math.floor(Math.random() * 5), // 8-12 points
    20,
    60
  );

  // Add base entity component with position and velocity
  addComponent(asteroidEntity, {
    ...BASE_ENTITY_COMPONENT_DEF,
    position: finalPosition!,
    velocity: finalVelocity!,
    angle: Math.random() * Math.PI * 2,
  });

  // Add asteroid component for rendering, with randomized points
  addComponent(asteroidEntity, {
    ...ASTEROID_COMPONENT_DEF,
    points,
  });

  return asteroidEntity;
};

export const spawnAsteroidsAroundWorld = () => {
  console.log(`Spawning ${ASTEROID_COUNT} asteroids around the world...`);
  
  for (let i = 0; i < ASTEROID_COUNT; i++) {
    spawnAsteroid();
  }
  
  console.log(`Successfully spawned ${ASTEROID_COUNT} asteroids!`);
};

// Spawn asteroids when the server starts
spawnAsteroidsAroundWorld();
