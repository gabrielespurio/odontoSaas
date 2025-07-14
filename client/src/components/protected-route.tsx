import { ReactNode } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import Unauthorized from "@/components/unauthorized";

interface ProtectedRouteProps {
  children: ReactNode;
  module: string;
}

export default function ProtectedRoute({ children, module }: ProtectedRouteProps) {
  const { hasAccess, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess(module)) {
    return <Unauthorized />;
  }

  return <>{children}</>;
}