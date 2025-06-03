import { POSITION_COMPONENT_DEF } from "../../core/collision";
import type { Entity } from "../../core/ecs";
import { SPRITE_COMPONENT_DEF } from "../../core/game";
import { addComponent, createEntity } from "../ecsProvider";

export const INTERACTABLE_COMPONENT_DEF = {
  type: "interactable" as const,
  radius: 100, // Interaction radius in pixels
  id: "", // Unique identifier for the interactable
};

export const SHRINE_INTERACTABLE_ID = "shrine";

export const createShrine = (x: number, y: number): Entity => {
  const shrine = createEntity();
  
  addComponent(shrine, {
    ...POSITION_COMPONENT_DEF,
    x,
    y,
  });

  addComponent(shrine, {
    ...SPRITE_COMPONENT_DEF,
    imageSrc: "/skull.png",
    size: 60,
  });

  addComponent(shrine, {
    ...INTERACTABLE_COMPONENT_DEF,
    id: SHRINE_INTERACTABLE_ID,
  });

  return shrine;
};

// Function to randomly place shrines in the world
export const createRandomShrines = (count: number, worldBounds: { minX: number; maxX: number; minY: number; maxY: number }) => {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * (worldBounds.maxX - worldBounds.minX) + worldBounds.minX;
    const y = Math.random() * (worldBounds.maxY - worldBounds.minY) + worldBounds.minY;
    createShrine(x, y);
  }
}; 