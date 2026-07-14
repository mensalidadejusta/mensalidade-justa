"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OAuthRedirectHandler() {
  const router = useRouter();

  useEffect(() => {
    const redirectTo = sessionStorage.getItem("oauth_redirect");
    if (redirectTo && redirectTo !== "/busca") {
      sessionStorage.removeItem("oauth_redirect");
      router.replace(redirectTo);
    }
  }, [router]);

  return null;
}
