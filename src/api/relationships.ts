import type { IndividualRelationships, RelatedIndividual } from "./types";

function relatedName(related: RelatedIndividual): string {
  return [related.givenName, related.surname].filter(Boolean).join(" ") ||
    related.xref;
}

/** UI rule: block delete while person has children as a parent. */
export function canDeleteIndividual(
  relationships: IndividualRelationships,
): boolean {
  return relationships.children.length === 0;
}

export function deleteBlockedMessage(
  relationships: IndividualRelationships,
): string {
  if (canDeleteIndividual(relationships)) return "";
  const names = relationships.children.map(relatedName).join(", ");
  return `Bu kişi silinemez. Önce çocukları silin: ${names}`;
}

export function relatedDisplayName(related: RelatedIndividual): string {
  return relatedName(related);
}

/** Group spouses and children by family for the detail panel. */
export function relationshipsByFamily(
  relationships: IndividualRelationships,
): Map<string, { spouses: RelatedIndividual[]; children: RelatedIndividual[] }> {
  const map = new Map<
    string,
    { spouses: RelatedIndividual[]; children: RelatedIndividual[] }
  >();

  function ensure(familyId: string) {
    if (!map.has(familyId)) {
      map.set(familyId, { spouses: [], children: [] });
    }
    return map.get(familyId)!;
  }

  for (const spouse of relationships.spouses) {
    ensure(spouse.familyId).spouses.push(spouse);
  }
  for (const child of relationships.children) {
    ensure(child.familyId).children.push(child);
  }

  return map;
}
