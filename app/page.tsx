"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/app/api/client";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      router.push("/users");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center bg-background text-foreground min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground">Loading Optimind...</p>
      </div>
    </div>
  );
}
