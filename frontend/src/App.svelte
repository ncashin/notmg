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
    setServerState,
    useServerState,
    type GameState,
  } from "./gameState";
  import { useInput } from "./inputMap";
  import { drawGameState } from "./render";
  import type { ClientUpdateMessage } from "./websocket";

  export let canvas: HTMLCanvasElement;
  export let health: number = 1;
  export let maxHealth: number = 1;
  onMount(() => {
    invariant(canvas !== null);
    const context = canvas.getContext("2d");
    invariant(context !== null);

    const updateCanvasSize = () => {
      invariant(canvas.parentElement !== null);

      canvas.width = 0;
      canvas.height = 0;
      canvas.style.width = "0";
      canvas.style.height = "0";

      const parentWidth = canvas.parentElement.clientWidth;
      const parentHeight = canvas.parentElement.clientHeight;
      canvas.width =
        Math.floor(Number(parentWidth / 2)) * window.devicePixelRatio;
      canvas.height =
        Math.floor(Number(parentHeight / 2)) * window.devicePixelRatio;

      canvas.style.width = parentWidth + "px";
      canvas.style.height = parentHeight + "px";
    };
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    const startTime = Date.now();
    const websocket = new WebSocket("http://localhost:3000/ws");
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

        drawGameState(clientState, gameState, canvas, context);

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
  <div class="topBar">
    <h2>NOTMG</h2>
  </div>
  <div class="ui-container">
    <div class="health">{health} / {maxHealth}</div>
  </div>
  <div class="canvas-container">
    <canvas bind:this={canvas} class="canvas" width="0" height="0" />
  </div>
</main>

<style>
  .main {
    display: flex;
    flex-direction: column;

    width: 100vw;
    height: 100vh;
    margin: 0;

    background-color: rgb(68, 51, 51);
  }

  .topBar {
    display: flex;
    align-items: center;

    height: 2rem;
    padding-left: 1rem;

    background-color: gray;
  }

  .canvas-container {
    overflow: hidden;
    flex: 1 1 auto;
  }
  .canvas {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
  .health {
    height: 1rem;
  }
</style>
