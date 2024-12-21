import { Socket, Presence } from "phoenix";

let socket = new Socket("/socket", { params: { token: window.userToken } });

document.addEventListener("DOMContentLoaded", () => {
  socket.connect();

  let urlParams = new URLSearchParams(window.location.search);
  let room = urlParams.has("room") ? urlParams.get("room") : "lobby";

  let channel = socket.channel(`room:${room}`, {});
  window.channel = channel;

  let presence = new Presence(channel);

  let userId;

  let x;
  let y;
  let velocityX = 0;
  let velocityY = 0;

  let shootTime = Date.now();
  let timeBetweenShoot = 1000;

  let tickRate = 0;

  channel
    .join()
    .receive("ok", (resp) => {
      userId = resp.user_id;
      x = resp.x;
      y = resp.y;

      tickRate = resp.tick_rate;
      setInterval(() => {
        const update = {
          x: x,
          y: y,
          velocity_x: velocityX,
          velocity_y: velocityY,
        };
        channel.push("update", update);
      }, tickRate);

      console.log("Joined successfully", resp);
    })
    .receive("error", (resp) => {
      console.log("Unable to join", resp);
    });

  let state = {
    players: {},
    projectiles: {},
    enemies: {},
  };
  let timeStateReceived;

  let oldPlayers = {};
  let oldEnemies = {};
  let oldProjectiles = {};

  channel.on("state", (newState) => {
    oldPlayers = Object.entries(newState.players).reduce(
      (acc, [id, player]) => {
        const oldPlayer = oldPlayers[id];
        if (oldPlayer === undefined)
          return { ...acc, [id]: structuredClone(player) };
        return { ...acc, [id]: oldPlayer };
      },
      {},
    );
    oldEnemies = Object.entries(newState.enemies).reduce((acc, [id, enemy]) => {
      const oldEnemy = oldEnemies[id];
      if (oldEnemy === undefined)
        return { ...acc, [id]: structuredClone(enemy) };
      return { ...acc, [id]: oldEnemy };
    }, {});
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

  let inputMap = {};
  document.addEventListener("keydown", (event) => {
    inputMap[event.key] = true;
  });
  document.addEventListener("keyup", (event) => {
    inputMap[event.key] = false;
  });

  document.addEventListener("mousedown", function (event) {
    const radians = Math.atan2(event.clientY - y, event.clientX - x);
    channel.push("shoot", { radians });
  });

  const loadImage = (source) => {
    let image = new Image();
    image.src = source;
    return image;
  };
  const notmgLittleGuyImage = loadImage("/assets/notmglittleguy.png");
  const leviathanImage = loadImage("/assets/leviathan.png");

  const canvas = document.getElementById("canvas");
  const context = canvas.getContext("2d");

  const clearCanvas = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
  };
  const drawImageCentered = (image, x, y) => {
    context.drawImage(image, x - image.width / 2, y - image.height / 2);
  };
  const drawHealthBar = (image, entity) => {
    context.fillRect(
      entity.x - image.width / 2,
      entity.y - image.height / 2 + image.height,
      image.width,
      5,
    );
    context.fillStyle = "green";
    context.fillRect(
      entity.x - image.width / 2,
      entity.y - image.height / 2 + image.height,
      image.width * (entity.health / entity.max_health),
      5,
    );
    context.fillStyle = "red";
  };
  const draw = (interpolationTime) => {
    clearCanvas();
    if (state !== undefined && state.players !== undefined) {
      Object.entries(state.players).forEach(([id, player]) => {
        if (id === userId) {
          drawImageCentered(notmgLittleGuyImage, x, y);
          drawHealthBar(notmgLittleGuyImage, { ...player, x, y });
          return;
        }

        var oldPlayer = oldPlayers[id];
        if (oldPlayer === undefined) return;

        const dx = player.x - oldPlayer.x;
        const dy = player.y - oldPlayer.y;
        oldPlayer.x += dx * interpolationTime;
        oldPlayer.y += dy * interpolationTime;
        drawImageCentered(notmgLittleGuyImage, oldPlayer.x, oldPlayer.y);
        drawHealthBar(notmgLittleGuyImage, oldPlayer);
      });

      Object.entries(state.enemies).forEach(([id, enemy]) => {
        var oldEnemy = oldEnemies[id];
        if (oldEnemy === undefined) return;

        veloX = enemy.x - oldEnemy.x;
        veloY = enemy.y - oldEnemy.y;
        oldEnemy.x += veloX * interpolationTime;
        oldEnemy.y += veloY * interpolationTime;
        drawImageCentered(leviathanImage, oldEnemy.x, oldEnemy.y);
        drawHealthBar(leviathanImage, oldEnemy);
      });

      Object.entries(state.projectiles).forEach(([id, projectile]) => {
        var oldProjectile = oldProjectiles[id];
        if (oldProjectile === undefined) return;

        veloX = projectile.x - oldProjectile.x;
        veloY = projectile.y - oldProjectile.y;
        oldProjectile.x += veloX * interpolationTime;
        oldProjectile.y += veloY * interpolationTime;

        context.beginPath();
        context.arc(oldProjectile.x, oldProjectile.y, 16, 0, 2 * Math.PI);
        context.fillStyle = "red";
        context.fill();
      });
    }
  };
  const updateCanvasSize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  };
  window.addEventListener("resize", updateCanvasSize);
  updateCanvasSize();

  let previousFrameTime = Date.now();
  const playerSpeed = 200;
  const animationFrame = (frameTime) => {
    const deltaTime = (frameTime - previousFrameTime) / 1000;
    previousFrameTime = frameTime;

    const rawInterp = (Date.now() - timeStateReceived) / tickRate / 1000;
    const interpolationTime = Math.cbrt(rawInterp);

    draw(interpolationTime);

    let newVelocityX = 0;
    newVelocityX += inputMap["d"] ? playerSpeed : 0;
    newVelocityX -= inputMap["a"] ? playerSpeed : 0;
    velocityX = newVelocityX;

    let newVelocityY = 0;
    newVelocityY -= inputMap["w"] ? playerSpeed : 0;
    newVelocityY += inputMap["s"] ? playerSpeed : 0;
    velocityY = newVelocityY;

    x += velocityX * deltaTime;
    y += velocityY * deltaTime;

    window.requestAnimationFrame(animationFrame);
  };
  window.requestAnimationFrame(animationFrame);
});
