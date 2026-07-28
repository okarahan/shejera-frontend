/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional invite-link origin fallback when backend omits inviteUrl. */
  readonly VITE_INVITE_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
