import type { ServerWebSocket } from "bun";
import {
  AABB_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../core/collision";
import {
  type Component,
  type Entity,
  provideECSInstanceFunctions,
} from "../core/ecs";
import { PROJECTILE_COMPONENT_DEF, SPRITE_COMPONENT_DEF } from "../core/game";
import type { Packet } from "../core/network";
import { mergeDeep } from "../core/objectMerge";

type WebSocketData = {
  entity: number;
};
const connectedSockets: Array<ServerWebSocket<WebSocketData>> = [];

const catchupPacket: Packet = {};
let updatePacket: Packet = {};

const sendUpdatePacket = () => {
  for (const socket of connectedSockets) {
    socket.send(
      JSON.stringify({
        type: "update",
        packet: updatePacket,
      }),
    );
  }
  mergeDeep(catchupPacket, updatePacket);
  updatePacket = {};
};

export const {
  ecsInstance,

  createEntity,
  destroyEntity,

  addComponent,
  removeComponent,

  getComponent,
  queryComponents,

  runQuery,
} = provideECSInstanceFunctions({
  addComponentCallback: (entity, component) => {
    if (updatePacket[entity] === undefined || updatePacket[entity] === null) {
      updatePacket[entity] = {};
    }
    updatePacket[entity][component.type] = component;
  },
  removeComponentCallback: (entity, component) => {
    if (updatePacket[entity] === undefined || updatePacket[entity] === null) {
      updatePacket[entity] = {};
    }
    updatePacket[entity][component.type] = null;
  },

  destroyEntityCallback: (entity) => {
    updatePacket[entity] = null;
  },

  componentProxyHandler: {
    set: (entity, component, property, newValue) => {
      if (updatePacket[entity] === undefined || updatePacket[entity] === null) {
        updatePacket[entity] = {};
      }
      if (
        updatePacket[entity][component.type] === undefined ||
        updatePacket[entity][component.type] === null
      ) {
        updatePacket[entity][component.type] = {} as Component;
      }

      (updatePacket[entity][component.type] as Component)[property] = newValue;
      component[property] = newValue;
      return true;
    },
  },
});

export const createPlayerEntity = (entity: Entity) => {
  addComponent(entity, POSITION_COMPONENT_DEF);
  addComponent(entity, VELOCITY_COMPONENT_DEF);
  addComponent(entity, AABB_COLLIDER_COMPONENT_DEF);
  addComponent(entity, {
    ...SPRITE_COMPONENT_DEF,
    imageSrc: "/female.svg",
    size: 80,
  });
};

export const createProjectile = (
  entity: Entity,
  x: number,
  y: number,
  velocityX: number,
  velocityY: number,
) => {
  addComponent(entity, { ...POSITION_COMPONENT_DEF, x, y });
  addComponent(entity, { ...PROJECTILE_COMPONENT_DEF, velocityX, velocityY });
  // addComponent(entity, AABB_COLLIDER_COMPONENT_DEF);
};

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
  addComponent(entity, AABB_COLLIDER_COMPONENT_DEF);
  addComponent(entity, BOSS_COMPONENT_DEF);
  addComponent(entity, { ...SPRITE_COMPONENT_DEF, imageSrc: "/boss.png" });
};

const server = Bun.serve<WebSocketData, undefined>({
  port: 3000,
  fetch(req, server) {
    if (
      server.upgrade(req, {
        data: {
          entity: createEntity(),
        },
      })
    ) {
      return;
    }
    return new Response("Upgrade failed", { status: 500 });
  },
  websocket: {
    open(websocket) {
      websocket.send(
        JSON.stringify({
          type: "initialization",
          playerEntity: websocket.data.entity,
          catchupPacket: catchupPacket,
        }),
      );
      connectedSockets.push(websocket);
      createPlayerEntity(websocket.data.entity);
    },
    message(websocket, message) {
      if (typeof message !== "string") return;
      const [x, y] = message.split(" ").map(Number.parseFloat);
      const position = getComponent(
        websocket.data.entity,
        POSITION_COMPONENT_DEF,
      );
      position.x = x;
      position.y = y;
    },
    close(websocket) {
      destroyEntity(websocket.data.entity);
    },
  },
});

createBossEntity(createEntity());

