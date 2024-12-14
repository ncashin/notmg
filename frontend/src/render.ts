import type { ClientState } from "./clientState";
import { entitySprites, type Entity } from "./entity";
import type { GameState } from "./gameState";
import { type PlayerEntity } from "./playerEntity";

export const drawEntity = (
  context: CanvasRenderingContext2D,
  entity: Entity,
  offsetX: number,
  offsetY: number
) => {
  context.drawImage(
    entitySprites[entity.type],
    entity.x - offsetX - entitySprites[entity.type].width / 2,
    entity.y - offsetY - entitySprites[entity.type].height / 2
  );
};

const drawCollisioRadius = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
) => {
  context.strokeStyle = "red";
  context.fillStyle = "white";
  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI);
  context.fill();
  context.stroke();
};

export const drawPlayerEntity = (
  context: CanvasRenderingContext2D,
  playerEntity: PlayerEntity,
  offsetX: number,
  offsetY: number
) => {
  context.fillText("ID: ", playerEntity.x - offsetX, playerEntity.y - offsetY);
  context.drawImage(
    entitySprites.littleGuy,
    playerEntity.x - offsetX - entitySprites.littleGuy.width,
    playerEntity.y - offsetY - entitySprites.littleGuy.height
  );

  if (playerEntity.invulnerabilityTime > 0) {
    context.globalAlpha = playerEntity.invulnerabilityTime / 200;
    context.globalCompositeOperation = "source-atop";
    context.fillStyle = "red";
    context.fillRect(
      playerEntity.x - offsetX - entitySprites.littleGuy.width,
      playerEntity.y - offsetY - entitySprites.littleGuy.height,
      120,
      120
    );
  }
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";

  drawCollisioRadius(
    context,
    playerEntity.x - offsetX,
    playerEntity.y - offsetY,
    playerEntity.collisionRadius
  );
};
export const drawClientPlayerEntity = (
  context: CanvasRenderingContext2D,
  clientState: ClientState,
  offsetX: number,
  offsetY: number
) => {
  context.fillStyle = "red";
  context.fillText(
    "ID: " + "PLAYER",
    clientState.x - 16 - offsetX,
    clientState.y - 20 - offsetY
  );
  context.drawImage(
    entitySprites.littleGuy,
    clientState.x - offsetX - entitySprites.littleGuy.width,
    clientState.y - offsetY - entitySprites.littleGuy.height
  );
};

export const drawGameState = (
  clientState: ClientState,
  gameState: GameState,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D
) => {
  const offsetX = clientState.x - canvas.width / 2;
  const offsetY = clientState.y - canvas.height / 2.5;
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "red";
  Object.entries(gameState.playerEntities).forEach(([id, player]) => {
    if (id === clientState.clientEntityID) return;
    drawPlayerEntity(context, player, offsetX, offsetY);
  });
  Object.entries(gameState.entities).forEach(([key, entity]) => {
    if (key === clientState.targetedEntity) {
      context.fillStyle = "red";
      context.fillRect(entity.x - offsetX, entity.y - offsetY, 48, 48);
    }
    drawEntity(context, entity, offsetX, offsetY);
  });
  Object.entries(gameState.projectiles).forEach(([key, projectile]) => {
    drawCollisioRadius(
      context,
      projectile.x - offsetX,
      projectile.y - offsetY,
      projectile.collisionRadius
    );
  });
  drawClientPlayerEntity(context, clientState, offsetX, offsetY);
};
