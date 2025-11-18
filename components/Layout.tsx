import { ReactNode } from "react";
import RoleBasedSidebar from "./RoleBasedSidebar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <RoleBasedSidebar />
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
