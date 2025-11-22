'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  FileCheck,
  LayoutDashboard,
  BookOpen,
  FileText,
  Settings,
  Heart,
  Lightbulb,
  LogOut,
  Brain,
  Target,
  Menu,
  X,
} from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureToggles } from "@/contexts/FeatureToggleContext";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { getUserInitials } from "@/lib/users/get-user-initials";
import LanguageSelector from "./LanguageSelector";

const SIDEBAR_WIDTH = 288;

/**
 * Renders the role-aware sidebar that collapses into a hoverable hamburger menu on desktop
 * and a tap-to-open drawer on mobile.
 *
 * @returns The responsive sidebar component.
 */
export default function RoleBasedSidebar() {
  const pathname = usePathname();
  const { user, isParent, signOut } = useAuth();
  const { isFeatureEnabled } = useFeatureToggles();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDesktopOpen, setIsDesktopOpen] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const teacherNavigation = React.useMemo(
    () => {
      const items = [
        { name: t('navigation.dashboard'), path: "/dashboard", icon: LayoutDashboard },
        { name: t('navigation.createClass'), path: "/create-class", icon: Users },
        { name: t('navigation.assessment'), path: "/assessment", icon: FileCheck },
        { name: "AuraVoice", path: "/cognitive-assessment", icon: Brain, featureFlag: 'aura_voice' as const },
        { name: t('navigation.learningCategories'), path: "/student-categories", icon: Brain },
        { name: t('navigation.teachingGuide'), path: "/teaching-guide", icon: BookOpen },
        { name: t('navigation.worksheets'), path: "/worksheets", icon: FileText, featureFlag: 'worksheets' as const },
        { name: t('navigation.settings'), path: "/settings", icon: Settings },
      ];

      // Filter items based on feature toggles
      return items.filter(item => {
        if (!item.featureFlag) return true;
        return isFeatureEnabled(item.featureFlag);
      });
    },
    [t, isFeatureEnabled],
  );

  const parentNavigation = React.useMemo(
    () => [
      { name: t('navigation.parentDashboard'), path: "/parent-dashboard", icon: Home },
      { name: t('navigation.learningSnapshot'), path: "/parent/learning-snapshot", icon: Brain },
      { name: t('navigation.supportStrategies'), path: "/parent-guide", icon: Heart },
      { name: t('navigation.dailyActivities'), path: "/parent/activities", icon: BookOpen },
      { name: t('navigation.adaptabilityChallenges'), path: "/parent/challenges", icon: Target },
      { name: t('navigation.settings'), path: "/settings", icon: Settings },
    ],
    [t],
  );

  const navigation = React.useMemo(
    () => (isParent ? parentNavigation : teacherNavigation),
    [isParent, parentNavigation, teacherNavigation],
  );

  const isSidebarVisible = isMobile ? isMobileOpen : isDesktopOpen;

  /**
   * Clears any pending hover timeout to prevent conflicting animations.
   */
  const clearHoverTimeout = React.useCallback((): void => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  /**
   * Opens the sidebar immediately on desktop interactions.
   */
  const openDesktopSidebar = React.useCallback((): void => {
    if (isMobile) {
      return;
    }
    clearHoverTimeout();
    setIsDesktopOpen(true);
  }, [clearHoverTimeout, isMobile]);

  /**
   * Schedules the sidebar to close after the hover intent leaves on desktop.
   */
  const scheduleDesktopClose = React.useCallback((): void => {
    if (isMobile) {
      return;
    }
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => setIsDesktopOpen(false), 150);
  }, [clearHoverTimeout, isMobile]);

  /**
   * Toggles the mobile drawer when the hamburger button is tapped.
   */
  const toggleMobileSidebar = React.useCallback((): void => {
    if (!isMobile) {
      return;
    }
    setIsMobileOpen((prev) => !prev);
  }, [isMobile]);

  /**
   * Forces the mobile drawer to close, typically when clicking outside the panel.
   */
  const closeMobileSidebar = React.useCallback((): void => {
    if (!isMobile) {
      return;
    }
    setIsMobileOpen(false);
  }, [isMobile]);

  React.useEffect(() => {
    return () => clearHoverTimeout();
  }, [clearHoverTimeout]);

  React.useEffect(() => {
    if (!isMobile) {
      setIsMobileOpen(false);
    }
  }, [isMobile]);

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:left-6 sm:top-6"
        aria-label={
          isSidebarVisible
            ? t('navigation.closeMenu', { defaultValue: 'Close menu' })
            : t('navigation.openMenu', { defaultValue: 'Open menu' })
        }
        aria-expanded={isSidebarVisible}
        onMouseEnter={!isMobile ? openDesktopSidebar : undefined}
        onMouseLeave={!isMobile ? scheduleDesktopClose : undefined}
        onClick={isMobile ? toggleMobileSidebar : undefined}
      >
        {isMobile && isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div
        className={cn(
          "fixed top-0 left-0 z-40 h-screen",
          "transition-transform duration-300 ease-in-out",
          isSidebarVisible ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ width: SIDEBAR_WIDTH }}
        onMouseEnter={!isMobile ? openDesktopSidebar : undefined}
        onMouseLeave={!isMobile ? scheduleDesktopClose : undefined}
        aria-hidden={!isSidebarVisible}
      >
        <aside className="flex h-full w-full flex-col border-r border-border bg-card shadow-xl">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-info">
                  <Lightbulb className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">{t('AuraLearn')}</h1>
                  <p className="text-xs text-muted-foreground">{t('sidebar.intelligenceSystem')}</p>
                </div>
              </div>
              <LanguageSelector variant="ghost" />
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4">
            {navigation.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-border p-4">
            <div className="flex items-center gap-3 rounded-xl px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-pastel-coral text-white font-semibold">
                {getUserInitials(user?.full_name, user?.email)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {user?.full_name || user?.email || 'User'}
                </p>
                <p className="text-xs capitalize text-muted-foreground">{user?.role || 'User'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all duration-300 hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">{t('navigation.signOut')}</span>
            </button>
          </div>
        </aside>
      </div>

      <div
        role="presentation"
        className={cn(
          "fixed inset-0 z-30 bg-background/70 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMobileSidebar}
      />
    </>
  );
}
