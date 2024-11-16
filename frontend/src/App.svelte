<script lang="ts">
  import { onMount } from "svelte";
  import invariant from "tiny-invariant";
  import {
    setClientState,
    updateClientState,
    useClientState,
  } from "./clientState";
  import {
    createInitialGameState,
    interpolateGameState,
    renderGameState,
    setServerState,
    useServerState,
    type GameState,
  } from "./gameState";
  import { useInput } from "./inputMap";
  import type { ClientUpdateMessage } from "./websocket";

  export let canvas: HTMLCanvasElement;
  export let health: number = 1;
  export let maxHealth: number = 1;
  onMount(() => {
    invariant(canvas !== null);
    const context = canvas.getContext("2d");
    invariant(context !== null);

    const startTime = Date.now();
    const websocket = new WebSocket("/ws");
    websocket.addEventListener("message", (message) => {
      const serverMessage = JSON.parse(message.data);
      setServerState({
        timeStateReceived: Date.now() - startTime,
        gameState: serverMessage.data.gameState,
      });

      const clientState = useClientState();
      const clientMessage = JSON.stringify({
        type: "update",
        data: {
          x: clientState.x,
          y: clientState.y,
        },
      } satisfies ClientUpdateMessage);
      websocket.send(clientMessage);
    });

    const getAnimationFrameCallback =
      (previousFrameTime: number, gameState: GameState) =>
      (frameTime: number) => {
        const deltaTime = frameTime - previousFrameTime;

        const inputMap = useInput();
        const clientState = useClientState();
        const serverState = useServerState();

        renderGameState(clientState, gameState, context);

        const interpolationTime = Math.sqrt(
          deltaTime / (frameTime - serverState.timeStateReceived)
        );
        const interpolatedGameState = interpolateGameState(
          gameState,
          serverState,
          interpolationTime
        );

        const newClientState = updateClientState(
          clientState,
          gameState,
          inputMap,
          deltaTime
        );
        setClientState(newClientState);
        if (clientState.clientEntityID !== undefined) {
          health = gameState.playerEntities[clientState.clientEntityID].health;
          maxHealth =
            gameState.playerEntities[clientState.clientEntityID].maxHealth;
          console.log(health, maxHealth);
        }
        window.requestAnimationFrame(
          getAnimationFrameCallback(frameTime, interpolatedGameState)
        );
      };
    websocket.addEventListener("open", (event) => {
      window.requestAnimationFrame(
        getAnimationFrameCallback(Date.now(), createInitialGameState())
      );
    });
  });
</script>

<main class="main">
  <div class="container">
    <div class="sidebar">
      <progress class="healthbar" value={health} max={maxHealth} />
    </div>
    <div class="canvas-container">
      <canvas bind:this={canvas} class="canvas" width="1200px" height="600px" />
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
  .healthbar {
    width: 100%;
    height: 1rem;
  }
</style>
