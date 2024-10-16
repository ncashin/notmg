<script lang="ts">
  import { onMount } from "svelte";
  import invariant from "tiny-invariant";
  import {
    createInitialGameState,
    interpolateGameState,
    renderGameState,
    sprites,
    type ControlledEntity,
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
  let serverGameState = createInitialGameState();
  let time = Date.now();
  let nextStateTime = time;
  onMount(() => {
    invariant(canvas !== null);
    const context = canvas.getContext("2d");
    invariant(context !== null);

    const getAnimationFrameCallback =
      (gameState: GameState, previousTime: number) => (currentTime: number) => {
        const deltaTime = currentTime - previousTime;

        renderGameState(gameState, context);
        playerEntity = updatePlayer(playerEntity, inputMap);
        context.fillText("ID: " + "PLAYER", playerEntity.x, playerEntity.y - 5);
        context.drawImage(sprites.littleGuy, playerEntity.x, playerEntity.y);

        time += deltaTime;
        window.requestAnimationFrame(
          getAnimationFrameCallback(
            interpolateGameState(
              gameState,
              serverGameState,
              Math.sqrt(deltaTime / (time - nextStateTime))
            ),
            currentTime
          )
        );
      };

    const a = 0;
    const websocket = new WebSocket("/ws");
    websocket.addEventListener("message", (message) => {
      nextStateTime = Date.now();
      serverGameState = JSON.parse(message.data);
      const clientMessage = JSON.stringify(playerEntity);
      websocket.send(clientMessage);
    });

    websocket.addEventListener("open", () => {
      window.requestAnimationFrame(
        getAnimationFrameCallback(createInitialGameState(), 0)
      );
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
