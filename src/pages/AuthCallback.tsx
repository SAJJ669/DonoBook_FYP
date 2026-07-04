import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    (async () => {
      const code = searchParams.get("code");

      if (!code) {
        navigate("/auth", { replace: true });
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      // scrub ?code=... from the address bar before navigating away
      window.history.replaceState(null, "", "/auth/callback");

      navigate(error ? "/auth" : "/dashboard", { replace: true });
    })();
  }, []);

  return <div>Signing you in…</div>;
};

export default AuthCallback;