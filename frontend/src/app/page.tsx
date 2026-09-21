"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import LoadingScreen from "@/components/LoadingScreen";

// Página estática (export): o redirecionamento acontece no navegador.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, (usuario) => {
      router.replace(usuario ? "/home" : "/login");
    });
  }, [router]);

  return <LoadingScreen text="Carregando..." />;
}
