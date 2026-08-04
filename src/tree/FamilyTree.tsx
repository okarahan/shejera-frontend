import { useEffect, useRef, type ReactNode } from "react";
import type { TreeEdge, TreeGraph } from "./buildGraph";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  buildFamilies,
  cardCenter,
  layoutTree,
  pickFocusPersonId,
  type LayoutResult,
  type Position,
} from "./layoutTree";
import { PersonCard } from "./PersonCard";

interface FamilyTreeProps {
  graph: TreeGraph;
  selectedId: string | null;
  zoom: number;
  onSelect: (id: string) => void;
  /** Pedigree focus (OCR root / central person). Defaults to pickFocusPersonId. */
  focusId?: string | null;
}

/**
 * Classic family connectors (once per family, never parent→child separately):
 *
 *   [Father]————×————[Mother]     ← spouse bar; × = union junction
 *               |
 *        -------+-------           ← sibling bus (if >1 child)
 *        |             |
 *     [Child]       [Child]
 */
function buildEdgePaths(
  edges: TreeEdge[],
  positions: Map<string, Position>,
): ReactNode[] {
  const paths: ReactNode[] = [];
  const families = buildFamilies(edges);
  const drawnSpouseKeys = new Set<string>();
  const coveredChildren = new Set<string>();

  for (const fam of families) {
    const spousePos = fam.spouses
      .map((id) => {
        const pos = positions.get(id);
        return pos ? { id, pos } : null;
      })
      .filter((x): x is { id: string; pos: Position } => !!x)
      .sort((a, b) => a.pos.x - b.pos.x);

    const childPos = fam.children
      .map((id) => {
        const pos = positions.get(id);
        return pos ? { id, pos } : null;
      })
      .filter((x): x is { id: string; pos: Position } => !!x)
      .sort((a, b) => a.pos.x - b.pos.x);

    if (spousePos.length === 0) continue;

    const barY =
      spousePos.reduce((sum, s) => sum + s.pos.y, 0) / spousePos.length +
      CARD_HEIGHT / 2;

    // --- Spouse bar + union junction X ---
    let junctionX: number;
    if (spousePos.length >= 2) {
      const left = spousePos[0];
      const right = spousePos[spousePos.length - 1];
      const x1 = left.pos.x + CARD_WIDTH;
      const x2 = right.pos.x;
      // Midpoint of the marriage segment (the visual “×”)
      junctionX = (x1 + x2) / 2;

      const key = [left.id, right.id].sort().join("-");
      if (!drawnSpouseKeys.has(key)) {
        drawnSpouseKeys.add(key);
        paths.push(
          <line
            key={`spouse-${fam.id}-${key}`}
            x1={x1}
            y1={barY}
            x2={x2}
            y2={barY}
            className="tree-edge tree-edge--spouse"
          />,
        );
      }
    } else {
      junctionX = spousePos[0].pos.x + CARD_WIDTH / 2;
    }

    if (childPos.length === 0) continue;

    const childTop = Math.min(...childPos.map((c) => c.pos.y));
    if (childTop <= barY + 8) continue;

    const busY = barY + Math.min(Math.max((childTop - barY) * 0.45, 40), childTop - barY - 20);

    // Stem from the couple union down to the sibling bus (forms the cross on the spouse bar)
    paths.push(
      <path
        key={`stem-${fam.id}`}
        d={`M ${junctionX} ${barY} L ${junctionX} ${busY}`}
        className="tree-edge tree-edge--parent"
        fill="none"
      />,
    );

    const childCenters = childPos.map((c) => c.pos.x + CARD_WIDTH / 2);
    const busLeft = Math.min(junctionX, ...childCenters);
    const busRight = Math.max(junctionX, ...childCenters);

    if (childPos.length > 1 || busLeft !== busRight) {
      paths.push(
        <path
          key={`bus-${fam.id}`}
          d={`M ${busLeft} ${busY} L ${busRight} ${busY}`}
          className="tree-edge tree-edge--parent"
          fill="none"
        />,
      );
    }

    for (const child of childPos) {
      coveredChildren.add(child.id);
      const cx = child.pos.x + CARD_WIDTH / 2;
      paths.push(
        <path
          key={`child-${fam.id}-${child.id}`}
          d={`M ${cx} ${busY} L ${cx} ${child.pos.y}`}
          className="tree-edge tree-edge--parent"
          fill="none"
        />,
      );
    }
  }

  // Single-parent leftovers only (never draw mother→child and father→child separately)
  const parentsByChild = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type !== "parent") continue;
    if (coveredChildren.has(edge.to)) continue;
    const list = parentsByChild.get(edge.to) ?? [];
    if (!list.includes(edge.from)) list.push(edge.from);
    parentsByChild.set(edge.to, list);
  }

  for (const [childId, parentIds] of parentsByChild) {
    const child = positions.get(childId);
    if (!child) continue;
    const parents = parentIds
      .map((id) => {
        const pos = positions.get(id);
        return pos ? { id, pos } : null;
      })
      .filter((x): x is { id: string; pos: Position } => !!x)
      .sort((a, b) => a.pos.x - b.pos.x);
    if (parents.length === 0) continue;

    const barY =
      parents.reduce((sum, p) => sum + p.pos.y, 0) / parents.length +
      CARD_HEIGHT / 2;
    let junctionX: number;
    if (parents.length >= 2) {
      const left = parents[0];
      const right = parents[parents.length - 1];
      const x1 = left.pos.x + CARD_WIDTH;
      const x2 = right.pos.x;
      junctionX = (x1 + x2) / 2;
      const key = [left.id, right.id].sort().join("-");
      if (!drawnSpouseKeys.has(key)) {
        drawnSpouseKeys.add(key);
        paths.push(
          <line
            key={`spouse-fallback-${key}`}
            x1={x1}
            y1={barY}
            x2={x2}
            y2={barY}
            className="tree-edge tree-edge--spouse"
          />,
        );
      }
    } else {
      junctionX = parents[0].pos.x + CARD_WIDTH / 2;
    }

    if (child.y <= barY + 8) continue;
    const midY = barY + Math.max(28, (child.y - barY) * 0.45);
    paths.push(
      <path
        key={`fallback-${childId}`}
        d={`M ${junctionX} ${barY} L ${junctionX} ${midY} L ${cardCenter(child).x} ${midY} L ${cardCenter(child).x} ${child.y}`}
        className="tree-edge tree-edge--parent"
        fill="none"
      />,
    );
  }

  return paths;
}

