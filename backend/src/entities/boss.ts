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
  createEntity,
  destroyEntity,
  runQuery,
} from "../ecsProvider";
import { addUpdateCallback } from "../update";
import { createProjectile } from "./projectile";

export const BOSS_COMPONENT_DEF = {
  type: "boss",
  detectionRange: 300,
  shootCooldown: 60,
  currentCooldown: 0,
  patternCooldown: 300,
  currentPatternCooldown: 0,
  currentPattern: 0,
  patternStep: 0,
  patternDuration: 90,
  moveDirection: { x: 0, y: 0 },
  moveDuration: 0,
  moveSpeed: 1.5,
  minMoveDuration: 120,
  maxMoveDuration: 240,
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
    createProjectile(createEntity(), x, y, velocityX, velocityY, "boss", 15);
  }
};

const spiralAttack = (x: number, y: number, step: number) => {
  const angle = (step / 20) * Math.PI * 2;
  const velocityX = Math.cos(angle) * 5;
  const velocityY = Math.sin(angle) * 5;
  createProjectile(createEntity(), x, y, velocityX, velocityY, "boss", 20);
};

const randomBurst = (x: number, y: number, bulletCount: number) => {
  for (let i = 0; i < bulletCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocityX = Math.cos(angle) * 5;
    const velocityY = Math.sin(angle) * 5;
    createProjectile(createEntity(), x, y, velocityX, velocityY, "boss", 10);
  }
};

addUpdateCallback(() => {
  runQuery(
    [POSITION_COMPONENT_DEF, BOSS_COMPONENT_DEF],
    (_entity, [position, boss]) => {
      if (boss.moveDuration <= 0) {
        const angle = Math.random() * Math.PI * 2;
        boss.moveDirection.x = Math.cos(angle);
        boss.moveDirection.y = Math.sin(angle);
        boss.moveDuration = Math.floor(
          Math.random() * (boss.maxMoveDuration - boss.minMoveDuration) +
            boss.minMoveDuration,
        );
      }

      position.x += boss.moveDirection.x * boss.moveSpeed;
      position.y += boss.moveDirection.y * boss.moveSpeed;

      const randomX = (Math.random() * 2 - 1) * 0.2;
      const randomY = (Math.random() * 2 - 1) * 0.2;
      position.x += randomX;
      position.y += randomY;

      if (Math.random() < 0.01) {
        const dodgeAngle = Math.random() * Math.PI * 2;
        position.x += Math.cos(dodgeAngle) * 8;
        position.y += Math.sin(dodgeAngle) * 8;
      }

      boss.moveDuration--;

      if (boss.currentCooldown > 0) {
        boss.currentCooldown--;
      }

      const bossX = position.x;
      const bossY = position.y;

      if (boss.currentPattern === 0) {
        if (boss.currentPatternCooldown > 0) {
          boss.currentPatternCooldown--;
        } else {
          boss.currentPattern = Math.floor(Math.random() * 3) + 1;
          boss.patternStep = 0;
          boss.currentPatternCooldown = boss.patternDuration;
        }
      } else {
        if (boss.currentPatternCooldown > 0) {
          boss.currentPatternCooldown--;

          switch (boss.currentPattern) {
            case 1:
              if (boss.patternStep % 20 === 0) {
                circleAttack(bossX, bossY, 6);
              }
              break;
            case 2:
              if (boss.patternStep % 5 === 0) {
                spiralAttack(bossX, bossY, boss.patternStep);
              }
              break;
            case 3:
              if (boss.patternStep % 15 === 0) {
                randomBurst(bossX, bossY, 3);
              }
              break;
          }

          boss.patternStep++;
        } else {
          boss.currentPattern = 0;
          boss.currentPatternCooldown = boss.patternCooldown;
        }
      }
    },
  );
});

addUpdateCallback(() => {
  runQuery(
    [
      POSITION_COMPONENT_DEF,
      CIRCLE_COLLIDER_COMPONENT_DEF,
      HEALTH_COMPONENT_DEF,
      BOSS_COMPONENT_DEF,
    ],
    (bossEntity, [bossPos, bossCollider, bossHealth, _boss]) => {
      runQuery(
        [POSITION_COMPONENT_DEF, PROJECTILE_COMPONENT_DEF],
        (projectileEntity, [projectilePos, projectile]) => {
          if (projectile.source === "boss") return;

          const dx = bossPos.x - projectilePos.x;
          const dy = bossPos.y - projectilePos.y;
          const distanceSquared = dx * dx + dy * dy;
          const combinedRadius = bossCollider.radius + projectile.radius;

          if (distanceSquared <= combinedRadius * combinedRadius) {
            bossHealth.currentHealth = Math.max(
              0,
              bossHealth.currentHealth - projectile.damage,
            );

            destroyEntity(projectileEntity);

            if (bossHealth.currentHealth <= 0) {
              destroyEntity(bossEntity);
            }
          }
        },
      );
    },
  );
});
