import { Link, useLocation } from "react-router-dom";
import { Home, Users, FileCheck, LayoutDashboard, BookOpen, FileText, Settings, Heart, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", path: "/", icon: Home },
  { name: "Create Class", path: "/create-class", icon: Users },
  { name: "Assessment", path: "/assessment", icon: FileCheck },
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Teaching Guide", path: "/teaching-guide", icon: BookOpen },
  { name: "Parent Guide", path: "/parent-guide", icon: Heart },
  { name: "Worksheets", path: "/worksheets", icon: FileText },
  { name: "Settings", path: "/settings", icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">LearnAura</h1>
            <p className="text-xs text-muted-foreground">Intelligence System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-pastel-coral flex items-center justify-center text-white font-semibold">
            T
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Teacher</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
