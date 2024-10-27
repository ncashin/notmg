export type Projectile = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  collisionRadius: number;
};

export const interpolateProjectile = (
  projectile: Projectile,
  serverProjectile: Projectile,
  interpolationTime: number
) => ({
  ...serverProjectile,
  x: projectile.x + (serverProjectile.x - projectile.x) * interpolationTime,
  y: projectile.y + (serverProjectile.y - projectile.y) * interpolationTime,
});
