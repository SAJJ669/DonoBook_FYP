import React from 'react'
import {  useEffect} from 'react'
import {useNaviagate, useSearchParams} from 'react-router-dom'

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
      window.history.replaceState(null, "", "/auth/callback"); // scrub ?code before navigating
      navigate(error ? "/auth" : "/dashboard", { replace: true });
    })();
  }, []);

  return <div>Signing you in…</div>;
};