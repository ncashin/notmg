import {
  CIRCLE_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../../../core/collision";
import type { Entity } from "../../../core/ecs";
import {
  HEALTH_COMPONENT_DEF,
  PROJECTILE_COMPONENT_DEF,
  SPRITE_COMPONENT_DEF,
} from "../../../core/game";
import {
  addComponent,
  addUpdateCallback,
  createEntity,
  destroyEntity,
  runQuery,
} from "../ecsProvider";
import { createProjectile } from "./projectile";

export const BOSS_COMPONENT_DEF = {
  type: "boss",
  detectionRange: 300, // Detection range for players
  shootCooldown: 60, // Frames between shots (increased from 30)
  currentCooldown: 0, // Current cooldown counter
  patternCooldown: 300, // Frames between special attack patterns (increased from 180)
  currentPatternCooldown: 0, // Current pattern cooldown counter
  currentPattern: 0, // Current attack pattern (0: none, 1: circle, 2: spiral, 3: random burst)
  patternStep: 0, // Current step in the pattern
  patternDuration: 90, // How long pattern lasts (reduced from 120)
  // New movement properties
  moveDirection: { x: 0, y: 0 }, // Current movement direction
  moveDuration: 0, // Frames remaining in current direction
  moveSpeed: 1.5, // Reduced base movement speed (was 4)
  minMoveDuration: 120, // Increased minimum duration (was 30)
  maxMoveDuration: 240, // Increased maximum duration (was 90)
};

export const createBossEntity = (entity: Entity) => {
  addComponent(entity, { ...POSITION_COMPONENT_DEF, x: 1000, y: 500 });
  addComponent(entity, VELOCITY_COMPONENT_DEF);
  addComponent(entity, { ...CIRCLE_COLLIDER_COMPONENT_DEF, radius: 64 });
  addComponent(entity, BOSS_COMPONENT_DEF);
  addComponent(entity, {
    ...SPRITE_COMPONENT_DEF,
    imageSrc: "/boss.png",
    size: 128,
  });
  addComponent(entity, {
    ...HEALTH_COMPONENT_DEF,
    maxHealth: 500,
    currentHealth: 500,
  });
};

const circleAttack = (x: number, y: number, bulletCount: number) => {
  for (let i = 0; i < bulletCount; i++) {
    const angle = (i / bulletCount) * Math.PI * 2;
    const velocityX = Math.cos(angle) * 5;
    const velocityY = Math.sin(angle) * 5;
    createProjectile(createEntity(), x, y, velocityX, velocityY, "boss", 15); // Circle attack does more damage
  }
};

const spiralAttack = (x: number, y: number, step: number) => {
  const angle = (step / 20) * Math.PI * 2;
  const velocityX = Math.cos(angle) * 5;
  const velocityY = Math.sin(angle) * 5;
  createProjectile(createEntity(), x, y, velocityX, velocityY, "boss", 20); // Spiral attack does the most damage
};

const randomBurst = (x: number, y: number, bulletCount: number) => {
  for (let i = 0; i < bulletCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocityX = Math.cos(angle) * 5;
    const velocityY = Math.sin(angle) * 5;
    createProjectile(createEntity(), x, y, velocityX, velocityY, "boss", 10); // Random burst does less damage
  }
};

addUpdateCallback(() => {
  runQuery(
    [POSITION_COMPONENT_DEF, BOSS_COMPONENT_DEF],
    (_entity, [position, boss]) => {
      // Update movement direction if needed
      if (boss.moveDuration <= 0) {
        // Pick a new random direction
        const angle = Math.random() * Math.PI * 2;
        boss.moveDirection.x = Math.cos(angle);
        boss.moveDirection.y = Math.sin(angle);
        boss.moveDuration = Math.floor(
          Math.random() * (boss.maxMoveDuration - boss.minMoveDuration) +
            boss.minMoveDuration,
        );
      }

      // Apply movement in current direction
      position.x += boss.moveDirection.x * boss.moveSpeed;
      position.y += boss.moveDirection.y * boss.moveSpeed;

      // Add very slight random variation to movement
      const randomX = (Math.random() * 2 - 1) * 0.2; // Reduced from 0.5
      const randomY = (Math.random() * 2 - 1) * 0.2; // Reduced from 0.5
      position.x += randomX;
      position.y += randomY;

      // Less frequent dodges
      if (Math.random() < 0.01) {
        // Reduced from 0.02
        const dodgeAngle = Math.random() * Math.PI * 2;
        position.x += Math.cos(dodgeAngle) * 8; // Reduced from 12
        position.y += Math.sin(dodgeAngle) * 8; // Reduced from 12
      }

      boss.moveDuration--;

      // Rest of the existing boss logic
      if (boss.currentCooldown > 0) {
        boss.currentCooldown--;
      }

      const bossX = position.x;
      const bossY = position.y;

      if (boss.currentPattern === 0) {
        if (boss.currentPatternCooldown > 0) {
          boss.currentPatternCooldown--;
        } else {
          boss.currentPattern = Math.floor(Math.random() * 3) + 1; // 1-3
          boss.patternStep = 0;
          boss.currentPatternCooldown = boss.patternDuration;
        }
      } else {
        // Pattern is active
        if (boss.currentPatternCooldown > 0) {
          boss.currentPatternCooldown--;

          // Execute the current pattern
          switch (boss.currentPattern) {
            case 1:
              // Circle pattern - shoot bullets in a circle
              if (boss.patternStep % 20 === 0) {
                // Every 20 frames (increased from 10)
                circleAttack(bossX, bossY, 6); // 6 bullets in a circle (reduced from 12)
              }
              break;
            case 2:
              // Spiral pattern - shoot bullets in a spiral
              if (boss.patternStep % 5 === 0) {
                // Every 5 frames
                spiralAttack(bossX, bossY, boss.patternStep);
              }
              break;
            case 3:
              // Random burst pattern - shoot bullets in random directions
              if (boss.patternStep % 15 === 0) {
                // Every 15 frames
                randomBurst(bossX, bossY, 3); // 3 bullets per burst (reduced from 5)
              }
              break;
          }

          boss.patternStep++;
        } else {
          // Pattern is complete, reset
          boss.currentPattern = 0;
          boss.currentPatternCooldown = boss.patternCooldown;
        }
      }
    },
  );
});

// Add collision handling for boss-projectile collisions
addUpdateCallback(() => {
  runQuery(
    [
      POSITION_COMPONENT_DEF,
      CIRCLE_COLLIDER_COMPONENT_DEF,
      HEALTH_COMPONENT_DEF,
      BOSS_COMPONENT_DEF,
    ],
    (bossEntity, [bossPos, bossCollider, bossHealth, _boss]) => {
      // Get all projectiles that could be colliding with the boss
      runQuery(
        [POSITION_COMPONENT_DEF, PROJECTILE_COMPONENT_DEF],
        (projectileEntity, [projectilePos, projectile]) => {
          // Skip projectiles created by the boss
          if (projectile.source === "boss") return;

          // Check for collision using circle collision
          const dx = bossPos.x - projectilePos.x;
          const dy = bossPos.y - projectilePos.y;
          const distanceSquared = dx * dx + dy * dy;
          const combinedRadius = bossCollider.radius + projectile.radius;

          if (distanceSquared <= combinedRadius * combinedRadius) {
            // Boss takes damage
            bossHealth.currentHealth = Math.max(
              0,
              bossHealth.currentHealth - projectile.damage,
            );

            // Destroy the projectile
            destroyEntity(projectileEntity);

            // If boss health reaches 0, destroy the boss entity
            if (bossHealth.currentHealth <= 0) {
              destroyEntity(bossEntity);
            }
          }
        },
      );
    },
  );
});
