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
  deltaTime: number,
  websocket: WebSocket,
  canvas: HTMLCanvasElement
) => {
  canvas.width;
  const deltaTimeSeconds = deltaTime / 1000;
  const left = inputMap["d"] ? 200 * deltaTimeSeconds : 0;
  const right = inputMap["a"] ? -200 * deltaTimeSeconds : 0;

  const down = inputMap["w"] ? -200 * deltaTimeSeconds : 0;
  const up = inputMap["s"] ? 200 * deltaTimeSeconds : 0;

  if (inputMap["p"]) {
    console.log(inputMap.mousePosition);
    const midX = canvas.width / 2;
    const midY = canvas.height / 2;

    const clientMessage = JSON.stringify({
      type: "ability",
      data: {
        x: clientState.x,
        y: clientState.y,
        radians: Math.atan2(
          inputMap.mousePosition.y - midY,
          inputMap.mousePosition.x - midX
        ),
      },
    } as any);
    websocket.send(clientMessage);
  }

  const newX = clientState.x + left + right;
  const newY = clientState.y + up + down;

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
    x: newX,
    y: newY,
    targetedEntity,
    clientEntityID: Object.keys(gameState.playerEntities)[0],
  };
};
