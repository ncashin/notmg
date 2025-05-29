import {
  CIRCLE_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../../core/collision";
import type { Entity } from "../../core/ecs";
import { HEALTH_COMPONENT_DEF, SPRITE_COMPONENT_DEF } from "../../core/game";
import {
  addComponent,
  addUpdateCallback,
  createEntity,
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
    maxHealth: 100,
    currentHealth: 100,
  });
};

const circleAttack = (x: number, y: number, bulletCount: number) => {
  for (let i = 0; i < bulletCount; i++) {
    const angle = (i / bulletCount) * Math.PI * 2;
    const velocityX = Math.cos(angle) * 5;
    const velocityY = Math.sin(angle) * 5;
    createProjectile(createEntity(), x, y, velocityX, velocityY, "boss");
  }
};

const spiralAttack = (x: number, y: number, step: number) => {
  const angle = (step / 20) * Math.PI * 2;
  const velocityX = Math.cos(angle) * 5;
  const velocityY = Math.sin(angle) * 5;
  createProjectile(createEntity(), x, y, velocityX, velocityY, "boss");
};

const randomBurst = (x: number, y: number, bulletCount: number) => {
  for (let i = 0; i < bulletCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocityX = Math.cos(angle) * 5;
    const velocityY = Math.sin(angle) * 5;
    createProjectile(createEntity(), x, y, velocityX, velocityY, "boss");
  }
};

addUpdateCallback(() => {
  runQuery(
    [POSITION_COMPONENT_DEF, BOSS_COMPONENT_DEF],
    (_entity, [position, boss]) => {
      const randomX = (Math.random() * 2 - 1) * 3;
      const randomY = (Math.random() * 2 - 1) * 3;

      position.x += randomX;
      position.y += randomY;

      if (Math.random() < 0.05) {
        position.x += randomX * 5;
        position.y += randomY * 5;
      }

      if (Math.random() < 0.1) {
        const angle = Math.random() * Math.PI * 2;
        position.x += Math.cos(angle) * 8;
        position.y += Math.sin(angle) * 8;
      }

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
