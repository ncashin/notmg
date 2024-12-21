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
  };
  let timeStateReceived;

  let oldPlayers;

  channel.on("state", (newState) => {
    oldPlayers = state.players;

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

  document.addEventListener("mousemove", function (event) {
    inputMap.mousePosition = {
      x: event.clientX,
      y: event.clientY,
    };
  });

  const loadImage = (source) => {
    let image = new Image();
    image.src = source;
    return image;
  };
  const notmgLittleGuy = loadImage("/assets/notmglittleguy.png");

  const canvas = document.getElementById("canvas");
  const context = canvas.getContext("2d");

  const clearCanvas = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
  };
  const draw = (interpolationTime) => {
    clearCanvas();
    if (state !== undefined && state.players !== undefined) {
      Object.entries(state.players).forEach(([id, player]) => {
        if (id === userId) {
          context.drawImage(notmgLittleGuy, x, y);
          return;
        }

        const oldPlayer = oldPlayers[id];
        if (oldPlayer === undefined) return;

        context.drawImage(
          notmgLittleGuy,
          oldPlayer.x + (player.x - oldPlayer.x) * interpolationTime,
          oldPlayer.y + (player.y - oldPlayer.y) * interpolationTime,
        );
      });

      Object.entries(state.projectiles).forEach(([id, projectile]) => {
        context.drawImage(notmgLittleGuy, projectile.x, projectile.y);
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

    const interpolationTime = tickRate / (frameTime - timeStateReceived);

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
