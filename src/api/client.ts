import type {
  AddChildRequest,
  CreateFamilyRequest,
  CreateIndividualRequest,
  Family,
  Individual,
  UpdateIndividualRequest,
} from "./types";

const BASE = "/api";

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listIndividuals: () => request<Individual[]>("/individuals"),

  createIndividual: (body: CreateIndividualRequest) =>
    request<Individual>("/individuals", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateIndividual: (id: string, body: UpdateIndividualRequest) =>
    request<Individual>(`/individuals/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  listFamilies: () => request<Family[]>("/families"),

  createFamily: (body: CreateFamilyRequest) =>
    request<Family>("/families", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  addFamilyChild: (familyId: string, body: AddChildRequest) =>
    request<void>(`/families/${familyId}/children`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
