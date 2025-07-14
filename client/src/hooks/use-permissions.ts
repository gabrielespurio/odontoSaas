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
    
    // Admin role has access to everything (backward compatibility)
    if (user.role === "admin") return true;
    
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
    if (user.role === "admin") {
      return ["dashboard", "patients", "schedule", "consultations", "procedures", "financial", "reports", "settings"];
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
        return ["dashboard", "patients", "schedule", "consultations", "procedures", "financial", "reports", "settings"];
      case "dentist":
        return ["dashboard", "patients", "schedule", "consultations", "procedures", "reports"];
      case "reception":
        return ["dashboard", "patients", "schedule", "financial"];
      default:
        return ["dashboard"];
    }
  };

  return {
    hasAccess,
    getAccessibleModules,
    userProfile,
    isLoading: !user || !profiles,
  };
}