import type { TreeEdge, TreeNode } from "./buildGraph";

export const CARD_WIDTH = 168;
export const CARD_HEIGHT = 84;
/** Horizontal gap between non-spouse branches / sibling cards. */
export const H_GAP = 48;
/** Vertical gap between generation rows (card bottom → next card top). */
export const V_GAP = 140;
/** Gap between spouses in a couple (edge of card → edge of card). */
export const SPOUSE_GAP = 28;
/** Gap between sibling cards under the same couple. */
export const SIBLING_GAP = 40;

export interface Position {
  x: number;
  y: number;
}

export interface LayoutResult {
  positions: Map<string, Position>;
  width: number;
  height: number;
}

/** Logical family: spouses united, children hang from that union. */
export interface FamilyUnit {
  id: string;
  spouses: string[];
  children: string[];
}

/** @deprecated Use FamilyUnit */
export type FamilyGroup = FamilyUnit;

/**
 * Build family units from graph edges.
 * Prefers edge.familyId; parent edges without id are merged by child set.
 */
export function buildFamilyUnits(edges: TreeEdge[]): FamilyUnit[] {
  const byId = new Map<string, FamilyUnit>();

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

  // Merge anon parent-only fragments that share the same child into one unit
  // when both parents point at the same child without a shared familyId.
  const anon = [...byId.values()].filter((f) => f.id.startsWith("anon:"));
  if (anon.length > 1) {
    const byChild = new Map<string, FamilyUnit[]>();
    for (const fam of anon) {
      for (const child of fam.children) {
        const list = byChild.get(child) ?? [];
        list.push(fam);
        byChild.set(child, list);
      }
    }
    for (const [, frags] of byChild) {
      if (frags.length < 2) continue;
      const primary = frags[0];
      for (let i = 1; i < frags.length; i++) {
        const other = frags[i];
        if (other === primary || !byId.has(other.id)) continue;
        for (const s of other.spouses) {
          if (!primary.spouses.includes(s)) primary.spouses.push(s);
        }
        for (const c of other.children) {
          if (!primary.children.includes(c)) primary.children.push(c);
        }
        byId.delete(other.id);
      }
    }
  }

  return [...byId.values()];
}

