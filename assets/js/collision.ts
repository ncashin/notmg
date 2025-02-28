import { TILE_SIZE } from "./app";


export const moveAndCollide = (map, x, y, velocityX, velocityY) => {
    const getTile = (x, y) => {
        const index = x  + y * map.collisions.int_grid_width;
        if(map.collisions.int_grid[index] === undefined){
          return 0;
        }
        return map.collisions.int_grid[index];
      };
      const moveX = () => {
        const signX = Math.sign(velocityX);
        if (signX == 0) {
          return;
        }

        const tileX = Math.floor(x / TILE_SIZE);
        const tileY = Math.floor(y / TILE_SIZE);
        const tileDelta =
          velocityX >= 0 ? TILE_SIZE - (x % TILE_SIZE) : x % TILE_SIZE;
        if (Math.abs(velocityX) <= tileDelta) {
          x += velocityX;
          velocityX = 0;
          return;
        }
        const signedTileDelta = tileDelta * signX;

        if (getTile(tileX + signX, tileY) === 1) {
          x = Math.floor(x + signedTileDelta) - signX;
          velocityX = 0;
          return;
        }

        x += signedTileDelta;
        velocityX -= signedTileDelta;
        if (x % TILE_SIZE ===  0) {
          x += signX * 0.0001;
          velocityX -= signX * 0.0001;
        }
      };
      const moveY = () => {
        const signY = Math.sign(velocityY);
        if (signY ===  0) {
          return;
        }

        const tileX = Math.floor(x / TILE_SIZE);
        const tileY = Math.floor(y / TILE_SIZE);
        const tileDelta =
          velocityY >= 0 ? TILE_SIZE - (y % TILE_SIZE) : y % TILE_SIZE;
        if (Math.abs(velocityY) < tileDelta) {
          y += velocityY;
          velocityY = 0;
          return;
        }
        const signedTileDelta = tileDelta * signY;
        if (getTile(tileX, tileY + signY) === 1) {
          y = Math.floor(y + signedTileDelta) - signY;
          velocityY = 0;
          return;
        }

        y += signedTileDelta;
        velocityY -= signedTileDelta;
        if (y % TILE_SIZE ===0) {
          y += signY * 0.0001;
          velocityY -= signY * 0.0001;
        }
      };

      while (velocityX != 0 || velocityY != 0) {
        const tileDeltaX =
          velocityX >= 0 ? TILE_SIZE - (x % TILE_SIZE) : x % TILE_SIZE;
        const tileDeltaY =
          velocityY >= 0 ? TILE_SIZE - (y % TILE_SIZE) : y % TILE_SIZE;

        // Handle extremely small velocities that could cause infinite loops
        if (Math.abs(velocityX) < 0.001) velocityX = 0;
        if (Math.abs(velocityY) < 0.001) velocityY = 0;
        if (velocityX == 0 && velocityY == 0) break;

        if (Math.abs(tileDeltaY * velocityY) < Math.abs(tileDeltaX * velocityX)) {
          moveX();
        } else {
          moveY();
        }
      }
      return [x, y, velocityX, velocityY];
}