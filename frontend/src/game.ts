export type PlayerEntity = {
  x: number;
  y: number;
};
export type Entity = {
  type: string;
  x: number;
  y: number;
  maxHealth: number;
  health: number;
};
export type ClientState = {
  x: number;
  y: number;
  targetedEntity: number | undefined;
  clientEntityID: string | undefined;
};
export type GameState = {
  playerEntities: Record<string, Entity>;
  entities: Record<string, Entity>;

  projectiles: Record<string, Projectile>;
};
export type ServerState = {
  timeStateReceived: number;
  gameState: GameState;
};

export type Projectile = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  collisionRadius: number;
};
import ghoulURL from "../public/ghoul.png";
import leviathanURL from "../public/leviathan.png";
import littleGuyURL from "../public/notmglittleguy.png";

const loadSprite = (x: number, y: number, url: string) => {
  let imageElement = new Image(x, y);
  imageElement.src = url;
  return imageElement;
};

export const entitySprites = {
  littleGuy: loadSprite(32, 32, littleGuyURL),
  ghoul: loadSprite(32, 32, ghoulURL),
  leviathan: loadSprite(128, 128, leviathanURL),
};

export const interpolatePlayer = (
  entity: Entity,
  serverEntity: Entity,
  interpolationTime: number
) => ({
  ...entity,
  x: entity.x + (serverEntity.x - entity.x) * interpolationTime,
  y: entity.y + (serverEntity.y - entity.y) * interpolationTime,
});
export const interpolateEntity = (
  entity: Entity,
  serverEntity: Entity,
  interpolationTime: number
) => ({
  ...serverEntity,
  x: entity.x + (serverEntity.x - entity.x) * interpolationTime,
  y: entity.y + (serverEntity.y - entity.y) * interpolationTime,
});

export const interpolateProjectile = (
  projectile: Projectile,
  serverProjectile: Projectile,
  interpolationTime: number
) => ({
  ...serverProjectile,
  x: projectile.x + (serverProjectile.x - projectile.x) * interpolationTime,
  y: projectile.y + (serverProjectile.y - projectile.y) * interpolationTime,
});

export const interpolateGameState = (
  gameState: GameState,
  serverState: ServerState,
  interpolationTime: number
) => {
  const playerEntities = Object.entries(
    serverState.gameState.playerEntities
  ).reduce((accumulator, [key, value]) => {
    if (gameState.playerEntities[key] === undefined) {
      return {
        ...accumulator,
        [key]: value,
      };
    }

    return {
      ...accumulator,
      [key]: interpolatePlayer(
        gameState.playerEntities[key],
        value,
        interpolationTime
      ),
    };
  }, {});
  const entities = Object.entries(serverState.gameState.entities).reduce(
    (accumulator, [key, value]) => {
      if (gameState.entities[key] === undefined) {
        return {
          ...accumulator,
          [key]: value,
        };
      }

      return {
        ...accumulator,
        [key]: interpolateEntity(
          gameState.entities[key],
          value,
          interpolationTime
        ),
      };
    },
    {}
  );

  const projectiles = Object.entries(serverState.gameState.projectiles).reduce(
    (accumulator, [key, value]) => {
      if (gameState.projectiles[key] === undefined) {
        return {
          ...accumulator,
          [key]: value,
        };
      }

      return {
        ...accumulator,
        [key]: interpolateProjectile(
          gameState.projectiles[key],
          value,
          interpolationTime
        ),
      };
    },
    {}
  );

  return {
    playerEntities,
    entities,

    projectiles,
  } satisfies GameState;
};

export const renderGameState = (
  clientState: ClientState,
  gameState: GameState,
  context: CanvasRenderingContext2D
) => {
  context.fillStyle = "black";
  context.clearRect(0, 0, 900, 600);
  context.fillStyle = "red";
  Object.entries(gameState.playerEntities).forEach(([id, player], index) => {
    if (id === clientState.clientEntityID) return;
    context.fillText("ID: " + index, player.x, player.y - 5);
    context.drawImage(entitySprites.littleGuy, player.x, player.y);
  });
  Object.values(gameState.entities).forEach((entity, index) => {
    if (index === clientState.targetedEntity) {
      context.fillStyle = "red";
      context.fillRect(entity.x, entity.y, 48, 48);
    }
    context.drawImage(entitySprites[entity.type], entity.x, entity.y);
    context.fillStyle = "blue";
    context.fillRect(entity.x, entity.y, 32, 5);
    context.fillStyle = "green";
    context.fillRect(
      entity.x,
      entity.y,
      Math.floor(32 * (entity.health / entity.maxHealth)),
      5
    );
  });
  Object.values(gameState.projectiles).forEach((projectile, index) => {
    context.fillStyle = "yellow";
    context.fillRect(projectile.x, projectile.y, 32, 32);
  });

  context.fillStyle = "red";
  context.fillText("ID: " + "PLAYER", clientState.x, clientState.y - 5);
  context.drawImage(entitySprites.littleGuy, clientState.x, clientState.y);
};
