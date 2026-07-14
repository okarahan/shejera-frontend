import type { Family, Individual } from "../api/types";

export type EdgeType = "spouse" | "parent";

export interface TreeEdge {
  from: string;
  to: string;
  type: EdgeType;
  familyId?: string;
}

export interface TreeNode {
  id: string;
  individual: Individual;
  generation: number;
}

export interface TreeGraph {
  nodes: TreeNode[];
  edges: TreeEdge[];
}

function personLabel(ind: Individual): string {
  return [ind.givenName, ind.surname].filter(Boolean).join(" ") || ind.xref;
}

export { personLabel };

/** Collect nodes + edges reachable from root (ancestors, descendants, spouses). */
export function buildTreeGraph(
  rootId: string,
  individuals: Individual[],
  families: Family[],
): TreeGraph {
  const indMap = new Map(individuals.map((i) => [i.id, i]));
  if (!indMap.has(rootId)) return { nodes: [], edges: [] };

  const parentFamilyOf = new Map<string, Family>();
  const spouseFamiliesOf = new Map<string, Family[]>();

  for (const fam of families) {
    for (const child of fam.children) {
      if (!parentFamilyOf.has(child.individualId)) {
        parentFamilyOf.set(child.individualId, fam);
      }
    }
    for (const spouse of fam.spouses) {
      const list = spouseFamiliesOf.get(spouse.individualId) ?? [];
      list.push(fam);
      spouseFamiliesOf.set(spouse.individualId, list);
    }
  }

  const generations = new Map<string, number>();
  const edges: TreeEdge[] = [];
  const edgeKeys = new Set<string>();

  function addEdge(from: string, to: string, type: EdgeType, familyId?: string) {
    const key =
      type === "spouse"
        ? `s:${[from, to].sort().join("-")}`
        : `p:${from}-${to}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from, to, type, familyId });
  }

  function visit(id: string, gen: number) {
    const prev = generations.get(id);
    if (prev !== undefined && prev <= gen) return;
    generations.set(id, gen);

    const parentFam = parentFamilyOf.get(id);
    if (parentFam) {
      for (const spouse of parentFam.spouses) {
        generations.set(spouse.individualId, gen - 1);
        addEdge(spouse.individualId, id, "parent", parentFam.id);
        for (const s2 of parentFam.spouses) {
          if (s2.individualId !== spouse.individualId) {
            addEdge(spouse.individualId, s2.individualId, "spouse", parentFam.id);
          }
        }
        visit(spouse.individualId, gen - 1);
      }
      for (const sibling of parentFam.children) {
        if (sibling.individualId !== id) {
          generations.set(sibling.individualId, gen);
          visit(sibling.individualId, gen);
        }
      }
    }

    const spouseFams = spouseFamiliesOf.get(id) ?? [];
    for (const fam of spouseFams) {
      for (const spouse of fam.spouses) {
        if (spouse.individualId !== id) {
          generations.set(spouse.individualId, gen);
          addEdge(id, spouse.individualId, "spouse", fam.id);
          visit(spouse.individualId, gen);
        }
      }
      for (const child of fam.children) {
        generations.set(child.individualId, gen + 1);
        addEdge(id, child.individualId, "parent", fam.id);
        visit(child.individualId, gen + 1);
      }
    }
  }

  visit(rootId, 0);

  const nodes: TreeNode[] = [...generations.entries()]
    .filter(([id]) => indMap.has(id))
    .map(([id, generation]) => ({
      id,
      generation,
      individual: indMap.get(id)!,
    }));

  return { nodes, edges };
}

/** Build graph with all individuals and all family relationships. */
export function buildFullTreeGraph(
  individuals: Individual[],
  families: Family[],
): TreeGraph {
  const edges: TreeEdge[] = [];
  const edgeKeys = new Set<string>();

  function addEdge(from: string, to: string, type: EdgeType, familyId?: string) {
    const key =
      type === "spouse"
        ? `s:${[from, to].sort().join("-")}`
        : `p:${from}-${to}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from, to, type, familyId });
  }

  for (const fam of families) {
    for (let i = 0; i < fam.spouses.length; i++) {
      for (let j = i + 1; j < fam.spouses.length; j++) {
        addEdge(
          fam.spouses[i].individualId,
          fam.spouses[j].individualId,
          "spouse",
          fam.id,
        );
      }
    }
    for (const spouse of fam.spouses) {
      for (const child of fam.children) {
        addEdge(spouse.individualId, child.individualId, "parent", fam.id);
      }
    }
  }

  const isChild = new Set(
    families.flatMap((f) => f.children.map((c) => c.individualId)),
  );

  const generations = new Map<string, number>();
  for (const ind of individuals) {
    generations.set(ind.id, isChild.has(ind.id) ? -1 : 0);
  }

  function syncGenerations() {
    let changed = true;
    while (changed) {
      changed = false;
      for (const edge of edges) {
        if (edge.type === "parent") {
          const parentGen = generations.get(edge.from) ?? 0;
          const childGen = parentGen + 1;
          const current = generations.get(edge.to) ?? -1;
          if (current < childGen) {
            generations.set(edge.to, childGen);
            changed = true;
          }
        }
      }
      for (const edge of edges) {
        if (edge.type === "spouse") {
          const g1 = generations.get(edge.from) ?? 0;
          const g2 = generations.get(edge.to) ?? 0;
          const aligned = Math.max(g1, g2);
          if (generations.get(edge.from) !== aligned) {
            generations.set(edge.from, aligned);
            changed = true;
          }
          if (generations.get(edge.to) !== aligned) {
            generations.set(edge.to, aligned);
            changed = true;
          }
        }
      }
    }
  }

  syncGenerations();

  // Normalize so minimum generation is 0
  const minGen = Math.min(...generations.values());
  if (minGen !== 0) {
    for (const [id, gen] of generations) {
      generations.set(id, gen - minGen);
    }
  }

  const nodes: TreeNode[] = individuals.map((individual) => ({
    id: individual.id,
    generation: generations.get(individual.id) ?? 0,
    individual,
  }));

  return { nodes, edges };
}

/** Find families where person is a spouse (for adding children). */
export function familiesAsSpouse(
  personId: string,
  families: Family[],
): Family[] {
  return families.filter((f) =>
    f.spouses.some((s) => s.individualId === personId),
  );
}

/** Find family where person is a child (for adding parents). */
export function familyAsChild(
  personId: string,
  families: Family[],
): Family | undefined {
  return families.find((f) =>
    f.children.some((c) => c.individualId === personId),
  );
}
