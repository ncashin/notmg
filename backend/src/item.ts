import { items } from "../schema";
import { database } from "./database";

export const createItem = async (
  userID: string,
  offsetX: number,
  offsetY: number,
) => {
  const [item] = await database
    .insert(items)
    .values({
      id: crypto.randomUUID(),
      userID,
      offsetX,
      offsetY,
      equipped: false,
    })
    .returning();
  return item;
};
