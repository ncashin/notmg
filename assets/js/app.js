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

  channel
    .join()
    .receive("ok", (resp) => {
      userId = resp.user_id;
      x = resp.x;
      y = resp.y;

      setInterval(() => {
        const update = {
          x: x,
          y: y,
          velocity_x: velocityX,
          velocity_y: velocityY,
        };
        channel.push("update", update);
      }, resp.tick_rate);

      console.log("Joined successfully", resp);
    })
    .receive("error", (resp) => {
      console.log("Unable to join", resp);
    });

  let state;

  channel.on("state", (newState) => {
    window.state = newState;
    state = newState;
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
  const draw = () => {
    clearCanvas();
    if (state !== undefined && state.players !== undefined) {
      Object.entries(state.players).forEach(([id, player]) => {
        if (id === userId) {
          context.drawImage(notmgLittleGuy, x, y);
          return;
        }
        context.drawImage(notmgLittleGuy, player.x, player.y);
      });
    }
  };
  const updateCanvasSize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    draw();
  };
  window.addEventListener("resize", updateCanvasSize);
  updateCanvasSize();

  let previousFrameTime = Date.now();
  const playerSpeed = 200;
  const animationFrame = (frameTime) => {
    draw();

    const deltaTime = (frameTime - previousFrameTime) / 1000;
    previousFrameTime = frameTime;

    let newVelocityX = 0;
    newVelocityX += inputMap["d"] ? playerSpeed * deltaTime : 0;
    newVelocityX -= inputMap["a"] ? playerSpeed * deltaTime : 0;
    velocityX = newVelocityX;

    newVelocityY = 0;
    newVelocityY -= inputMap["w"] ? playerSpeed * deltaTime : 0;
    newVelocityY += inputMap["s"] ? playerSpeed * deltaTime : 0;
    velocityY = newVelocityY;

    x += velocityX;
    y += velocityY;

    window.requestAnimationFrame(animationFrame);
  };
  window.requestAnimationFrame(animationFrame);
});
