export const PLAYER_COMPONENT_DEF = {
  networked: true,
  type: "player",
  username: "", // Player's name
  shootCooldown: 30, // Frames between shots
  currentCooldown: 0, // Current cooldown counter
  isDead: false, // Whether the player is currently dead
  respawnTime: 0, // Current respawn timer
  respawnDuration: 180, // How long respawn takes
};
export const INVENTORY_COMPONENT_DEF = {
  networked: true,
  type: "inventory",
  items: [],
};

export type PlayerComponent = typeof PLAYER_COMPONENT_DEF;