setInterval(() => {
  runQuery(
    [POSITION_COMPONENT_DEF, PROJECTILE_COMPONENT_DEF],
    (entity, [position, projectile]) => {
      // Update projectile position
      position.x += projectile.velocityX;
      position.y += projectile.velocityY;

      // Increment lifetime counter
      projectile.lifetime--;

      // Destroy projectile if lifetime expired
      if (projectile.lifetime <= 0) {
        destroyEntity(entity);
      }
    },
  );

  runQuery(
    [POSITION_COMPONENT_DEF, BOSS_COMPONENT_DEF],
    (_entity, [position, _boss]) => {
      // Generate random movement between -3 and 3
      const randomX = (Math.random() * 2 - 1) * 3;
      const randomY = (Math.random() * 2 - 1) * 3;

      // Apply random movement to position with occasional larger jumps
      position.x += randomX;
      position.y += randomY;

      // Occasionally make a bigger movement (like a dash)
      if (Math.random() < 0.05) {
        position.x += randomX * 5;
        position.y += randomY * 5;
      }

      // Sometimes move in a specific direction for a more purposeful movement
      if (Math.random() < 0.1) {
        const angle = Math.random() * Math.PI * 2;
        position.x += Math.cos(angle) * 8;
        position.y += Math.sin(angle) * 8;
      }

      // Decrease cooldown counter each frame if it's greater than 0
      if (_boss.currentCooldown > 0) {
        _boss.currentCooldown--;
      }

      // Boss position
      const bossX = position.x;
      const bossY = position.y;

      // Handle attack patterns
      if (_boss.currentPattern === 0) {
        // If no pattern is active, decrease pattern cooldown
        if (_boss.currentPatternCooldown > 0) {
          _boss.currentPatternCooldown--;
        } else {
          // Start a new pattern
          _boss.currentPattern = Math.floor(Math.random() * 3) + 1; // 1-3
          _boss.patternStep = 0;
          _boss.currentPatternCooldown = _boss.patternDuration;
        }
      } else {
        // Pattern is active
        if (_boss.currentPatternCooldown > 0) {
          _boss.currentPatternCooldown--;

          // Execute the current pattern
          switch (_boss.currentPattern) {
            case 1:
              // Circle pattern - shoot bullets in a circle
              if (_boss.patternStep % 20 === 0) {
                // Every 20 frames (increased from 10)
                circleAttack(bossX, bossY, 6); // 6 bullets in a circle (reduced from 12)
              }
              break;
            case 2:
              // Spiral pattern - shoot bullets in a spiral
              if (_boss.patternStep % 10 === 0) {
                // Every 10 frames (increased from 5)
                spiralAttack(bossX, bossY, _boss.patternStep);
              }
              break;
            case 3:
              // Random burst pattern - shoot bullets in random directions
              if (_boss.patternStep % 30 === 0) {
                // Every 30 frames (increased from 15)
                randomBurst(bossX, bossY, 4); // 4 bullets in random directions (reduced from 8)
              }
              break;
          }

          _boss.patternStep++;
        } else {
          // Pattern finished, reset and set cooldown
          _boss.currentPattern = 0;
          _boss.patternStep = 0;
          _boss.currentPatternCooldown = _boss.patternCooldown;
        }
      }

      // Normal targeting attack - Find players close to the boss
      if (_boss.currentCooldown === 0) {
        runQuery([POSITION_COMPONENT_DEF], (playerEntity, [playerPosition]) => {
          // Skip if this is not a player entity
          if (playerEntity === _entity) return;

          // Calculate distance to player
          const dx = playerPosition.x - bossX;
          const dy = playerPosition.y - bossY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // If player is within range and cooldown is ready, shoot a projectile
          if (distance < _boss.detectionRange) {
            // Calculate direction to player
            const angle = Math.atan2(dy, dx);
            const speed = 5;
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;

            // Create a projectile aimed at the player
            createProjectile(
              createEntity(),
              bossX,
              bossY,
              velocityX,
              velocityY,
            );

            // Reset the cooldown
            _boss.currentCooldown = _boss.shootCooldown;
          }
        });
      }
    },
  );

  sendUpdatePacket();
}, 16);

console.log(`WebSocket server listening on port ${server.port}`);

// Helper functions for boss attack patterns
const circleAttack = (x: number, y: number, bulletCount: number) => {
  for (let i = 0; i < bulletCount; i++) {
    const angle = (i / bulletCount) * Math.PI * 2;
    const speed = 3;
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;
    createProjectile(createEntity(), x, y, velocityX, velocityY);
  }
};

const spiralAttack = (x: number, y: number, step: number) => {
  const angle = step * 0.2; // Rotation speed
  const speed = 4;
  const velocityX = Math.cos(angle) * speed;
  const velocityY = Math.sin(angle) * speed;
  createProjectile(createEntity(), x, y, velocityX, velocityY);
};

const randomBurst = (x: number, y: number, bulletCount: number) => {
  for (let i = 0; i < bulletCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 2; // Random speed between 2-4 (reduced from 2-5)
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;
    createProjectile(createEntity(), x, y, velocityX, velocityY);
  }
};
