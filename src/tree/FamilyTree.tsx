import type { ReactNode } from "react";
import type { TreeEdge, TreeGraph } from "./buildGraph";
import {
  CARD_HEIGHT,
  cardCenter,
  layoutTree,
  spouseMidpoint,
  type LayoutResult,
  type Position,
} from "./layoutTree";
import { PersonCard } from "./PersonCard";

interface FamilyTreeProps {
  graph: TreeGraph;
  selectedId: string | null;
  zoom: number;
  onSelect: (id: string) => void;
}

function buildEdgePaths(
  edges: TreeEdge[],
  positions: Map<string, Position>,
): ReactNode[] {
  const paths: React.ReactNode[] = [];
  const drawnSpouse = new Set<string>();

  for (const edge of edges) {
    if (edge.type === "spouse") {
      const key = [edge.from, edge.to].sort().join("-");
      if (drawnSpouse.has(key)) continue;
      drawnSpouse.add(key);

      const a = positions.get(edge.from);
      const b = positions.get(edge.to);
      if (!a || !b) continue;

      const ca = cardCenter(a);
      const cb = cardCenter(b);
      paths.push(
        <line
          key={`spouse-${key}`}
          x1={ca.x}
          y1={ca.y}
          x2={cb.x}
          y2={cb.y}
          className="tree-edge tree-edge--spouse"
        />,
      );
      continue;
    }

    if (edge.type === "parent") {
      const parent = positions.get(edge.from);
      const child = positions.get(edge.to);
      if (!parent || !child) continue;

      const parentCenter = cardCenter(parent);
      const childCenter = cardCenter(child);

      // Check if parent has spouse on same row — draw from couple midpoint
      const spouseEdge = edges.find(
        (e) =>
          e.type === "spouse" &&
          (e.from === edge.from || e.to === edge.from),
      );
      let fromX = parentCenter.x;
      let fromY = parentCenter.y;
      if (spouseEdge) {
        const spouseId =
          spouseEdge.from === edge.from ? spouseEdge.to : spouseEdge.from;
        const spousePos = positions.get(spouseId);
        if (spousePos && spousePos.y === parent.y) {
          const mid = spouseMidpoint(parent, spousePos);
          fromX = mid.x;
          fromY = parent.y + CARD_HEIGHT;
        } else {
          fromY = parent.y + CARD_HEIGHT;
        }
      } else {
        fromY = parent.y + CARD_HEIGHT;
      }

      const midY = (fromY + childCenter.y - CARD_HEIGHT / 2) / 2;
      const pathKey = `parent-${edge.from}-${edge.to}`;

      paths.push(
        <path
          key={pathKey}
          d={`M ${fromX} ${fromY} L ${fromX} ${midY} L ${childCenter.x} ${midY} L ${childCenter.x} ${childCenter.y - CARD_HEIGHT / 2}`}
          className="tree-edge tree-edge--parent"
          fill="none"
        />,
      );
    }
  }

  return paths;
}

export function FamilyTree({ graph, selectedId, zoom, onSelect }: FamilyTreeProps) {
  const layout: LayoutResult = layoutTree(graph.nodes, graph.edges);
  const { positions, width, height } = layout;
  const padding = 32;
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
