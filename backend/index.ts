import type { ServerWebSocket } from "bun";
import invariant from "tiny-invariant";
import {
  AABB_COLLIDER_COMPONENT_DEF,
  CIRCLE_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
  circleCollision,
} from "../core/collision";
import {
  type Component,
  type Entity,
  provideECSInstanceFunctions,
} from "../core/ecs";
import {
  HEALTH_COMPONENT_DEF,
  PROJECTILE_COMPONENT_DEF,
  SPRITE_COMPONENT_DEF,
} from "../core/game";
import type { Packet } from "../core/network";
import { mergeDeep } from "../core/objectMerge";
import type {
  ClientMessage,
  MoveMessage,
  ShootMessage,
} from "../core/socketMessage";

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

const clientMessageHandlers = {
  move: (websocket: ServerWebSocket<WebSocketData>, message: ClientMessage) => {
    invariant(message.type === "move");
    const position = getComponent(
      websocket.data.entity,
      POSITION_COMPONENT_DEF,
    );
    if (!position) return;
    position.x = message.x;
    position.y = message.y;
  },
  shoot: (
    websocket: ServerWebSocket<WebSocketData>,
    message: ClientMessage,
  ) => {
    invariant(message.type === "shoot");
    playerShoot(websocket.data.entity, message.targetX, message.targetY);
  },
};

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
  source: "player" | "boss" = "player", // Default to player for backward compatibility
) => {
  addComponent(entity, { ...POSITION_COMPONENT_DEF, x, y });
  addComponent(entity, {
    ...PROJECTILE_COMPONENT_DEF,
    velocityX,
    velocityY,
    source,
  });
  addComponent(entity, { ...CIRCLE_COLLIDER_COMPONENT_DEF, radius: 10 });
};

// Add a function to handle player shooting
export const playerShoot = (
  playerEntity: Entity,
  targetX: number,
  targetY: number,
) => {
  const position = getComponent(playerEntity, POSITION_COMPONENT_DEF);
  if (!position) return;

  // Calculate direction vector from player to target
  const dirX = targetX - position.x;
  const dirY = targetY - position.y;

  // Normalize the direction vector
  const length = Math.sqrt(dirX * dirX + dirY * dirY);
  const normalizedDirX = dirX / length;
  const normalizedDirY = dirY / length;

  // Set projectile speed
  const projectileSpeed = 10;
  const velocityX = normalizedDirX * projectileSpeed;
  const velocityY = normalizedDirY * projectileSpeed;

  // Create projectile entity
  const projectileEntity = createEntity();

  // Position the projectile slightly away from the player in the shooting direction
  const spawnDistance = 40; // Distance from player center
  const spawnX = position.x + normalizedDirX * spawnDistance;
  const spawnY = position.y + normalizedDirY * spawnDistance;

  // Create the projectile with calculated properties - explicitly set source as "player"
  createProjectile(
    projectileEntity,
    spawnX,
    spawnY,
    velocityX,
    velocityY,
    "player",
  );

  // Add sprite component to visualize the projectile
  addComponent(projectileEntity, {
    ...SPRITE_COMPONENT_DEF,
    imageSrc: "/projectile.svg",
    size: 20,
  });
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

      try {
        // Parse and validate message using Zod
        const parsedMessage = JSON.parse(message);
        const clientMessage = parsedMessage as ClientMessage;

        if (clientMessage && clientMessage.type in clientMessageHandlers) {
          // Call the appropriate handler based on message type
          clientMessageHandlers[
            clientMessage.type as keyof typeof clientMessageHandlers
          ](websocket, clientMessage);
        } else {
          console.error("Unknown or invalid message:", parsedMessage);
        }
      } catch (error) {
        console.error("Error processing client message:", error);
      }
    },
    close(websocket) {
      destroyEntity(websocket.data.entity);
    },
  },
});

createBossEntity(createEntity());

