"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/crm");
  }, [router]);

  return (
    <div className="py-20 text-center text-sm font-semibold text-slate-500">
      Redirection vers le CRM...
    </div>
  );
}
