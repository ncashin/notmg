import type { Channel } from "phoenix";
import { Howl } from "howler";

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

export type Event = {
  type: string;
  data: Record<string, any>;
};

export type State = {
  room_id?: string;
  entities: Record<string, Entity>;
  events: Event[];
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
  items: Record<string, InventoryItem | undefined>;
};

export type ParticleColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type Particle = {
  x: number;
  y: number;
  radius: number;
  velocity_x: number;
  velocity_y: number;
  lifetime: number;
  color: ParticleColor;
};

declare global {
  interface Window {
    state: State;
    channel: Channel;
    inventory: Inventory;
    map: Map;
    userToken: string;
    debug: boolean;
    sounds: Record<string, Howl>;
  }
}
