import { Socket, Presence, Channel } from "phoenix";
import {
  drawUI,
  handleInventoryMouseDown,
  handleInventoryMouseMove,
} from "./inventory";

type Entity = {
  id: string;
  type: string;
  x: number;
  y: number;
  radius: number;
  velocity_x: number;
  velocity_y: number;
  health: number;
  max_health: number;
  health_accumulator: number;
};

type Projectile = {
  id: string;
  x: number;
  y: number;
  radius: number;
  velocity_x: number;
  velocity_y: number;
};

type State = {
  entities: Record<string, Entity>;
  projectiles: Record<string, Projectile>;
};

declare global {
  interface Window {
    state: State;
    channel: Channel;
    userToken: string;
  }
}

let socket = new Socket("/socket", { params: { token: window.userToken } });

export let canvas: HTMLCanvasElement;
export let context: CanvasRenderingContext2D;

export let inputMap: any = {};

document.addEventListener("DOMContentLoaded", () => {
  socket.connect();

  canvas = document.getElementById("canvas") as HTMLCanvasElement;
  context = canvas.getContext("2d") as CanvasRenderingContext2D;

  let urlParams = new URLSearchParams(window.location.search);
  let room = urlParams.has("room") ? urlParams.get("room") : "lobby";

  let channel = socket.channel(`room:${room}`, {});
  window.channel = channel;

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

  let tickRate = 0;

  const loadImage = (source) => {
    let image = new Image();
    image.src = source;
    return image;
  };
  const sprites = {
    player: loadImage("/assets/notmglittleguy.png"),
    leviathan: loadImage("/assets/leviathan.png"),
    button: loadImage("/assets/notmglittleguy.png"),
  };
  channel
    .join()
    .receive("ok", (resp) => {
      userId = resp.player.id;
      x = resp.player.x;
      y = resp.player.y;

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
    projectiles: {},
  };
  let timeStateReceived;

  let oldEntities: Record<string, Entity> = {};
  let oldProjectiles: Record<string, Projectile> = {};

  channel.on("state", (newState: State) => {
    oldEntities = Object.entries(newState.entities).reduce(
      (acc, [id, entity]) => {
        const oldEntity = oldEntities[id];
        if (oldEntity === undefined)
          return {
            ...acc,
            [id]: { ...structuredClone(entity), health_accumulator: 0 },
          };
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

    oldProjectiles = Object.entries(newState.projectiles).reduce(
      (acc, [id, projectile]) => {
        const oldProjectile = oldProjectiles[id];
        if (oldProjectile === undefined)
          return { ...acc, [id]: structuredClone(projectile) };
        return { ...acc, [id]: oldProjectile };
      },
      {},
    );

    window.state = newState;

    state = newState;
    timeStateReceived = Date.now();
  });

  presence.onSync(() => {
    console.log("presence", presence.list());
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "p") {
      const interact_id = Object.values(state.entities).find((entity) => {
        const distance = Math.sqrt(
          Math.pow(entity.x - x, 2) + Math.pow(entity.y - y, 2),
        );
        return entity.id !== userId && distance < entity.radius;
      })?.id;
      if (interact_id === undefined) return;
      channel.push("interact", { interact_id });
    }
    inputMap[event.key] = true;
  });
  document.addEventListener("keyup", (event) => {
    inputMap[event.key] = false;
  });

  document.addEventListener("mousedown", function (event) {
    const isHandled = handleInventoryMouseDown(event);
    if (isHandled) return;

    inputMap["leftmouse"] = true;
  });
  document.addEventListener("mouseup", function (event) {
    inputMap["leftmouse"] = false;
  });
  document.addEventListener("mousemove", function (event) {
    inputMap.mousePosition = [event.clientX, event.clientY];
    const isHandled = handleInventoryMouseMove(event);
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
  const drawDebugCircle = (radius, x, y) => {
    context.lineWidth = 1;

    context.beginPath();
    context.arc(x - cameraX, y - cameraY, radius, 0, 2 * Math.PI);
    context.strokeStyle = "red";
    context.stroke();
  };
  const draw = (interpolationTime) => {
    clearCanvas();
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
          drawDebugCircle(entity.radius, x, y);
          if (!inputMap.leftmouse || Date.now() - shootTime < timeBetweenShoot)
            return;

          return;
        }

        const dx = entity.x - oldEntity.x;
        const dy = entity.y - oldEntity.y;
        oldEntity.x += dx * interpolationTime;
        oldEntity.y += dy * interpolationTime;
        drawImageCentered(sprites[entity.type], oldEntity.x, oldEntity.y);
        drawHealthBar(sprites[entity.type], oldEntity);
        drawDebugCircle(entity.radius, oldEntity.x, oldEntity.y);
      });

      Object.entries(state.projectiles).forEach(([id, projectile]) => {
        let oldProjectile = oldProjectiles[id];
        if (oldProjectile === undefined) return;

        const veloX = projectile.x - oldProjectile.x;
        const veloY = projectile.y - oldProjectile.y;
        oldProjectile.x += veloX * interpolationTime;
        oldProjectile.y += veloY * interpolationTime;

        drawDebugCircle(projectile.radius, oldProjectile.x, oldProjectile.y);
        context.fillStyle = "white";
        context.fill();
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
    console.log(inputMap.leftmouse);
    const currentTime = Date.now();
    if (!inputMap.leftmouse || currentTime - shootTime < timeBetweenShoot)
      return;
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

    canvas.style.backgroundPosition = -cameraX + "px " + -cameraY + "px";

    const rawInterp = (Date.now() - timeStateReceived) / tickRate / 1000;
    const interpolationTime = Math.cbrt(rawInterp);

    draw(interpolationTime);
    drawUI();

    handlePlayerInput();

    window.requestAnimationFrame(animationFrame);
  };
  window.requestAnimationFrame(animationFrame);
});
