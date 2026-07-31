import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { InvitePreviewResponse, MeResponse } from "../api/types";

interface InvitePageProps {
  token: string;
  onRedeemed: (me: MeResponse) => void;
}

/** Landing for `/contrib/{token}`: validates invite and redeems into a session. */
export function InvitePage({ token, onRedeemed }: InvitePageProps) {
  const [preview, setPreview] = useState<InvitePreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [needsManual, setNeedsManual] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setBusy(true);
      setError(null);
      setNeedsManual(false);
      try {
        const invite = await api.previewInvite(token);
        if (cancelled) return;
        setPreview(invite);

        if (invite.expired || invite.status === "revoked") {
          setBusy(false);
          setNeedsManual(true);
          return;
        }

        // Auto-redeem: invite link → session → parent redirects to tree or /contrib
        const me = await api.redeemInvite(token);
        if (cancelled) return;
        onRedeemed(me);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Davet geçersiz");
        setBusy(false);
        setNeedsManual(true);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, onRedeemed]);

  async function redeemManual() {
    setBusy(true);
    setError(null);
    try {
      const me = await api.redeemInvite(token);
      onRedeemed(me);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kabul başarısız");
      setBusy(false);
    }
  }

  if (busy && !needsManual) {
    return (
      <div className="app app--centered">
        <h1>Shejera</h1>
        <p className="muted">Davet kabul ediliyor…</p>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="app app--centered">
        <h1>Shejera</h1>
        <p className="error-banner">{error}</p>
        <p className="muted">
          <a href="/contrib">Katkı sayfası</a>
        </p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="app app--centered">
        <p>Davet yükleniyor…</p>
      </div>
    );
  }

  const roleLabel =
    preview.role === "admin" ? "Yönetici" : "Katkıda bulunan";

  return (
    <div className="app app--centered">
      <h1>Shejera</h1>
      <p>
        <strong>{preview.displayName}</strong> ({preview.email}) için davet
      </p>
      <p className="muted">Rol: {roleLabel}</p>
      {preview.expired && (
        <p className="error-banner">Bu davetin süresi dolmuş.</p>
      )}
      {preview.status === "revoked" && (
        <p className="error-banner">Bu davet iptal edilmiş.</p>
      )}
      {error && <p className="error-banner">{error}</p>}
      {!preview.expired && preview.status !== "revoked" && (
        <button
          type="button"
          className="btn btn--primary"
          disabled={busy}
          onClick={() => void redeemManual()}
        >
          {busy ? "…" : "Daveti kabul et"}
        </button>
      )}
    </div>
  );
}
