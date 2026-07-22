import type {
  Family,
  Individual,
  RecognizedFamily,
  RecognizedPerson,
  RecognizedTree,
  Sex,
  SpouseRole,
} from "../api/types";
import { buildFullTreeGraph, type TreeGraph } from "./buildGraph";

function toSex(value: string | null | undefined): Sex | undefined {
  if (!value) return undefined;
  const upper = value.trim().toUpperCase();
  if (upper === "M" || upper === "F" || upper === "X" || upper === "U") {
    return upper;
  }
  return undefined;
}

function spouseRole(sex: Sex | undefined, index: number): SpouseRole {
  if (sex === "M") return "HUSB";
  if (sex === "F") return "WIFE";
  return index === 0 ? "HUSB" : "WIFE";
}

export function recognizedPeopleToIndividuals(
  people: RecognizedPerson[],
): Individual[] {
  return people.map((person) => ({
    id: person.tempId,
    xref: person.tempId,
    givenName: person.givenName ?? undefined,
    surname: person.surname ?? undefined,
    sex: toSex(person.sex),
    isLiving: !person.deathDate,
    birthDate: person.birthDate ?? null,
    deathDate: person.deathDate ?? null,
  }));
}

export function recognizedFamiliesToFamilies(
  families: RecognizedFamily[],
  peopleById: Map<string, RecognizedPerson>,
): Family[] {
  return families.map((family) => ({
    id: family.tempId,
    xref: family.tempId,
    spouses: family.spouseTempIds.map((individualId, sortOrder) => {
      const person = peopleById.get(individualId);
      const sex = toSex(person?.sex);
      return {
        individualId,
        xref: individualId,
        role: spouseRole(sex, sortOrder),
        givenName: person?.givenName ?? null,
        surname: person?.surname ?? null,
        sortOrder,
      };
    }),
    children: family.childTempIds.map((individualId, sortOrder) => {
      const person = peopleById.get(individualId);
      return {
        individualId,
        xref: individualId,
        givenName: person?.givenName ?? null,
        surname: person?.surname ?? null,
        pedigree: "BIRTH" as const,
        sortOrder,
      };
    }),
    events: [],
  }));
}

/** Map OCR preview payload into the same graph the live tree uses. */
export function buildRecognizedTreeGraph(tree: RecognizedTree): TreeGraph {
  const peopleById = new Map(tree.people.map((p) => [p.tempId, p]));
  const individuals = recognizedPeopleToIndividuals(tree.people);
  const families = recognizedFamiliesToFamilies(tree.families, peopleById);
  const graph = buildFullTreeGraph(individuals, families);
  // Nüfus charts: person on top, ancestors below (opposite of live Shejera tree).
  return layoutGenerationsRootOnTop(graph, "root");
}

/**
 * Assign generation 0 to the root person and increasing generations to ancestors
 * so the preview matches the source chart orientation.
 */
function layoutGenerationsRootOnTop(graph: TreeGraph, rootId: string): TreeGraph {
  if (graph.nodes.length === 0) return graph;

  const root = graph.nodes.find((n) => n.id === rootId) ?? graph.nodes[0];
  const parentsOf = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.type !== "parent") continue;
    const list = parentsOf.get(edge.to) ?? [];
    list.push(edge.from);
    parentsOf.set(edge.to, list);
  }

  const generations = new Map<string, number>();
  const frontier = [root.id];
  generations.set(root.id, 0);

  while (frontier.length > 0) {
    const childId = frontier.shift()!;
    const childGen = generations.get(childId) ?? 0;
    for (const parentId of parentsOf.get(childId) ?? []) {
      const nextGen = childGen + 1;
      const prev = generations.get(parentId);
      if (prev === undefined || nextGen > prev) {
        generations.set(parentId, nextGen);
        frontier.push(parentId);
      }
    }
  }

  // Unlinked people: keep them near the bottom of the known depth
  const maxLinked = Math.max(0, ...generations.values());
  const nodes = graph.nodes.map((node) => ({
    ...node,
    generation: generations.get(node.id) ?? maxLinked + 1,
  }));

  return { nodes, edges: graph.edges };
}
