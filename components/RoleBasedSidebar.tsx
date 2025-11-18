'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, FileCheck, LayoutDashboard, BookOpen, FileText, Settings, Heart, Lightbulb, LogOut, Brain, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";

export default function RoleBasedSidebar() {
  const pathname = usePathname();
  const { user, isParent, signOut } = useAuth();
  const { t } = useTranslation();

  const teacherNavigation = [
    { name: t('navigation.home'), path: "/", icon: Home },
    { name: t('navigation.createClass'), path: "/create-class", icon: Users },
    { name: t('navigation.assessment'), path: "/assessment", icon: FileCheck },
    { name: "AuraVoice", path: "/cognitive-assessment", icon: Brain },
    { name: t('navigation.dashboard'), path: "/dashboard", icon: LayoutDashboard },
    { name: t('navigation.learningCategories'), path: "/student-categories", icon: Brain },
    { name: t('navigation.teachingGuide'), path: "/teaching-guide", icon: BookOpen },
    { name: t('navigation.worksheets'), path: "/worksheets", icon: FileText },
    { name: t('navigation.settings'), path: "/settings", icon: Settings },
  ];

  const parentNavigation = [
    { name: t('navigation.parentDashboard'), path: "/parent-dashboard", icon: Home },
    { name: t('navigation.learningSnapshot'), path: "/parent/learning-snapshot", icon: Brain },
    { name: t('navigation.supportStrategies'), path: "/parent-guide", icon: Heart },
    { name: t('navigation.dailyActivities'), path: "/parent/activities", icon: BookOpen },
    { name: t('navigation.adaptabilityChallenges'), path: "/parent/challenges", icon: Target },
    { name: t('navigation.settings'), path: "/settings", icon: Settings },
  ];

  // Determine navigation based on role
  const navigation = isParent ? parentNavigation : teacherNavigation;

  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.full_name) return user?.email?.[0]?.toUpperCase() || 'U';
    const parts = user.full_name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.full_name[0].toUpperCase();
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t('sidebar.learnAura')}</h1>
              <p className="text-xs text-muted-foreground">{t('sidebar.intelligenceSystem')}</p>
            </div>
          </div>
          <LanguageSelector variant="ghost" />
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
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

      <div className="p-4 border-t border-border space-y-2">
        {/* User Profile */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-pastel-coral flex items-center justify-center text-white font-semibold">
            {getInitials()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {user?.full_name || user?.email || 'User'}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role || 'User'}
            </p>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-300"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{t('navigation.signOut')}</span>
        </button>
      </div>
    </aside>
  );
}
