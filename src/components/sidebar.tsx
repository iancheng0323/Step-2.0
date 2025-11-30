"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { FileText, Home, LogOut, Target } from "lucide-react";

const navigation = [
  { name: "To-Do List", href: "/", icon: Home },
  { name: "Goal Management", href: "/goals", icon: Target },
  { name: "Personal Brief", href: "/brief", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-800">
        <h1 className="text-lg font-semibold">Life Planner</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50",
              )}
            >
              <item.icon className="size-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-2 px-3 text-xs text-muted-foreground">
          {user?.email}
        </div>
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start gap-2 text-sm"
        >
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

