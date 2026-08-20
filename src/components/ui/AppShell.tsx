import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileTopBar } from "./MobileTopBar";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="bg-background text-on-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileTopBar onMenuClick={() => setSidebarOpen(true)} />
      <main className="md:ml-64 min-h-screen">{children}</main>
    </div>
  );
}
