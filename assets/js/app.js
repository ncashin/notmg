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

  let cameraX = 0;
  let cameraY = 0;
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
      userId = resp.player.id;
      x = resp.player.x;
      y = resp.player.y;

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
        return { ...acc, [id]: { ...player, x: oldPlayer.x, y: oldPlayer.y } };
      },
      {},
    );
    oldEnemies = Object.entries(newState.enemies).reduce((acc, [id, enemy]) => {
      const oldEnemy = oldEnemies[id];
      if (oldEnemy === undefined)
        return { ...acc, [id]: structuredClone(enemy) };
      return { ...acc, [id]: { ...enemy, x: oldEnemy.x, y: oldEnemy.y } };
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
    const isHandled = handleInventoryMouseDown(event);
    if (isHandled) return;

    const radians = Math.atan2(
      event.clientY - y + cameraY,
      event.clientX - x + cameraX,
    );
    channel.push("shoot", { radians });
  });
  document.addEventListener("mousemove", function (event) {
    const isHandled = handleInventoryMouseMove(event);
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
    context.drawImage(
      image,
      x - image.width / 2 - cameraX,
      y - image.height / 2 - cameraY,
    );
  };
  const drawHealthBar = (image, entity) => {
    context.fillRect(
      entity.x - image.width / 2 - cameraX,
      entity.y - image.height / 2 + image.height - cameraY,
      image.width,
      5,
    );
    context.fillStyle = "green";
    context.fillRect(
      entity.x - image.width / 2 - cameraX,
      entity.y - image.height / 2 + image.height - cameraY,
      image.width * (entity.health / entity.max_health),
      5,
    );
    context.fillStyle = "red";
  };
  const drawDebugCircle = (radius, x, y) => {
    context.beginPath();
    context.arc(x - cameraX, y - cameraY, radius, 0, 2 * Math.PI);
    context.strokeStyle = "red";
    context.stroke();
  };
  const draw = (interpolationTime) => {
    clearCanvas();
    if (state !== undefined && state.players !== undefined) {
      Object.entries(state.players).forEach(([id, player]) => {
        if (id === userId) {
          drawImageCentered(notmgLittleGuyImage, x, y);
          drawHealthBar(notmgLittleGuyImage, { ...player, x, y });
          drawDebugCircle(player.radius, x, y);
          return;
        }

        let oldPlayer = oldPlayers[id];
        if (oldPlayer === undefined) return;

        const dx = player.x - oldPlayer.x;
        const dy = player.y - oldPlayer.y;
        oldPlayer.x += dx * interpolationTime;
        oldPlayer.y += dy * interpolationTime;
        drawImageCentered(notmgLittleGuyImage, oldPlayer.x, oldPlayer.y);
        drawHealthBar(notmgLittleGuyImage, oldPlayer);
        drawDebugCircle(player.radius, oldPlayer.x, oldPlayer.y);
      });

      Object.entries(state.enemies).forEach(([id, enemy]) => {
        let oldEnemy = oldEnemies[id];
        if (oldEnemy === undefined) return;

        veloX = enemy.x - oldEnemy.x;
        veloY = enemy.y - oldEnemy.y;
        oldEnemy.x += veloX * interpolationTime;
        oldEnemy.y += veloY * interpolationTime;
        drawImageCentered(leviathanImage, oldEnemy.x, oldEnemy.y);
        drawHealthBar(leviathanImage, oldEnemy);
        drawDebugCircle(enemy.radius, oldEnemy.x, oldEnemy.y);
      });

      Object.entries(state.projectiles).forEach(([id, projectile]) => {
        let oldProjectile = oldProjectiles[id];
        if (oldProjectile === undefined) return;

        veloX = projectile.x - oldProjectile.x;
        veloY = projectile.y - oldProjectile.y;
        oldProjectile.x += veloX * interpolationTime;
        oldProjectile.y += veloY * interpolationTime;

        drawDebugCircle(projectile.radius, oldProjectile.x, oldProjectile.y);
        context.fillStyle = "white";
        context.fill();
      });
    }
  };

  const inventoryOpen = true;
  const inventoryGridX = 10;
  const inventoryGridY = 5;

  const cellSize = 50;
  const inventoryWidth = cellSize * (inventoryGridX + 1);
  const inventoryHeight = cellSize * (inventoryGridY + 1);
  // item props: x, y, width, height
  const items = [
    {
      x: 0,
      y: 0,
      width: 1,
      height: 2,
    },
    {
      x: 3,
      y: 1,
      width: 2,
      height: 1,
    },
  ];
  let itemSelected = false;
  const getInventoryCellFromMousePosition = (mouseX, mouseY) => {
    if (mouseX < cellSize || mouseX > inventoryWidth - cellSize) return;
    if (mouseY < cellSize || mouseY > inventoryHeight - cellSize) return;
    return [
      Math.floor((mouseX - cellSize) / cellSize),
      Math.floor((mouseY - cellSize) / cellSize),
    ];
  };
  let selectedItem;
  let ghostItem;
  const selectItem = (x, y) => {
    selectedItem = items.find((item) => {
      const xOverlap = item.x <= x && x < item.x + item.width;
      const yOverlap = item.y <= y && y < item.y + item.height;

      return xOverlap && yOverlap;
    });
    ghostItem = structuredClone(selectedItem);
  };
  const getCollidingItem = (itemToCollide) => {
    return items.find((item) => {
      if (item === itemToCollide) return false;
      const noXOverlap =
        (item.x < itemToCollide.x && item.x + item.width < itemToCollide.x) ||
        (item.x > itemToCollide.x && item.x + item.width > itemToCollide.x);
      const noYOverlap =
        (item.y < itemToCollide.y && item.y + item.height < itemToCollide.y) ||
        (item.y > itemToCollide.y && item.y + item.height > itemToCollide.y);

      return !(noXOverlap || noYOverlap);
    });
  };
  const handleInventoryMouseDown = (event) => {
    const clickedCell = getInventoryCellFromMousePosition(
      event.clientX,
      event.clientY,
    );
    if (!clickedCell) return false;
    const [x, y] = clickedCell;

    if (selectedItem) {
      if (getCollidingItem(ghostItem)) return true;
      selectedItem.x = x;
      selectedItem.y = y;
      selectedItem = undefined;
      ghostItem = undefined;
      return true;
    }

    selectItem(x, y);
    return true;
  };
  const handleInventoryMouseMove = (event) => {
    const hoveredCell = getInventoryCellFromMousePosition(
      event.clientX,
      event.clientY,
    );
    if (!hoveredCell) return false;
    const [x, y] = hoveredCell;

    if (ghostItem) {
      ghostItem.x = x;
      ghostItem.y = y;
    }
  };
  const drawUI = () => {
    if (!inventoryOpen) return;

    context.fillStyle = "gray";
    context.fillRect(
      cellSize / 2,
      cellSize / 2,
      inventoryWidth,
      inventoryHeight,
    );
    context.fillStyle = "white";
    context.fillRect(
      cellSize,
      cellSize,
      inventoryWidth - cellSize,
      inventoryHeight - cellSize,
    );

    context.fillStyle = "black";
    for (let i = 0; i < inventoryGridX + 1; i++) {
      context.fillRect(
        cellSize + i * cellSize,
        cellSize,
        1,
        inventoryHeight - cellSize,
      );
    }
    for (let i = 0; i < inventoryGridY + 1; i++) {
      context.fillRect(
        cellSize,
        cellSize + i * cellSize,
        inventoryWidth - cellSize,
        1,
      );
    }

    context.fillStyle = "red";
    items.forEach((item) => {
      if (item === selectedItem) {
        context.fillStyle = "blue";
        context.fillRect(
          cellSize + item.x * cellSize,
          cellSize + item.y * cellSize,
          item.width * cellSize,
          item.height * cellSize,
        );
        context.fillStyle = "red";
        return;
      }

      context.fillRect(
        cellSize + item.x * cellSize,
        cellSize + item.y * cellSize,
        item.width * cellSize,
        item.height * cellSize,
      );
    });
    if (ghostItem) {
      context.fillStyle = "yellow";
      context.fillRect(
        cellSize + ghostItem.x * cellSize,
        cellSize + ghostItem.y * cellSize,
        ghostItem.width * cellSize,
        ghostItem.height * cellSize,
      );
    }

    context.fillStyle = "red";
    context.fillText(25, 25, "Inventory");
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
  const animationFrame = (frameTime) => {
    const deltaTime = (frameTime - previousFrameTime) / 1000;
    previousFrameTime = frameTime;

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

    cameraX = x - canvas.width / 2;
    cameraY = y - canvas.height / 2;

    canvas.style.backgroundPosition = -cameraX + "px " + -cameraY + "px";

    const rawInterp = (Date.now() - timeStateReceived) / tickRate / 1000;
    const interpolationTime = Math.cbrt(rawInterp);

    draw(interpolationTime);
    drawUI();

    window.requestAnimationFrame(animationFrame);
  };
  window.requestAnimationFrame(animationFrame);
});