/** Alias kept for FamilyTree connectors. */
export function buildFamilies(edges: TreeEdge[]): FamilyUnit[] {
  return buildFamilyUnits(edges);
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

function orderSpouses(
  spouseIds: string[],
  nodeById: Map<string, TreeNode>,
): string[] {
  if (spouseIds.length <= 1) return spouseIds;
  const nodes = spouseIds.map((id) => nodeById.get(id)!).filter(Boolean);
  const male = nodes.find((n) => n.individual.sex === "M");
  const female = nodes.find((n) => n.individual.sex === "F");
  if (male && female && male.id !== female.id) {
    return [male.id, female.id];
  }
  return [...spouseIds].sort();
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

interface Block {
  /** x relative to block left; depth 0 = block root person(s) row. */
  local: Map<string, { x: number; depth: number }>;
  width: number;
  rootCenterX: number;
}

function singleCard(personId: string): Block {
  return {
    local: new Map([[personId, { x: 0, depth: 0 }]]),
    width: CARD_WIDTH,
    rootCenterX: CARD_WIDTH / 2,
  };
}

function normalizeBlock(local: Map<string, { x: number; depth: number }>): Block {
  const xs = [...local.values()].map((p) => p.x);
  const minX = Math.min(...xs);
  if (minX !== 0) {
    for (const [id, pos] of local) {
      local.set(id, { x: pos.x - minX, depth: pos.depth });
    }
  }
  let maxR = 0;
  for (const pos of local.values()) {
    maxR = Math.max(maxR, pos.x + CARD_WIDTH);
  }
  return { local, width: maxR, rootCenterX: 0 };
}

function depthsIn(block: Block): number[] {
  const set = new Set<number>();
  for (const pos of block.local.values()) set.add(pos.depth);
  return [...set].sort((a, b) => a - b);
}

function extentAtDepth(
  block: Block,
  depth: number,
  offset: number,
): { left: number; right: number } | null {
  let left = Infinity;
  let right = -Infinity;
  let found = false;
  for (const pos of block.local.values()) {
    if (pos.depth !== depth) continue;
    found = true;
    left = Math.min(left, pos.x + offset);
    right = Math.max(right, pos.x + offset + CARD_WIDTH);
  }
  return found ? { left, right } : null;
}

/**
 * Couple-first pedigree layout: Kind → Eltern-Paar → deren Eltern-Paare …
 *
 * Spouses are placed as a tight couple; each spouse's ancestor block sits above
 * them. Contour separation prevents overlaps while keeping the marriage bar short
 * when trees allow it.
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

  const units = buildFamilyUnits(edges);
  const parentFamilyOf = new Map<string, FamilyUnit>();
  for (const fam of units) {
    for (const child of fam.children) {
      if (!parentFamilyOf.has(child)) parentFamilyOf.set(child, fam);
    }
  }

  const visiting = new Set<string>();

  function layoutAncestry(personId: string, includeSiblings: boolean): Block {
    if (!nodeById.has(personId)) return singleCard(personId);
    if (visiting.has(personId)) return singleCard(personId);
    visiting.add(personId);

    const fam = parentFamilyOf.get(personId);
    if (!fam) {
      visiting.delete(personId);
      return singleCard(personId);
    }

    const spouses = orderSpouses(
      fam.spouses.filter((id) => nodeById.has(id)),
      nodeById,
    );

    if (spouses.length === 0) {
      visiting.delete(personId);
      return singleCard(personId);
    }

    const spouseBlocks = spouses.map((s) => layoutAncestry(s, false));
    const local = new Map<string, { x: number; depth: number }>();

    if (spouses.length === 1) {
      const block = spouseBlocks[0];
      for (const [id, pos] of block.local) {
        local.set(id, { x: pos.x, depth: pos.depth + 1 });
      }
    } else {
      const left = spouseBlocks[0];
      const right = spouseBlocks[1];
      const leftSpouse = left.local.get(spouses[0])!;
      const rightSpouse = right.local.get(spouses[1])!;

      // Ideal: spouses adjacent with SPOUSE_GAP
      let rightOffset =
        leftSpouse.x + CARD_WIDTH + SPOUSE_GAP - rightSpouse.x;

      // Contour: push right block until no generation overlaps
      const allDepths = new Set([
        ...depthsIn(left),
        ...depthsIn(right),
      ]);
      for (const d of allDepths) {
        const L = extentAtDepth(left, d, 0);
        const R = extentAtDepth(right, d, rightOffset);
        if (!L || !R) continue;
        const minGap = d === 0 ? SPOUSE_GAP : H_GAP;
        const need = L.right + minGap - R.left;
        if (need > 0) rightOffset += need;
      }

      for (const [id, pos] of left.local) {
        local.set(id, { x: pos.x, depth: pos.depth + 1 });
      }
      for (const [id, pos] of right.local) {
        if (local.has(id)) continue; // shared ancestor: keep first placement
        local.set(id, { x: pos.x + rightOffset, depth: pos.depth + 1 });
      }
    }

    // Children under the couple (or single parent)
    const kidIds = includeSiblings
      ? fam.children.filter((id) => nodeById.has(id))
      : [personId].filter((id) => nodeById.has(id));

    const spouseCenters = spouses
      .map((id) => local.get(id))
      .filter(Boolean)
      .map((p) => p!.x + CARD_WIDTH / 2);
    const coupleCenter =
      spouseCenters.reduce((a, b) => a + b, 0) / Math.max(spouseCenters.length, 1);

    const kidsWidth =
      kidIds.length * CARD_WIDTH + Math.max(0, kidIds.length - 1) * SIBLING_GAP;
    const kidStart = coupleCenter - kidsWidth / 2;

    for (let i = 0; i < kidIds.length; i++) {
      local.set(kidIds[i], {
        x: kidStart + i * (CARD_WIDTH + SIBLING_GAP),
        depth: 0,
      });
    }

    const block = normalizeBlock(local);
    const root = block.local.get(personId);
    block.rootCenterX = root ? root.x + CARD_WIDTH / 2 : coupleCenter;

    visiting.delete(personId);
    return block;
  }

  const cone = layoutAncestry(focus, true);
  const maxDepth = Math.max(0, ...[...cone.local.values()].map((p) => p.depth));

  const positions = new Map<string, Position>();
  for (const [id, pos] of cone.local) {
    positions.set(id, {
      x: pos.x,
      y: (maxDepth - pos.depth) * (CARD_HEIGHT + V_GAP),
    });
  }

  // Nodes outside the focus ancestor cone (and not siblings already placed)
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
