import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { UserProfile } from "@/lib/types";

export function usePermissions() {
  const { user } = useAuth();
  
  // Fetch user profiles to get module permissions
  const { data: profiles } = useQuery<UserProfile[]>({
    queryKey: ["/api/user-profiles"],
    enabled: !!user,
  });

  // Get current user's profile
  const userProfile = profiles?.find(profile => profile.name === user?.role);

  // Check if user has access to a specific module
  const hasAccess = (module: string): boolean => {
    if (!user) return false;
    
    // Companies module is only for system admin (admin role with null company_id)
    if (module === "companies") {
      return (user.role === "admin" || user.role === "Administrador") && user.companyId === null;
    }
    
    // Admin role has access to everything (backward compatibility)
    if (user.role === "admin" || user.role === "Administrador") return true;
    
    // If no profile found, use default permissions for legacy roles
    if (!userProfile) {
      const defaultPermissions = getLegacyPermissions(user.role);
      return defaultPermissions.includes(module);
    }
    
    // Check if module is in user's profile modules
    return userProfile.modules.includes(module);
  };

  // Get all accessible modules for current user
  const getAccessibleModules = (): string[] => {
    if (!user) return [];
    
    // Admin has access to everything
    if (user.role === "admin" || user.role === "Administrador") {
      return ["dashboard", "patients", "schedule", "consultations", "procedures", "financial", "purchases", "stock", "reports", "settings", "companies"];
    }
    
    // If no profile found, use default permissions
    if (!userProfile) {
      return getLegacyPermissions(user.role);
    }
    
    return userProfile.modules;
  };

  // Legacy permissions for backward compatibility
  const getLegacyPermissions = (role: string): string[] => {
    switch (role) {
      case "admin":
      case "Administrador":
        return ["dashboard", "patients", "schedule", "consultations", "procedures", "financial", "purchases", "stock", "reports", "settings", "companies"];
      case "dentist":
        return ["dashboard", "patients", "schedule", "consultations", "procedures", "reports"];
      case "reception":
        return ["dashboard", "patients", "schedule", "financial"];
      default:
        return ["dashboard"];
    }
  };

  // Check if user has access to all clinic data or only own data
  const hasDataScope = (scope: "all" | "own"): boolean => {
    if (!user) return false;
    
    // Admin always has access to all data
    if (user.role === "admin") return true;
    
    // Check user's data scope
    return user.dataScope === scope;
  };

  // Get current user's data scope
  const getDataScope = (): "all" | "own" => {
    if (!user) return "own";
    
    // Admin always has access to all data
    if (user.role === "admin") return "all";
    
    return (user.dataScope as "all" | "own") || "all";
  };

  return {
    hasAccess,
    getAccessibleModules,
    hasDataScope,
    getDataScope,
    userProfile,
    isLoading: !user || !profiles,
  };
}