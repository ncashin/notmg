<script lang="ts">
  import { onMount } from "svelte";
  import invariant from "tiny-invariant";
  import {
    createInitialGameState,
    interpolateGameState,
    renderGameState,
    type ClientState,
    type GameState,
  } from "./game";

  export let canvas: HTMLCanvasElement;

  let inputMap: any = {};
  document.addEventListener("keydown", (event) => {
    inputMap[event.key] = true;
  });
  document.addEventListener("keyup", (event) => {
    inputMap[event.key] = false;
  });

  let clientControlledState: ClientState = {
    x: 0,
    y: 0,
    targetedEntity: undefined,
    clientEntityID: undefined,
  };

  const updateClientState = (
    client: ClientState,
    gameState: GameState,
    inputMap: any
  ) => {
    return {
      x: inputMap["d"] ? client.x + 5 : inputMap["a"] ? client.x - 5 : client.x,
      y: inputMap["s"] ? client.y + 5 : inputMap["w"] ? client.y - 5 : client.y,
      targetedEntity: inputMap["q"]
        ? Object.values(gameState.entities).reduce(
            (accumulator, entity, index) => {
              const distance = Math.sqrt(
                ((entity.x - client.x) ^ 2) + ((entity.y - client.y) ^ 2)
              );

              return accumulator.distance < distance
                ? accumulator
                : {
                    index,
                    distance,
                  };
            },
            { index: 0, distance: Number.MAX_SAFE_INTEGER }
          ).index
        : client.targetedEntity,
      clientEntityID: client.clientEntityID,
    };
  };
  let clientGameState = createInitialGameState();
  let serverState = {
    timeStateReceived: Date.now(),
    gameState: createInitialGameState(),
  };
  onMount(() => {
    invariant(canvas !== null);
    const context = canvas.getContext("2d");
    invariant(context !== null);

    const websocket = new WebSocket("/ws");
    websocket.addEventListener("message", (message) => {
      const serverMessage = JSON.parse(message.data);
      switch (serverMessage.type) {
        case "connect":
          serverState.gameState.playerEntities[serverMessage.data.id] = {
            x: 0,
            y: 0,
          };
          clientGameState.playerEntities[serverMessage.data.id] = {
            x: 0,
            y: 0,
          };
          break;
        case "disconnect":
          delete clientGameState.playerEntities[serverMessage.data.id];
          delete serverState.gameState.playerEntities[serverMessage.data.id];
          break;

        case "initialize":
          serverState = {
            timeStateReceived: Date.now(),
            gameState: serverMessage.data.gameState,
          };
          clientGameState = structuredClone(serverMessage.data.gameState);
          clientControlledState.clientEntityID =
            serverMessage.data.clientEntityID;
          break;

        case "update":
          serverState = {
            timeStateReceived: Date.now(),
            gameState: serverMessage.data.gameState,
          };
          break;
      }
      const clientMessage = JSON.stringify(clientControlledState);
      websocket.send(clientMessage);
    });

    const getAnimationFrameCallback =
      (previousFrameTime: number, clientTime: number) =>
      (frameTime: number) => {
        const deltaTime = frameTime - previousFrameTime;

        clientControlledState = updateClientState(
          clientControlledState,
          clientGameState,
          inputMap
        );
        const interpTime = Math.sqrt(
          deltaTime / (clientTime - serverState.timeStateReceived)
        );
        clientGameState = interpolateGameState(
          clientGameState,
          serverState.gameState,
          Number.isNaN(interpTime) ? 0 : interpTime
        );

        renderGameState(clientControlledState, clientGameState, context);

        window.requestAnimationFrame(
          getAnimationFrameCallback(frameTime, clientTime + deltaTime)
        );
      };
    websocket.addEventListener("open", (event) => {
      window.requestAnimationFrame(getAnimationFrameCallback(0, Date.now()));
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
