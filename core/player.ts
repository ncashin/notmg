import type { items } from "backend/schema";

export const PLAYER_COMPONENT_DEF = {
  networked: true,
  type: "player",
  username: "",
  shootCooldown: 30,
  currentCooldown: 0,
  isDead: false,
  respawnTime: 0,
  respawnDuration: 180,
};
export const INVENTORY_COMPONENT_DEF = {
  networked: true,
  type: "inventory",
  items: [] as (typeof items.$inferSelect)[],
};

export type PlayerComponent = typeof PLAYER_COMPONENT_DEF;
