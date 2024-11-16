import { entitySprites } from "./entity";
import { BOUNDS_SIZE } from "./gameConstants";
import { type GameState } from "./gameState";

export type AbilityDefinition = {
  type: string;
  cooldown: number;
};
export type AbilityTracker = {
  timeUsed: number;
};
export type ClientState = {
  x: number;
  y: number;
  targetedEntity: string | undefined;
  clientEntityID: string | undefined;
};
let _clientState: ClientState = {
  x: 0,
  y: 0,
  targetedEntity: undefined,
  clientEntityID: undefined,
};
export const useClientState = () => structuredClone(_clientState);
export const setClientState = (clientState: ClientState) => {
  _clientState = structuredClone(clientState);
};

export const updateClientState = (
  clientState: ClientState,
  gameState: GameState,
  inputMap: any,
  deltaTime: number
) => {
  const deltaTimeSeconds = deltaTime / 1000;
  const left = inputMap["d"] ? 200 * deltaTimeSeconds : 0;
  const right = inputMap["a"] ? -200 * deltaTimeSeconds : 0;

  const down = inputMap["w"] ? -200 * deltaTimeSeconds : 0;
  const up = inputMap["s"] ? 200 * deltaTimeSeconds : 0;

  const newX = clientState.x + left + right;
  const boundedX = newX < 0 ? 0 : newX > BOUNDS_SIZE[0] ? BOUNDS_SIZE[0] : newX;

  const newY = clientState.y + up + down;
  const boundedY = newY < 0 ? 0 : newY > BOUNDS_SIZE[1] ? BOUNDS_SIZE[1] : newY;

  const targetedEntity = inputMap["q"]
    ? Object.entries(gameState.entities).reduce<{
        key: string | undefined;
        distance: number;
      }>(
        (accumulator, [key, entity]) => {
          const distance = Math.sqrt(
            ((entity.x - clientState.x) ^ 2) + ((entity.y - clientState.y) ^ 2)
          );

          if (accumulator.distance < distance) return accumulator;
          return {
            key,
            distance,
          };
        },
        { key: undefined, distance: Number.MAX_SAFE_INTEGER }
      )?.key
    : clientState.targetedEntity;

  return {
    x: boundedX,
    y: boundedY,
    targetedEntity,
    clientEntityID: clientState.clientEntityID,
  };
};

export const drawClientPlayerEntity = (
  context: CanvasRenderingContext2D,
  clientState: ClientState
) => {
  context.fillStyle = "red";
  context.fillText("ID: " + "PLAYER", clientState.x, clientState.y - 5);
  context.drawImage(entitySprites.littleGuy, clientState.x, clientState.y);
};
