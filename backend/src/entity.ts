import type { Projectile } from "./game";

export const updateEntity = (entity: Entity) => {
  return entityDefinitions[entity.type].update(entity);
};

export const entityDefinitions: Record<string, EntityDefinition> = {
  leviathan: {
    update: (entity: Entity) => {
      const newProjectiles: Projectile[] = [
        {
          x: 0,
          y: 0,
          dx: 5,
          dy: 0,
          collisionRadius: 0.1,
        },
      ];
      return [entity, newProjectiles];
    },
    stats: {
      maxHealth: 5,
      health: 5,
    },
  },
};

export type Entity = {
  type: keyof typeof entityDefinitions;
  x: number;
  y: number;
  maxHealth: number;
  health: number;
};
export type EntityDefinition = {
  update: (entity: Entity) => [Entity, Projectile[]];
  stats: {
    maxHealth: number;
    health: number;
  };
};
