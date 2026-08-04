import type { TreeEdge, TreeNode } from "./buildGraph";

export const CARD_WIDTH = 168;
export const CARD_HEIGHT = 84;
export const H_GAP = 64;
export const V_GAP = 168;
export const SPOUSE_GAP = 36;

export interface Position {
  x: number;
  y: number;
}

export interface LayoutResult {
  positions: Map<string, Position>;
  width: number;
  height: number;
}

interface FamilyGroup {
  id: string;
  spouses: string[];
  children: string[];
}

function buildFamilies(edges: TreeEdge[]): FamilyGroup[] {
  const byId = new Map<string, FamilyGroup>();

  for (const edge of edges) {
    const fid = edge.familyId ?? `anon:${edge.from}-${edge.to}`;
    let fam = byId.get(fid);
    if (!fam) {
      fam = { id: fid, spouses: [], children: [] };
      byId.set(fid, fam);
    }
    if (edge.type === "spouse") {
      if (!fam.spouses.includes(edge.from)) fam.spouses.push(edge.from);
      if (!fam.spouses.includes(edge.to)) fam.spouses.push(edge.to);
    } else if (edge.type === "parent") {
      if (!fam.spouses.includes(edge.from)) fam.spouses.push(edge.from);
      if (!fam.children.includes(edge.to)) fam.children.push(edge.to);
    }
  }

  return [...byId.values()];
}

function parentsOf(personId: string, edges: TreeEdge[]): string[] {
  const ids: string[] = [];
  for (const edge of edges) {
    if (edge.type === "parent" && edge.to === personId && !ids.includes(edge.from)) {
      ids.push(edge.from);
    }
  }
  return ids;
}

function orderParents(
  parentIds: string[],
  nodeById: Map<string, TreeNode>,
): string[] {
  if (parentIds.length <= 1) return parentIds;
  const nodes = parentIds.map((id) => nodeById.get(id)!).filter(Boolean);
  const male = nodes.find((n) => n.individual.sex === "M");
  const female = nodes.find((n) => n.individual.sex === "F");
  if (male && female && male.id !== female.id) {
    // Visual: father left, mother right (common pedigree convention)
    return [male.id, female.id];
  }
  return [...parentIds].sort();
}

/**
 * Focus = OCR "root" when present, else deepest genealogical leaf.
 */
export function pickFocusPersonId(
  nodes: TreeNode[],
  edges: TreeEdge[],
): string | null {
  if (nodes.length === 0) return null;
  if (nodes.some((n) => n.id === "root")) return "root";

  const asParent = new Set(
    edges.filter((e) => e.type === "parent").map((e) => e.from),
  );
  const asChild = new Set(
    edges.filter((e) => e.type === "parent").map((e) => e.to),
  );
  const leaves = nodes.filter((n) => asChild.has(n.id) && !asParent.has(n.id));
  const candidates = leaves.length > 0 ? leaves : nodes;

  let bestId = candidates[0].id;
  let bestDepth = -1;
  for (const node of candidates) {
    const dist = new Map<string, number>([[node.id, 0]]);
    const queue = [node.id];
    let maxD = 0;
    while (queue.length) {
      const id = queue.shift()!;
      const d = dist.get(id)!;
      maxD = Math.max(maxD, d);
      for (const p of parentsOf(id, edges)) {
        if (!dist.has(p)) {
          dist.set(p, d + 1);
          queue.push(p);
        }
      }
    }
    if (maxD > bestDepth) {
      bestDepth = maxD;
      bestId = node.id;
    }
  }
  return bestId;
}

interface SubtreeLayout {
  /** Local positions (x relative to subtree left = 0). */
  local: Map<string, { x: number; depth: number }>;
  width: number;
  /** X center of the subtree's root person card. */
  rootCenterX: number;
}

/**
 * Hierarchical layout from focus → parents → grandparents.
 *
 * Algorithm walks Kind → Eltern → …; visually oldest ancestors sit at the top
 * and the focus person at the bottom. Subtrees are side-by-side (no crossed branches).
 */