const update = () => {
  // Check for player projectile collisions with the boss
  runQuery(
    [
      POSITION_COMPONENT_DEF,
      PROJECTILE_COMPONENT_DEF,
      CIRCLE_COLLIDER_COMPONENT_DEF,
    ],
    (
      projectileEntity,
      [projectilePosition, projectile, projectileCollider],
    ) => {
      // Only process player projectiles for boss collisions
      if (projectile.source !== "player") return;

      // Check collision with boss entities
      runQuery(
        [
          POSITION_COMPONENT_DEF,
          CIRCLE_COLLIDER_COMPONENT_DEF,
          HEALTH_COMPONENT_DEF,
          BOSS_COMPONENT_DEF,
        ],
        (_bossEntity, [bossPosition, bossCollider, bossHealth, _boss]) => {
          // Use Pythagorean theorem to check for collision between circles
          if (
            circleCollision(
              projectilePosition.x,
              projectilePosition.y,
              projectileCollider.radius,
              bossPosition.x,
              bossPosition.y,
              bossCollider.radius,
            )
          ) {
            // Collision detected! Deal 1 damage to the boss
            bossHealth.currentHealth -= 1;
            console.log(
              `Boss hit! Health: ${bossHealth.currentHealth}/${bossHealth.maxHealth}`,
            );

            // Destroy the projectile
            destroyEntity(projectileEntity);

            // Check if boss is defeated
            if (bossHealth.currentHealth <= 0) {
              console.log("Boss defeated!");
              // You could add more effects or rewards here
            }
          }
        },
      );
    },
  );

  // Check for boss projectile collisions with players
  runQuery(
    [
      POSITION_COMPONENT_DEF,
      PROJECTILE_COMPONENT_DEF,
      CIRCLE_COLLIDER_COMPONENT_DEF,
    ],
    (
      projectileEntity,
      [projectilePosition, projectile, projectileCollider],
    ) => {
      // Only process boss projectiles for player collisions
      if (projectile.source !== "boss") return;

      // Check collision with player entities
      runQuery(
        [POSITION_COMPONENT_DEF, CIRCLE_COLLIDER_COMPONENT_DEF],
        (playerEntity, [playerPosition, playerCollider]) => {
          // Skip if this entity is a boss (we only want to check players)
          const isBoss = getComponent(playerEntity, BOSS_COMPONENT_DEF);
          if (isBoss) return;

          // Use Pythagorean theorem to check for collision between circles
          if (
            circleCollision(
              projectilePosition.x,
              projectilePosition.y,
              projectileCollider.radius,
              playerPosition.x,
              playerPosition.y,
              playerCollider.radius,
            )
          ) {
            console.log("Player hit by boss projectile!");
            // For now we just destroy the projectile
            // In the future, you could add player health and damage
            destroyEntity(projectileEntity);
          }
        },
      );
    },
  );

  runQuery(
    [POSITION_COMPONENT_DEF, PROJECTILE_COMPONENT_DEF],
    (entity, [position, projectile]) => {
      // Update projectile position
      position.x += projectile.velocityX;
      position.y += projectile.velocityY;

      // Increment lifetime counter
      projectile.currentLifetime++;

      // Destroy projectile if lifetime expired
      if (projectile.currentLifetime >= projectile.lifetime) {
        destroyEntity(entity);
      }
    },
  );

  runQuery(
    [POSITION_COMPONENT_DEF, BOSS_COMPONENT_DEF],
    (_entity, [position, boss]) => {
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
      if (boss.currentCooldown > 0) {
        boss.currentCooldown--;
      }

      // Boss position
      const bossX = position.x;
      const bossY = position.y;

      // Handle attack patterns
      if (boss.currentPattern === 0) {
        // If no pattern is active, decrease pattern cooldown
        if (boss.currentPatternCooldown > 0) {
          boss.currentPatternCooldown--;
        } else {
          // Start a new pattern
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

  sendUpdatePacket();
};

setInterval(update, 1000 / 60);

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

console.log(`WebSocket server listening on port ${server.port}`);
