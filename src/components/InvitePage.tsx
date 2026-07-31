import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { InvitePreviewResponse, MeResponse } from "../api/types";

interface InvitePageProps {
  token: string;
  onRedeemed: (me: MeResponse) => void;
}

export function InvitePage({ token, onRedeemed }: InvitePageProps) {
  const [preview, setPreview] = useState<InvitePreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .previewInvite(token)
      .then(setPreview)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Davet geçersiz"),
      );
  }, [token]);

  async function redeem() {
    setBusy(true);
    setError(null);
    try {
      const me = await api.redeemInvite(token);
      onRedeemed(me);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kabul başarısız");
    } finally {
      setBusy(false);
    }
  }

  if (error && !preview) {
    return (
      <div className="app app--centered">
        <h1>Shejera</h1>
        <p className="error-banner">{error}</p>
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
      <button
        type="button"
        className="btn btn--primary"
        disabled={busy || preview.expired || preview.status === "revoked"}
        onClick={() => void redeem()}
      >
        {busy
          ? "…"
          : preview.status === "redeemed"
            ? "Yeniden oturum aç"
            : "Daveti kabul et"}
      </button>
    </div>
  );
}
