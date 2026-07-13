import type { TreeEdge, TreeNode } from "./buildGraph";

export const CARD_WIDTH = 128;
export const CARD_HEIGHT = 88;
export const H_GAP = 24;
export const V_GAP = 80;
export const SPOUSE_GAP = 12;

export interface Position {
  x: number;
  y: number;
}

export interface LayoutResult {
  positions: Map<string, Position>;
  width: number;
  height: number;
}

/** Simple row-based layout: one row per generation. */
export function layoutTree(
  nodes: TreeNode[],
  edges: TreeEdge[],
): LayoutResult {
  if (nodes.length === 0) {
    return { positions: new Map(), width: 400, height: 200 };
  }

  const spousePairs = new Map<string, string>();
  for (const e of edges) {
    if (e.type === "spouse") {
      spousePairs.set(e.from, e.to);
      spousePairs.set(e.to, e.from);
    }
  }

  const byGen = new Map<number, TreeNode[]>();
  for (const node of nodes) {
    const list = byGen.get(node.generation) ?? [];
    list.push(node);
    byGen.set(node.generation, list);
  }

  const gens = [...byGen.keys()].sort((a, b) => a - b);
  const minGen = gens[0];
  const positions = new Map<string, Position>();
  const placed = new Set<string>();

  let maxWidth = 0;

  for (const gen of gens) {
    const row = byGen.get(gen)!;
    const units: string[][] = [];

    for (const node of row) {
      if (placed.has(node.id)) continue;
      const partnerId = spousePairs.get(node.id);
      if (partnerId && row.some((n) => n.id === partnerId) && !placed.has(partnerId)) {
        units.push([node.id, partnerId]);
        placed.add(node.id);
        placed.add(partnerId);
      } else {
        units.push([node.id]);
        placed.add(node.id);
      }
    }

    const rowWidth =
      units.reduce((sum, unit) => {
        const w =
          unit.length === 2
            ? CARD_WIDTH * 2 + SPOUSE_GAP
            : CARD_WIDTH;
        return sum + w;
      }, 0) +
      Math.max(0, units.length - 1) * H_GAP;

    maxWidth = Math.max(maxWidth, rowWidth);

    let x = 0;
    const y = (gen - minGen) * (CARD_HEIGHT + V_GAP);

    for (const unit of units) {
      if (unit.length === 2) {
        positions.set(unit[0], { x, y });
        positions.set(unit[1], { x: x + CARD_WIDTH + SPOUSE_GAP, y });
        x += CARD_WIDTH * 2 + SPOUSE_GAP + H_GAP;
      } else {
        positions.set(unit[0], { x, y });
        x += CARD_WIDTH + H_GAP;
      }
    }
  }

  // Center each row
  for (const gen of gens) {
    const ids = [...positions.entries()]
      .filter(([, pos]) => pos.y === (gen - minGen) * (CARD_HEIGHT + V_GAP))
      .map(([id]) => id);

    if (ids.length === 0) continue;

    const xs = ids.map((id) => positions.get(id)!.x);
    const rowW = Math.max(...xs) + CARD_WIDTH - Math.min(...xs);
    const offset = (maxWidth - rowW) / 2 - Math.min(...xs);

    for (const id of ids) {
      const p = positions.get(id)!;
      positions.set(id, { x: p.x + offset, y: p.y });
    }
  }

  const height = gens.length * (CARD_HEIGHT + V_GAP);
  return { positions, width: maxWidth, height };
}

export function cardCenter(pos: Position): Position {
  return { x: pos.x + CARD_WIDTH / 2, y: pos.y + CARD_HEIGHT / 2 };
}

export function spouseMidpoint(
  a: Position,
  b: Position,
): Position {
  const ca = cardCenter(a);
  const cb = cardCenter(b);
  return { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 };
}
