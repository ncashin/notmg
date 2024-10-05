<script lang="ts">
  import { onMount } from "svelte";
  import invariant from "tiny-invariant";
  import {
    createInitialGameState,
    renderGameState,
    type ControlledEntity,
    type Entity,
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

  let playerEntity = {
    x: 0,
    y: 0,
  };
  const updatePlayer = (player: ControlledEntity, inputMap: any) => {
    return {
      x: inputMap["d"] ? player.x + 5 : inputMap["a"] ? player.x - 5 : player.x,
      y: inputMap["s"] ? player.y + 5 : inputMap["w"] ? player.y - 5 : player.y,
    };
  };
  let gameState = createInitialGameState();
  onMount(() => {
    invariant(canvas !== null);
    const context = canvas.getContext("2d");
    invariant(context !== null);

    const animationFrame = () => {
      const clonedGameState = structuredClone(gameState);
      renderGameState(clonedGameState, context);
      playerEntity = updatePlayer(playerEntity, inputMap);
      const message = JSON.stringify(playerEntity);
      websocket.send(message);
      window.requestAnimationFrame(animationFrame);
    };

    let initialStateReceived = false;
    const websocket = new WebSocket("/websocket");
    websocket.addEventListener("message", (message) => {
      gameState = JSON.parse(message.data);
    });
    websocket.addEventListener("open", () => {
      const initialGameState = createInitialGameState();
      window.requestAnimationFrame(animationFrame);
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
