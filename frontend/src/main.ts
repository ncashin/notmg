import "./style.css";
import "./draw";
import {
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../../core/collision";
import { provideECSInstanceFunctions } from "../../core/ecs";
import type { Packet } from "../../core/network";
import { mergeDeep } from "../../core/objectMerge";
import { PLAYER_COMPONENT_DEF, type PlayerComponent } from "../../core/player";

import { AuthMessage } from "../../core/socketMessage";
import { draw } from "./draw";
import { inputMap, mouseClicked, mousePosition } from "./input";

export const {
  ecsInstance,

  createEntity,
  destroyEntity,

  addComponent,
  removeComponent,

  getComponent,
  queryComponents,

  runQuery,
} = provideECSInstanceFunctions({});

// Added shooting cooldown
let shootCooldown = 0;
const SHOOT_COOLDOWN_TIME = 100; // frames between shots

let playerEntity: number | undefined = undefined;
export const mergePacket = (packet: Packet) => {
  for (const [entity, components] of Object.entries(packet)) {
    if (components === null) {
      destroyEntity(Number.parseInt(entity));
      continue;
    }
    for (const [type, component] of Object.entries(components)) {
      if (component === null) {
        removeComponent(Number.parseInt(entity), { type });
        continue;
      }
      component.type = type;

      const existingComponent = getComponent(Number(entity), component);
      if (existingComponent === undefined) {
        addComponent(Number(entity), component);
        continue;
      }

      if (Number.parseInt(entity) === playerEntity && type === "position") {
        continue;
      }
      mergeDeep(existingComponent, component);
    }
  }
};

const sendSocketAuthMessage = (websocket: WebSocket, token: string) => {
  websocket.send(
    JSON.stringify({
      type: "auth",
      token,
    } as AuthMessage),
  );
};
let timeUpdateReceived = Date.now();
const websocket = new WebSocket("/websocket");
websocket.onopen = () => {
  console.log("Connected to WebSocket server");
  const token = localStorage.getItem("authToken");
  if (token) {
    sendSocketAuthMessage(websocket, token);
  }
};
websocket.onmessage = (event) => {
  timeUpdateReceived = Date.now();
  const messageObject = JSON.parse(event.data);
  switch (messageObject.type) {
    case "initialization":
      playerEntity = messageObject.playerEntity;
      mergePacket(messageObject.catchupPacket);
      break;
    case "update":
      mergePacket(messageObject.packet);
      break;

    default:
      console.log(messageObject);
  }
};
websocket.onerror = (error) => {
  console.error("WebSocket error:", error);
};
websocket.onclose = () => {
  console.log("Disconnected from WebSocket server");
};

export const CLIENT_POSITION_COMPONENT_DEF: {
  type: "clientPosition";
  x: number;
  y: number;
} = {
  type: "clientPosition",
  x: 0,
  y: 0,
};

const DAMPING_FORCE = 5;
const PLAYER_SPEED = 1000;
let lastFrameTime = Date.now();

let deathOverlay: HTMLElement;
let respawnCountdown: HTMLElement;

let authForm: HTMLFormElement;
let authMessage: HTMLElement;

const update = () => {
  const frameTime = Date.now();
  const deltaTime = (frameTime - lastFrameTime) / 1000;
  lastFrameTime = frameTime;

  if (playerEntity === undefined) {
    window.requestAnimationFrame(update);
    return;
  }

  // Check player state for death overlay
  const player = getComponent(playerEntity, PLAYER_COMPONENT_DEF) as
    | PlayerComponent
    | undefined;
  if (player) {
    if (player.isDead) {
      deathOverlay.classList.remove("hidden");
      const secondsLeft = Math.ceil(player.respawnTime / 60); // Convert frames to seconds
      respawnCountdown.textContent = secondsLeft.toString();

      // Don't process movement or shooting while dead
      draw(getComponent(playerEntity, CLIENT_POSITION_COMPONENT_DEF));
      window.requestAnimationFrame(update);
      return;
    }
    deathOverlay.classList.add("hidden");
  }

  const rawInterpolationPercent = (Date.now() - timeUpdateReceived) / 1000;
  const interpolationPercent = Math.cbrt(rawInterpolationPercent);
  runQuery([POSITION_COMPONENT_DEF], (entity, [serverPosition]) => {
    let clientPosition = getComponent(entity, CLIENT_POSITION_COMPONENT_DEF);
    if (clientPosition === undefined) {
      addComponent(entity, CLIENT_POSITION_COMPONENT_DEF);
      clientPosition = getComponent(entity, CLIENT_POSITION_COMPONENT_DEF);
      if (clientPosition === undefined) {
        throw new Error("Client position not found");
      }

      clientPosition.x = serverPosition.x;
      clientPosition.y = serverPosition.y;
    }
    if (entity === playerEntity) {
      return;
    }

    const dx = serverPosition.x - clientPosition.x;
    const dy = serverPosition.y - clientPosition.y;
    clientPosition.x += dx * interpolationPercent;
    clientPosition.y += dy * interpolationPercent;
  });

  // updateCollisionSystem(ecsInstance);
  const position = getComponent(playerEntity, CLIENT_POSITION_COMPONENT_DEF);
  const velocity = getComponent(playerEntity, VELOCITY_COMPONENT_DEF);

  if (
    position !== undefined &&
    velocity !== undefined &&
    player &&
    !player.isDead
  ) {
    // Reset velocity when dead
    if (player.isDead) {
      velocity.x = 0;
      velocity.y = 0;
    } else {
      if (inputMap.d) {
        velocity.x += PLAYER_SPEED * deltaTime;
      }
      if (inputMap.a) {
        velocity.x -= PLAYER_SPEED * deltaTime;
      }
      if (inputMap.s) {
        velocity.y += PLAYER_SPEED * deltaTime;
      }
      if (inputMap.w) {
        velocity.y -= PLAYER_SPEED * deltaTime;
      }

      velocity.x -= velocity.x * DAMPING_FORCE * deltaTime;
      velocity.y -= velocity.y * DAMPING_FORCE * deltaTime;

      position.x += velocity.x * deltaTime;
      position.y += velocity.y * deltaTime;

      // Send player position update
      const moveMessage = {
        type: "move",
        x: position.x,
        y: position.y,
      };
      websocket.send(JSON.stringify(moveMessage));

      // Calculate mouse position in world coordinates
      mousePosition.worldX = mousePosition.x - canvas.width / 2 + position.x;
      mousePosition.worldY = mousePosition.y - canvas.height / 2 + position.y;

      // Handle shooting
      if (shootCooldown > 0) {
        shootCooldown--;
      }

      if (mouseClicked && shootCooldown <= 0) {
        // Send shoot command to server
        const shootMessage = {
          type: "shoot",
          targetX: mousePosition.worldX,
          targetY: mousePosition.worldY,
        };
        websocket.send(JSON.stringify(shootMessage));
        shootCooldown = SHOOT_COOLDOWN_TIME;
      }
    }
  }
  draw(position);
  window.requestAnimationFrame(update);
};

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = sessionStorage.getItem("authToken");
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
};
const handleAuth = async (event: SubmitEvent) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const action = (event.submitter as HTMLButtonElement).value;

  const endpoint = action === "login" ? "/login" : "/register";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    authMessage.textContent = errorText || "Failed";
    authMessage.classList.remove("success");
    setTimeout(() => {
      authMessage.textContent = "";
    }, 3000);
    return;
  }

  const data = await response.json();
  sessionStorage.setItem("authToken", data.token);
  sendSocketAuthMessage(websocket, data.token);

  authMessage.textContent =
    action === "login" ? "Login successful!" : "Registration successful!";
  authMessage.classList.add("success");
  form.reset();
  setTimeout(() => {
    authMessage.textContent = "";
    authMessage.classList.remove("success");
  }, 2000);
};

// Get canvas for coordinate calculations
let canvas: HTMLCanvasElement;
document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("canvas") as HTMLCanvasElement;
  deathOverlay = document.getElementById("death-overlay") as HTMLElement;
  respawnCountdown = document.getElementById(
    "respawn-countdown",
  ) as HTMLElement;

  // Setup auth form
  authForm = document.getElementById("auth-form") as HTMLFormElement;
  authMessage = document.getElementById("auth-message") as HTMLElement;
  authForm.addEventListener("submit", handleAuth);

  window.requestAnimationFrame(update);
});
