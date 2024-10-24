<script lang="ts">
  import { onMount } from "svelte";
  import invariant from "tiny-invariant";
  import {
    interpolateGameState,
    renderGameState,
    type ClientState,
    type GameState,
    type ServerState,
  } from "./game";
  import type {
    ClientAbilityMessage,
    ClientUpdateMessage,
  } from "./socketEvent";

  export let canvas: HTMLCanvasElement;

  let _inputMap: any = {};
  document.addEventListener("keydown", (event) => {
    _inputMap[event.key] = true;
  });
  document.addEventListener("keyup", (event) => {
    _inputMap[event.key] = false;
  });
  const useInput = () => structuredClone(_inputMap);

  let _clientState: ClientState = {
    x: 0,
    y: 0,
    targetedEntity: undefined,
    clientEntityID: undefined,
  };
  const useClientState = () => structuredClone(_clientState);
  const setClientState = (newClientState: ClientState) => {
    _clientState = structuredClone(newClientState);
  };

  let _serverState = {
    timeStateReceived: Date.now(),
    gameState: {
      playerEntities: {},
      entities: {},

      projectiles: {},
    },
  };
  const useServerState = () => structuredClone(_serverState);
  const setServerState = (newServerState: ServerState) => {
    _serverState = structuredClone(newServerState);
  };

  let _gameState = {
    playerEntities: {},
    entities: {},

    projectiles: {},
  };
  const useGameState = () => structuredClone(_gameState);
  const setGameState = (newGameState: GameState) => {
    _gameState = structuredClone(newGameState);
  };

  const updateClientState = (
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

    const targetedEntity = inputMap["q"]
      ? Object.values(gameState.entities).reduce<{
          index: number | undefined;
          distance: number;
        }>(
          (accumulator, entity, index) => {
            const distance = Math.sqrt(
              ((entity.x - clientState.x) ^ 2) +
                ((entity.y - clientState.y) ^ 2)
            );

            if (accumulator.distance < distance) return accumulator;
            return {
              index,
              distance,
            };
          },
          { index: undefined, distance: Number.MAX_SAFE_INTEGER }
        )?.index
      : clientState.targetedEntity;

    return {
      x: clientState.x + left + right,
      y: clientState.y + up + down,
      targetedEntity,
      clientEntityID: clientState.clientEntityID,
    };
  };
  onMount(() => {
    invariant(canvas !== null);
    const context = canvas.getContext("2d");
    invariant(context !== null);

    const websocket = new WebSocket("/ws");
    websocket.addEventListener("message", (message) => {
      const clientState = useClientState();

      const serverMessage = JSON.parse(message.data);
      switch (serverMessage.type) {
        case "initialize":
          setServerState({
            timeStateReceived: Date.now(),
            gameState: serverMessage.data.gameState,
          });
          setClientState({
            ...clientState,
            clientEntityID: serverMessage.data.clientEntityID,
          });
          break;

        case "update":
          setServerState({
            timeStateReceived: Date.now(),
            gameState: serverMessage.data.gameState,
          });
          break;

        default:
          break;
      }

      const clientMessage = JSON.stringify({
        type: "update",
        data: {
          x: clientState.x,
          y: clientState.y,
        },
      } satisfies ClientUpdateMessage);
      websocket.send(clientMessage);
    });

    const ATTACK_COOLDOWN = 1000;
    const getAnimationFrameCallback =
      (previousFrameTime: number, clientTime: number, attackTime: number) =>
      (frameTime: number) => {
        const deltaTime = frameTime - previousFrameTime;

        const inputMap = useInput();
        const clientState = useClientState();
        const attack =
          inputMap["e"] &&
          clientState.targetedEntity !== undefined &&
          clientTime - attackTime > ATTACK_COOLDOWN;
        const newAttackTime = attack ? Date.now() : attackTime;
        if (attack) {
          websocket.send(
            JSON.stringify({
              type: "ability",
              data: {
                entityID: clientState.targetedEntity,
              },
            } satisfies ClientAbilityMessage)
          );
        }
        const gameState = useGameState();
        const serverState = useServerState();

        renderGameState(clientState, gameState, context);

        const interpolationTime = Math.sqrt(
          deltaTime / (clientTime - serverState.timeStateReceived)
        );
        const interpolatedGameState = interpolateGameState(
          gameState,
          serverState,
          Number.isNaN(interpolationTime) ? 0 : interpolationTime
        );
        setGameState(interpolatedGameState);

        const newClientState = updateClientState(
          clientState,
          gameState,
          inputMap,
          deltaTime
        );
        setClientState(newClientState);
        window.requestAnimationFrame(
          getAnimationFrameCallback(
            frameTime,
            clientTime + deltaTime,
            newAttackTime
          )
        );
      };
    websocket.addEventListener("open", (event) => {
      window.requestAnimationFrame(getAnimationFrameCallback(0, Date.now(), 0));
    });
  });
</script>

<main class="main">
  <div class="container">
    <div class="sidebar"></div>
    <div class="canvas-container">
      <canvas bind:this={canvas} class="canvas" width="900px" height="600px" />
    </div>
  </div>
</main>

<style>
  .main {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
  }
  .container {
    flex-grow: 1;

    display: flex;
    flex-direction: row;
    padding: 1rem;
    gap: 1rem;
  }
  .sidebar {
    flex-basis: 15rem;
    min-width: 15rem;
    border: 2px solid rgb(255, 255, 255);
    height: 100%;
  }
  .canvas-container {
    border: 2px solid rgb(255, 255, 255);
    flex-grow: 1;
    align-content: center;
    justify-content: center;
    background-color: rgb(48, 48, 48);
  }
  .canvas {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
</style>
