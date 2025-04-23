export const PROJECTILE_COMPONENT_DEF: {
  type: "projectile";
  velocityX: number;
  velocityY: number;
  radius: number;
} = {
  type: "projectile",
  velocityX: 0,
  velocityY: 0,
  radius: 16,
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
