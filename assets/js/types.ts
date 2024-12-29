import type { Channel } from "phoenix";

export type ChatMessage = {
  content: string;
  sent_at: number;
};

export type Entity = {
  id: string;
  type: string;
  x: number;
  y: number;
  radius: number;
  velocity_x: number;
  velocity_y: number;
  health: number;
  max_health: number;
  health_accumulator: number;
  wip_message?: string;
  chat_messages?: ChatMessage[];
  radians?: number;
};

export type State = {
  entities: Record<string, Entity>;
};

export type Map = {
  name: string;
  width: number;
  height: number;
  world_x: number;
  world_y: number;
  layer_names: string[];
  layers: Record<string, CanvasImageSource>;
};

export type InventorySlot = {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type InventoryItemCollider = {
  offset_x: number;
  offset_y: number;
  width: number;
  height: number;
};

export type InventoryItem = {
  id: string;
  type: string;
  x: number;
  y: number;
  colliders: InventoryItemCollider[];
};

export type Inventory = {
  slots: InventorySlot[];
  items: Record<string, InventoryItem>;
};

declare global {
  interface Window {
    state: State;
    channel: Channel;
    inventory: Inventory;
    map: Map;
    userToken: string;
  }
}