export function FamilyTree({
  graph,
  selectedId,
  zoom,
  onSelect,
  focusId,
}: FamilyTreeProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selectedId]);

  const focus =
    focusId ?? pickFocusPersonId(graph.nodes, graph.edges);
  const layout: LayoutResult = layoutTree(graph.nodes, graph.edges, focus);
  const { positions, width, height } = layout;
  const padding = 40;
  const svgWidth = width + padding * 2;
  const svgHeight = height + padding * 2;

  const offsetPositions = new Map<string, Position>();
  for (const [id, pos] of positions) {
    offsetPositions.set(id, { x: pos.x + padding, y: pos.y + padding });
  }

  return (
    <div
      className="tree-viewport__stage"
      style={{ width: svgWidth * zoom, height: svgHeight * zoom }}
    >
      <div
        className="family-tree"
        style={{
          width: svgWidth,
          height: svgHeight,
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
        }}
      >
        <svg
          className="family-tree__svg"
          width={svgWidth}
          height={svgHeight}
          aria-hidden
        >
          {buildEdgePaths(graph.edges, offsetPositions)}
        </svg>
        <div className="family-tree__cards">
          {graph.nodes.map((node) => {
            const pos = offsetPositions.get(node.id);
            if (!pos) return null;
            return (
              <PersonCard
                key={node.id}
                ref={selectedId === node.id ? selectedRef : undefined}
                person={node.individual}
                x={pos.x}
                y={pos.y}
                selected={selectedId === node.id}
                onClick={() => onSelect(node.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
