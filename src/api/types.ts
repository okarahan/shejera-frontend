export type Sex = "M" | "F" | "X" | "U";
export type SpouseRole = "HUSB" | "WIFE";
export type Pedigree =
  | "BIRTH"
  | "ADOPTED"
  | "FOSTER"
  | "SEALING"
  | "STEP"
  | "CHALLENGED"
  | "DISPROVEN";

export interface Individual {
  id: string;
  xref: string;
  sex?: Sex;
  isLiving: boolean;
  givenName?: string;
  surname?: string;
  biography?: string | null;
  birthDate?: string | null;
}

export interface CreateIndividualRequest {
  givenName: string;
  surname?: string;
  sex?: Sex;
  isLiving?: boolean;
  biography?: string;
  birthDate?: string;
}

export interface UpdateIndividualRequest {
  givenName?: string;
  surname?: string;
  sex?: Sex;
  isLiving?: boolean;
  biography?: string;
  birthDate?: string;
}

export interface Spouse {
  individualId: string;
  xref: string;
  role: SpouseRole;
  givenName?: string | null;
  surname?: string | null;
  sortOrder: number;
}

export interface Child {
  individualId: string;
  xref: string;
  givenName?: string | null;
  surname?: string | null;
  pedigree: Pedigree;
  sortOrder: number;
}

export interface Family {
  id: string;
  xref: string;
  spouses: Spouse[];
  children: Child[];
  events: FamilyEvent[];
}

export interface FamilyEvent {
  id: string;
  tag: string;
  eventType?: string | null;
  dateText?: string | null;
  dateSort?: string | null;
  placeName?: string | null;
  description?: string | null;
}

export interface CreateFamilyRequest {
  spouses: { individualId: string; role: SpouseRole }[];
  marriage?: {
    dateText?: string;
    dateSort?: string;
    placeName?: string;
    description?: string;
  };
}

export interface AddChildRequest {
  individualId: string;
  pedigree?: Pedigree;
  sortOrder?: number;
}

export interface ApiError {
  error: string;
}

export interface RelatedIndividual {
  individualId: string;
  xref: string;
  givenName?: string | null;
  surname?: string | null;
  familyId: string;
  role?: string | null;
}

export interface IndividualRelationships {
  spouses: RelatedIndividual[];
  children: RelatedIndividual[];
  parents: RelatedIndividual[];
}
