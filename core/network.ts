import type { Component } from "./ecs";

export type Packet = Record<number, Record<string, Component | null> | null>;
