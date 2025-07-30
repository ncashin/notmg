import type { ServerWebSocket, WebSocketHandler } from "bun";
import { BASE_ENTITY_COMPONENT_DEF, Vector2, type ClientMessage } from "core";
import invariant from "tiny-invariant";
import { getComponent, getECSCatchupPacket } from "./ecsProvider";
import { handleSetupPlayer, handleCleanupPlayer } from "./player";
import { addUpdateCallback } from "./update";

export type WebSocketData = {
  entity: number;
};

// Track connected websockets
let connectedSockets: ServerWebSocket<WebSocketData>[] = [];

const sendUpdatePacket = () => {
  const packet = getECSCatchupPacket();
  
  // Serialize Vector2 objects for network transmission
  const serializedPacket = JSON.stringify(packet, (key, value) => {
    if (value instanceof Vector2) {
      return { x: value.x, y: value.y, _isVector2: true };
    }
    return value;
  });

  for (const websocket of connectedSockets) {
    websocket.send(serializedPacket);
  }
};

type MessageHandler = (
  websocket: ServerWebSocket<WebSocketData>,
  message: ClientMessage,
) => void | Promise<void>;

const websocketMessageHandlers: Record<string, MessageHandler> = {
  move: (websocket, message) => {
    invariant(message.type === "move");
    const baseEntity = getComponent(
      websocket.data.entity,
      BASE_ENTITY_COMPONENT_DEF,
    );
    if (!baseEntity) return;
    
    // Deserialize Vector2 objects from network data
    const moveMessage = message as any; // Type assertion needed due to serialization
    
    // Handle both serialized and direct Vector2 objects
    if (moveMessage.position && typeof moveMessage.position === 'object') {
      if (moveMessage.position._isVector2 || (moveMessage.position.x !== undefined && moveMessage.position.y !== undefined)) {
        baseEntity.position.set(moveMessage.position.x, moveMessage.position.y);
      }
    }
    
    if (moveMessage.velocity && typeof moveMessage.velocity === 'object') {
      if (moveMessage.velocity._isVector2 || (moveMessage.velocity.x !== undefined && moveMessage.velocity.y !== undefined)) {
        baseEntity.velocity.set(moveMessage.velocity.x, moveMessage.velocity.y);
      }
    }
    
    if (typeof moveMessage.angle === 'number') {
      baseEntity.angle = moveMessage.angle;
    }
  },
  shoot: (_websocket, message) => {
    invariant(message.type === "shoot");
    // TODO: Implement shooting logic with Vector2 targetPosition
  },
};

export const websocketHandler: WebSocketHandler<WebSocketData> = {
  open(websocket) {
    handleSetupPlayer(websocket);
    websocket.send(
      JSON.stringify({
        type: "initialization",
        playerEntity: websocket.data.entity,
        catchupPacket: getECSCatchupPacket(),
      }),
    );
    connectedSockets.push(websocket);
  },
  message(websocket, message) {
    if (typeof message !== "string") return;

    // Parse and deserialize Vector2 objects
    const parsedMessage = JSON.parse(message, (key, value) => {
      if (value && typeof value === 'object' && value._isVector2) {
        return new Vector2(value.x, value.y);
      }
      return value;
    });
    
    if (parsedMessage && parsedMessage.type in websocketMessageHandlers) {
      const handler =
        websocketMessageHandlers[
          parsedMessage.type as keyof typeof websocketMessageHandlers
        ];
      handler(websocket, parsedMessage);
      return;
    }

    console.error("Unknown or invalid message:", parsedMessage);
  },
  close(websocket) {
    connectedSockets = connectedSockets.filter(
      (socket) => socket !== websocket,
    );
    handleCleanupPlayer(websocket);
  },
};

addUpdateCallback(sendUpdatePacket);
