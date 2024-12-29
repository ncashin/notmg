import { Socket, Presence } from "phoenix";
import {
  drawUI,
  handleInventoryMouseDown,
  handleInventoryMouseMove,
  inventoryOpen,
  setInventory,
  toggleInventory,
} from "./inventory";
import { Entity, Map, State } from "./types";

let socket = new Socket("/socket", { params: { token: window.userToken } });

export let canvas: HTMLCanvasElement;
export let context: CanvasRenderingContext2D;

export let inputMap: any = {};

let urlParams = new URLSearchParams(window.location.search);
let room = urlParams.has("room") ? urlParams.get("room") : "lobby";
export let channel = socket.channel(`room:${room}`, {});
window.channel = channel;

document.addEventListener("DOMContentLoaded", () => {
  socket.connect();

  canvas = document.getElementById("canvas") as HTMLCanvasElement;
  context = canvas.getContext("2d") as CanvasRenderingContext2D;

  window.debug = false;

  let presence = new Presence(channel);

  let userId;

  let cameraX = 0;
  let cameraY = 0;
  let x;
  let y;
  let velocityX = 0;
  let velocityY = 0;

  let shootTime = Date.now();
  let timeBetweenShoot = 250;

  let map: Map;
  let tickRate = 0;

  const loadImage = (source) => {
    let image = new Image();
    image.src = source;
    return image;
  };
  const sprites = {
    player: loadImage("/assets/notmglittleguy.png"),
    leviathan: loadImage("/assets/leviathan.png"),
    button: (entity) => {
      drawCircle(entity.radius, entity.x, entity.y);
      context.fillStyle = "#00ff0020";
      context.fill();
    },
    projectile: loadImage("/assets/projectile.png"),
  };
  channel
    .join()
    .receive("ok", (resp) => {
      map = resp.map;

      map.layers = map.layer_names.reduce((acc, layerName) => {
        if (layerName !== "entities") {
          acc[layerName] = loadImage(
            `/assets/map/png/${map.name}__${layerName}.png`,
          );
        }
        return acc;
      }, {});

      window.map = map;

      userId = resp.player.id;
      x = resp.player.x;
      y = resp.player.y;

      setInventory(resp.player.inventory);

      tickRate = resp.tick_rate;

      setInterval(() => {
        const update = {
          x: x,
          y: y,
        };
        channel.push("update", update);
      }, tickRate);

      console.log("Joined successfully", resp);
    })
    .receive("error", (resp) => {
      console.log("Unable to join", resp);
    });

  let state: State = {
    entities: {},
  };
  let timeStateReceived;

  let oldEntities: Record<string, Entity> = {};

  channel.on("state", (newState: State) => {
    oldEntities = Object.entries(newState.entities).reduce(
      (acc, [id, entity]) => {
        const oldEntity = oldEntities[id];

        if (oldEntity === undefined) {
          return {
            ...acc,
            [id]: { ...structuredClone(entity), health_accumulator: 0 },
          };
        }

        return {
          ...acc,
          [id]: {
            ...entity,
            x: oldEntity.x,
            y: oldEntity.y,
            health_accumulator:
              oldEntity.health_accumulator +
              (oldEntity?.health - entity?.health),
          },
        };
      },
      {},
    );

    window.state = newState;

    state = newState;
    timeStateReceived = Date.now();
  });

  presence.onSync(() => {
    console.log("Presence", presence.list());
  });

  let isChatting = false;
  let chatMessage: string | undefined = undefined;

  document.addEventListener("keydown", (event) => {
    if (isChatting) {
      if (event.key === "Enter" || event.key === "Escape") {
        if (chatMessage === undefined) return;

        channel.push("finalize_chat", { message: chatMessage });
        if (state.entities[userId]) {
          state.entities[userId].wip_message = undefined;
          state.entities[userId].chat_messages = [
            { content: chatMessage, sent_at: Math.floor(Date.now() / 1000) },
            ...(state.entities[userId].chat_messages || []).slice(0, 2),
          ];
        }
        isChatting = false;
        chatMessage = undefined;
        return;
      }

      if (event.key === "Backspace") {
        chatMessage = chatMessage?.slice(0, -1);
      } else {
        if (event.key.length === 1) {
          chatMessage = chatMessage ? chatMessage + event.key : event.key;
        }
      }

      channel.push("chat", { message: chatMessage });

      return;
    }

    if (event.key === "t") {
      isChatting = !isChatting;
    }

    if (event.key === "e") {
      const interact_id = Object.values(state.entities).find((entity) => {
        const distance = Math.sqrt(
          Math.pow(entity.x - x, 2) + Math.pow(entity.y - y, 2),
        );
        return entity.id !== userId && distance < entity.radius;
      })?.id;
      if (interact_id === undefined) return;
      channel.push("interact", { interact_id });
    }

    if (event.key === "i") {
      toggleInventory();
    }

    inputMap[event.key] = true;
  });

  document.addEventListener("keyup", (event) => {
    inputMap[event.key] = false;
  });

  document.addEventListener("mousedown", function (event) {
    if (inventoryOpen) {
      const isHandled = handleInventoryMouseDown(event);
      if (isHandled) return;
    }

    inputMap["leftmouse"] = true;
  });

  document.addEventListener("mouseup", function (event) {
    inputMap["leftmouse"] = false;
  });

  document.addEventListener("mousemove", function (event) {
    inputMap.mousePosition = [event.clientX, event.clientY];

    if (inventoryOpen) {
      handleInventoryMouseMove(event);
    }
  });

  const clearCanvas = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
  };
  const drawImageCentered = (image, x, y, rotation = 0) => {
    context.translate(x - cameraX, y - cameraY);
    context.rotate(rotation);
    context.drawImage(image, -image.width / 2, -image.height / 2);
    context.setTransform(1, 0, 0, 1, 0, 0);
  };
  const drawHealthBar = (image, entity) => {
    if (entity.health === undefined) return;

    context.fillStyle = "red";
    context.fillRect(
      entity.x - image.width / 2 - cameraX,
      entity.y - image.height / 2 + image.height - cameraY + 4,
      image.width,
      5,
    );
    context.fillStyle = "orange";
    context.fillRect(
      entity.x - image.width / 2 - cameraX,
      entity.y - image.height / 2 + image.height - cameraY + 4,
      image.width *
        ((entity.health + entity.health_accumulator) / entity.max_health),
      5,
    );

    context.fillStyle = "green";
    context.fillRect(
      entity.x - image.width / 2 - cameraX,
      entity.y - image.height / 2 + image.height - cameraY + 4,
      image.width * (entity.health / entity.max_health),
      5,
    );
    context.fillStyle = "red";
  };
  const drawChatMessages = (entity: Entity) => {
    context.font = "14px Arial";
    context.fillStyle = "white";
    context.textAlign = "center";

    if (entity.wip_message) {
      let content = entity.wip_message;

      if (entity.id === userId) {
        content = chatMessage ?? "";
      }

      context.fillText(content, entity.x - cameraX, entity.y - 60 - cameraY);
    }

    entity.chat_messages?.forEach((message, index) => {
      let baseY = entity.y - cameraY;

      if (entity.wip_message) {
        baseY -= 80;
      } else {
        baseY -= 60;
      }

      context.fillText(message.content, entity.x - cameraX, baseY - index * 20);
    });
  };
  const drawCircle = (radius, x, y) => {
    context.lineWidth = 1;

    context.beginPath();
    context.arc(x - cameraX, y - cameraY, radius, 0, 2 * Math.PI);
    context.strokeStyle = "red";
    context.stroke();
  };

  const draw = (interpolationTime) => {
    context.imageSmoothingEnabled = false;

    clearCanvas();

    if (map) {
      Object.entries(map.layers)
        .reverse()
        .forEach(([layerName, layer]) => {
          context.drawImage(
            layer as CanvasImageSource,
            map.world_x - cameraX,
            map.world_y - cameraY,
            map.width,
            map.height,
          );
        });
    }

    if (state !== undefined && state.entities !== undefined) {
      Object.entries(state.entities).forEach(([id, entity]) => {
        let oldEntity = oldEntities[id];
        if (oldEntity === undefined) return;

        if (id === userId) {
          drawImageCentered(
            sprites[entity.type],
            x,
            y,
            ((velocityX / playerSpeed) * (Math.PI * 2)) / 60,
          );
          drawHealthBar(sprites[entity.type], {
            ...entity,
            x,
            y,
            health_accumulator: 0,
          });

          if (window.debug) {
            drawCircle(entity.radius, x, y);
          }

          drawChatMessages({ ...entity, x, y });

          if (
            !inputMap.leftmouse ||
            Date.now() - shootTime < timeBetweenShoot
          ) {
            return;
          }

          return;
        }

        const dx = entity.x - oldEntity.x;
        const dy = entity.y - oldEntity.y;
        oldEntity.x += dx * interpolationTime;
        oldEntity.y += dy * interpolationTime;

        if (typeof sprites[oldEntity.type] === "function") {
          sprites[oldEntity.type](oldEntity);
          return;
        }

        drawChatMessages(oldEntity);
        drawImageCentered(
          sprites[entity.type],
          oldEntity.x,
          oldEntity.y,
          oldEntity.radians,
        );
        drawHealthBar(sprites[entity.type], oldEntity);

        if (window.debug) {
          drawCircle(entity.radius, oldEntity.x, oldEntity.y);
        }
      });
    }
  };

  const updateCanvasSize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    draw(0);
  };
  window.addEventListener("resize", updateCanvasSize);
  updateCanvasSize();

  let previousFrameTime = Date.now();
  const playerSpeed = 200;
  const handlePlayerInput = () => {
    const currentTime = Date.now();

    if (!inputMap.leftmouse || currentTime - shootTime < timeBetweenShoot) {
      return;
    }

    shootTime = currentTime;
    const [mouseX, mouseY] = inputMap.mousePosition;
    const radians = Math.atan2(mouseY - y + cameraY, mouseX - x + cameraX);
    channel.push("shoot", { radians });
  };
  const animationFrame = (frameTime) => {
    const deltaTime = (frameTime - previousFrameTime) / 1000;
    previousFrameTime = frameTime;

    Object.entries(oldEntities).forEach(([id, oldEntity]) => {
      oldEntity.health_accumulator -= oldEntity.health_accumulator * (5 / 100);
    });

    let newVelocityX = 0;
    newVelocityX += inputMap["d"] ? playerSpeed : 0;
    newVelocityX -= inputMap["a"] ? playerSpeed : 0;
    velocityX = (velocityX + newVelocityX) / 2;

    let newVelocityY = 0;
    newVelocityY -= inputMap["w"] ? playerSpeed : 0;
    newVelocityY += inputMap["s"] ? playerSpeed : 0;
    velocityY = newVelocityY;

    x += newVelocityX * deltaTime;
    y += velocityY * deltaTime;

    cameraX = x - canvas.width / 2;
    cameraY = y - canvas.height / 2;

    const rawInterp = (Date.now() - timeStateReceived) / tickRate / 1000;
    const interpolationTime = Math.cbrt(rawInterp);

    draw(interpolationTime);
    drawUI();

    handlePlayerInput();

    window.requestAnimationFrame(animationFrame);
  };
  window.requestAnimationFrame(animationFrame);
});
