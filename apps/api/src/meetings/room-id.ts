import { randomInt } from "node:crypto";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export const ROOM_ID_LENGTH = 12;

/** Random 12-character room ID (ARCHITECTURE.md section 9), about 62 bits of entropy. */
export function generateRoomId(): string {
  let id = "";
  for (let i = 0; i < ROOM_ID_LENGTH; i += 1) id += ALPHABET[randomInt(ALPHABET.length)];
  return id;
}
