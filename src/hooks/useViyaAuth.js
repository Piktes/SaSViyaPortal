import { useCallback, useEffect, useState } from "react";
import { getSasAuth } from "../auth/sasAuth.js";
import { passwordLogin } from "../api/viyaApi.js";

// Viya oturum durumu: checking -> authenticated | unauthenticated
// login(): loginPopup acar; logout(): Viya oturumunu kapatir.
export function useViyaAuth(viyaUrl) {
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!viyaUrl) return;
    let cancelled = false;
    setStatus("checking");
    setError(null);
    getSasAuth(viyaUrl)
      .checkAuthenticated()
      .then(() => {
        if (!cancelled) setStatus("authenticated");
      })
      .catch(() => {
        // Oturum yok VEYA sunucuya ulasilamiyor (CORS/ag) — ikisi de login ekranina duser.
        if (!cancelled) setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, [viyaUrl]);

  const login = useCallback(async () => {
    setError(null);
    try {
      await getSasAuth(viyaUrl).loginPopup();
      setStatus("authenticated");
    } catch {
      setError(
        "Giriş tamamlanamadı. Açılır pencere engellenmiş olabilir ya da sunucuya şu an erişilemiyor. " +
          "Lütfen tekrar deneyin."
      );
    }
  }, [viyaUrl]);

  // Kendi formumuzla giris: SASLogon'a dogrudan kimlik POST edilir, popup acilmaz.
  const loginWithPassword = useCallback(
    async (username, password) => {
      setError(null);
      try {
        await passwordLogin(viyaUrl, username, password);
        const sasAuth = getSasAuth(viyaUrl);
        sasAuth.invalidateCache();
        await sasAuth.checkAuthenticated(); // oturumun gercekten kuruldugunu dogrula
        setStatus("authenticated");
        return true;
      } catch (err) {
        setError(err?.message || "Giriş başarısız.");
        return false;
      }
    },
    [viyaUrl]
  );

  const logout = useCallback(async () => {
    try {
      await getSasAuth(viyaUrl).logout();
    } catch {
      // Oturum zaten dusmus olabilir; yerel durumu yine de sifirla.
    }
    getSasAuth(viyaUrl).invalidateCache();
    setStatus("unauthenticated");
  }, [viyaUrl]);

  return { status, error, login, loginWithPassword, logout };
}
