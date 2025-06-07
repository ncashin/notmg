export const PROJECTILE_COMPONENT_DEF: {
  networked: true;
  type: "projectile";
  velocityX: number;
  velocityY: number;
  radius: number;
  lifetime: number; // Frames before projectile is destroyed
  currentLifetime: number; // Current lifetime counter
  source: "player" | "boss"; // Who created the projectile
  damage: number; // Amount of damage the projectile deals
} = {
  networked: true,
  type: "projectile",
  velocityX: 0,
  velocityY: 0,
  radius: 16,
  lifetime: 120, // 2 seconds at 60fps
  currentLifetime: 0,
  source: "player", // Default to player for backward compatibility
  damage: 10, // Default damage value
};

export const SPRITE_COMPONENT_DEF: {
  networked: true;

  type: "sprite";
  imageSrc: string;
  size: number;
} = {
  networked: true,
  type: "sprite",
  imageSrc: "",
  size: 128,
};

export const HEALTH_COMPONENT_DEF: {
  networked: true;

  type: "health";
  maxHealth: number;
  currentHealth: number;
} = {
  networked: true,

  type: "health",
  maxHealth: 100,
  currentHealth: 100,
};
