<script lang="ts">
  import { onMount } from "svelte";
  import invariant from "tiny-invariant";
  import {
    createInitialGameState,
    renderGameState,
    update,
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

  onMount(() => {
    invariant(canvas !== null);
    const context = canvas.getContext("2d");
    invariant(context !== null);

    const initialGameState = createInitialGameState();
    const nextFrameCallback = (gameState: GameState) => {
      return () => {
        const clonedInputMap = structuredClone(inputMap);
        const updatedGameState = update(gameState, clonedInputMap);
        renderGameState(updatedGameState, context);
        window.requestAnimationFrame(nextFrameCallback(updatedGameState));
      };
    };
    window.requestAnimationFrame(nextFrameCallback(initialGameState));
  });
</script>

<main class="main">
  <div class="container">
    <div class="sidebar">
      <p>THIS IS A TEST FOR TEXT YEEHAW</p>
    </div>
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
  }
  .canvas {
    width: 900px;
    height: 600px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
</style>
