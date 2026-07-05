import fs from "node:fs";
import path from "node:path";
import type { OpenPosition } from "./types.js";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "positions.json");

function load(): Record<string, OpenPosition> {
  if (!fs.existsSync(FILE_PATH)) return {};
  return JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
}

function save(positions: Record<string, OpenPosition>) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(positions, null, 2));
}

export function getPosition(symbol: string): OpenPosition | undefined {
  return load()[symbol];
}

export function setPosition(position: OpenPosition) {
  const positions = load();
  positions[position.symbol] = position;
  save(positions);
}

export function clearPosition(symbol: string) {
  const positions = load();
  delete positions[symbol];
  save(positions);
}
