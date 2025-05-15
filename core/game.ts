export const PROJECTILE_COMPONENT_DEF: {
  type: "projectile";
  velocityX: number;
  velocityY: number;
  radius: number;
  lifetime: number; // Frames before projectile is destroyed
  currentLifetime: number; // Current lifetime counter
} = {
  type: "projectile",
  velocityX: 0,
  velocityY: 0,
  radius: 16,
  lifetime: 120, // 2 seconds at 60fps
  currentLifetime: 0,
};

export const SPRITE_COMPONENT_DEF: {
  type: "sprite";
  imageSrc: string;
  size: number;
} = {
  type: "sprite",
  imageSrc: "",
  size: 128,
};
