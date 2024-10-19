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
    },
  };
  const useServerState = () => structuredClone(_serverState);
  const setServerState = (newServerState: ServerState) => {
    _serverState = structuredClone(newServerState);
  };

  let _gameState = {
    playerEntities: {},
    entities: {},
  };
  const useGameState = () => structuredClone(_gameState);
  const setGameState = (newGameState: GameState) => {
    _gameState = structuredClone(newGameState);
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
  onMount(() => {
    invariant(canvas !== null);
    const context = canvas.getContext("2d");
    invariant(context !== null);

    const websocket = new WebSocket("http://localhost:3000/ws");
    websocket.addEventListener("message", (message) => {
      const clientState = useClientState();

      const serverMessage = JSON.parse(message.data);
      switch (serverMessage.type) {
        case "initialize":
          setServerState({
            timeStateReceived: Date.now(),
            gameState: serverMessage.data.gameState,
          });
          setGameState(serverMessage.data.gameState);
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

      const clientMessage = JSON.stringify(clientState);
      websocket.send(clientMessage);
    });

    const getAnimationFrameCallback =
      (previousFrameTime: number, clientTime: number) =>
      (frameTime: number) => {
        const deltaTime = frameTime - previousFrameTime;

        const inputMap = useInput();
        const clientState = useClientState();
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
          inputMap
        );
        setClientState(newClientState);
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
