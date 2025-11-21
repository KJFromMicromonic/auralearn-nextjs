import { ReactNode } from "react";
import RoleBasedSidebar from "./RoleBasedSidebar";

interface LayoutProps {
  children: ReactNode;
}

/**
 * Wraps protected pages with the shared responsive shell that includes
 * the hover-activated sidebar.
 *
 * @param children The page content that should sit beside the sidebar.
 * @returns The layout that renders the sidebar and main content regions.
 */
export default function Layout({ children }: LayoutProps) {
  return (
    <div className="relative min-h-screen bg-background">
      <RoleBasedSidebar />
      <main className="min-h-screen px-4 pb-12 pt-20 transition-all duration-300 sm:px-8 lg:px-12">
        {children}
      </main>
    </div>
  );
}
