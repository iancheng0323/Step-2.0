"use client";

import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/contexts/auth-context";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return null; // AuthForm is shown by AuthProvider
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