export function layoutTree(
  nodes: TreeNode[],
  edges: TreeEdge[],
  focusId?: string | null,
): LayoutResult {
  if (nodes.length === 0) {
    return { positions: new Map(), width: 400, height: 200 };
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const focus =
    focusId && nodeById.has(focusId)
      ? focusId
      : pickFocusPersonId(nodes, edges);
  if (!focus) {
    return { positions: new Map(), width: 400, height: 200 };
  }

  const visiting = new Set<string>();

  function layoutAncestorCone(personId: string): SubtreeLayout {
    if (visiting.has(personId)) {
      // Cycle guard
      return {
        local: new Map([[personId, { x: 0, depth: 0 }]]),
        width: CARD_WIDTH,
        rootCenterX: CARD_WIDTH / 2,
      };
    }
    visiting.add(personId);

    const pars = orderParents(parentsOf(personId, edges), nodeById).filter(
      (id) => nodeById.has(id),
    );

    if (pars.length === 0) {
      visiting.delete(personId);
      return {
        local: new Map([[personId, { x: 0, depth: 0 }]]),
        width: CARD_WIDTH,
        rootCenterX: CARD_WIDTH / 2,
      };
    }

    // Layout each parent's ancestor cone
    const parentLayouts = pars.map((pid) => layoutAncestorCone(pid));

    // Place parent subtrees side by side
    const local = new Map<string, { x: number; depth: number }>();
    let cursor = 0;
    const parentCenters: number[] = [];

    for (let i = 0; i < parentLayouts.length; i++) {
      if (i > 0) cursor += H_GAP;
      const pl = parentLayouts[i];
      for (const [id, pos] of pl.local) {
        local.set(id, { x: pos.x + cursor, depth: pos.depth + 1 });
      }
      parentCenters.push(pl.rootCenterX + cursor);
      cursor += pl.width;
    }

    const coupleCenter =
      parentCenters.reduce((a, b) => a + b, 0) / parentCenters.length;
    const personX = coupleCenter - CARD_WIDTH / 2;
    local.set(personId, { x: personX, depth: 0 });

    const allX = [...local.values()].map((p) => p.x);
    const minX = Math.min(...allX, personX);
    const maxX = Math.max(
      ...allX.map((x) => x + CARD_WIDTH),
      personX + CARD_WIDTH,
    );

    // Normalize local x to start at 0
    if (minX !== 0) {
      for (const [id, pos] of local) {
        local.set(id, { x: pos.x - minX, depth: pos.depth });
      }
    }

    const width = maxX - minX;
    const root = local.get(personId)!;
    visiting.delete(personId);
    return {
      local,
      width,
      rootCenterX: root.x + CARD_WIDTH / 2,
    };
  }

  const cone = layoutAncestorCone(focus);
  const maxDepth = Math.max(0, ...[...cone.local.values()].map((p) => p.depth));

  const positions = new Map<string, Position>();
  for (const [id, pos] of cone.local) {
    // Focus (depth 0) at bottom; oldest ancestors (max depth) at top.
    positions.set(id, {
      x: pos.x,
      y: (maxDepth - pos.depth) * (CARD_HEIGHT + V_GAP),
    });
  }

  // Anyone not in the ancestor cone of focus → place to the right
  let orphanX = cone.width + H_GAP;
  for (const node of nodes) {
    if (positions.has(node.id)) continue;
    positions.set(node.id, {
      x: orphanX,
      y: maxDepth * (CARD_HEIGHT + V_GAP),
    });
    orphanX += CARD_WIDTH + H_GAP;
  }

  let maxX = 0;
  let maxY = 0;
  for (const pos of positions.values()) {
    maxX = Math.max(maxX, pos.x + CARD_WIDTH);
    maxY = Math.max(maxY, pos.y + CARD_HEIGHT);
  }

  return {
    positions,
    width: Math.max(maxX, 400),
    height: Math.max(maxY + 40, CARD_HEIGHT + V_GAP),
  };
}

export function cardCenter(pos: Position): Position {
  return { x: pos.x + CARD_WIDTH / 2, y: pos.y + CARD_HEIGHT / 2 };
}

export function spouseMidpoint(a: Position, b: Position): Position {
  const ca = cardCenter(a);
  const cb = cardCenter(b);
  return { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 };
}

export { buildFamilies };
export type { FamilyGroup };
