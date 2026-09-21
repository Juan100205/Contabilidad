"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    router.replace(isMobile ? "/diario" : "/dashboard");
  }, [router]);

  return null;
}
