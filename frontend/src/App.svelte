<script lang="ts">
  import { onMount } from "svelte";
  import invariant from "tiny-invariant";
  import heart from "./assets/heart.png";
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
          deltaTime,
          websocket,
          canvas
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
  <div class="canvas-container">
    <canvas bind:this={canvas} class="canvas" width="0" height="0" />
  </div>
  <div class="ui-container">
    <div class="title-container">
      <img src={heart} alt="HEART" width="150" height="150" />
      <h2 class="title">NOTMG</h2>
    </div>
    <div class="health">
      <p class="health-text">{health} / {maxHealth}</p>
    </div>
  </div>
</main>

<style>
  .main {
    width: 100vw;
    height: 100vh;
    padding: 0;
    margin: 0;
  }

  .title:first-letter {
    font-family: Jacquard;
    font-size: 2.75rem;
  }
  .title-container {
    top: 0;
    left: 0;
    gap: 0rem;
    display: flex;
    flex-direction: row;
    margin-left: -3rem;
    margin-top: -3rem;
    align-items: center;
  }
  .title {
    margin-left: -1rem;
    font-size: 1.375rem;
    font-family: Alagard;
  }
  .ui-container {
    position: absolute;
    bottom: 0rem;
    left: 3rem;

    width: 12rem;
    flex-direction: column-reverse;
    display: flex;
    align-items: start;
  }
  .canvas-container {
    overflow: hidden;
    flex: 1 1 auto;
    width: 100vw;
    height: 100vh;
    background-color: #000000;
  }
  .canvas {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
</style>
