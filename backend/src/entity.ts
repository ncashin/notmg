import type { Projectile } from "./game";

export const updateEntity = (entity: Entity) => {
  return entityDefinitions[entity.type].update(entity);
};

export const entityDefinitions: Record<string, EntityDefinition> = {
  leviathan: {
    update: (entity: Leviathan) => {
      if (entity.tickCounter !== 60)
        return [{ ...entity, tickCounter: entity.tickCounter + 1 }, []];

      const newProjectiles: Projectile[] = [
        {
          x: 30,
          y: 100,
          dx: 5,
          dy: 0,
          collisionRadius: 16,
        },
      ];
      return [{ ...entity, tickCounter: 0 }, newProjectiles];
    },
    stats: {
      maxHealth: 5,
      health: 5,
    },
  },
};

export type Entity = Leviathan;
export type BaseEntity = {
  type: keyof typeof entityDefinitions;
  x: number;
  y: number;
  maxHealth: number;
  health: number;
};
export type Leviathan = BaseEntity & {
  type: "leviathan";
  tickCounter: number;
};
export type EntityDefinition = {
  update: (entity: Entity) => [Entity, Projectile[]];
  stats: {
    maxHealth: number;
    health: number;
  };
};
