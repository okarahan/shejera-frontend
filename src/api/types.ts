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
  deathDate?: string | null;
}

export interface CreateIndividualRequest {
  givenName: string;
  surname?: string;
  sex?: Sex;
  isLiving?: boolean;
  biography?: string;
  birthDate?: string;
  deathDate?: string;
}

export interface UpdateIndividualRequest {
  givenName?: string;
  surname?: string;
  sex?: Sex;
  isLiving?: boolean;
  biography?: string;
  birthDate?: string;
  deathDate?: string;
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

export interface ImportUploadResponse {
  originalFileName: string;
  storedFileName: string;
  storedPath: string;
  contentType?: string | null;
  sizeBytes: number;
  uploadedAt: string;
}

export interface ImportStatusResponse {
  hasUpload: boolean;
  originalFileName?: string | null;
  storedFileName?: string | null;
  storedPath?: string | null;
  uploadedAt?: string | null;
  hasScanResult: boolean;
  scannedAt?: string | null;
  recognizer: string;
}

export interface ImportScanResponse {
  scannedAt: string;
  personCount: number;
  familyCount: number;
  recognizer: string;
}

export interface RecognizedPerson {
  tempId: string;
  givenName?: string | null;
  surname?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  birthPlace?: string | null;
  sex?: string | null;
  role?: string | null;
}

export interface RecognizedFamily {
  tempId: string;
  spouseTempIds: string[];
  childTempIds: string[];
}

export interface RecognizedTree {
  people: RecognizedPerson[];
  families: RecognizedFamily[];
}

export type UserRole = "admin" | "contributor";

export interface MeResponse {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  canManageInvites: boolean;
  canWriteMainTree: boolean;
  contributionTreeId?: string | null;
  contributionTreeStatus?: string | null;
}

export interface InvitePreviewResponse {
  email: string;
  displayName: string;
  role: UserRole;
  status: string;
  expired: boolean;
}

export interface InviteResponse {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: string;
  token?: string | null;
  invitePath?: string | null;
  /** Absolute URL when backend SHEJERA_INVITE_ORIGIN is set. */
  inviteUrl?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  redeemedAt?: string | null;
  /** Short admin reference code. */
  code?: string | null;
  /** draft | submitted | merged | null */
  contributionTreeStatus?: string | null;
}

export interface CreateInviteRequest {
  email: string;
  displayName: string;
  role?: UserRole;
  expiresInDays?: number;
}

export interface TreeResponse {
  id: string;
  name: string;
  kind: "main" | "contribution";
  status?: string | null;
  expiresAt?: string | null;
  canWrite: boolean;
  contributorUserId?: string | null;
  createdAt: string;
}

export interface CreateContributionTreeRequest {
  name: string;
  expiresInDays?: number;
}

export interface ImportCommitResponse {
  treeId: string;
  personCount: number;
  familyCount: number;
}
