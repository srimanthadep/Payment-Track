import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";

interface StaffRestrictedRouteProps {
  children: ReactNode;
}

/**
 * Route guard that prevents staff users from accessing restricted pages.
 * Staff users are silently redirected to /transactions.
 */
export const StaffRestrictedRoute = ({ children }: StaffRestrictedRouteProps) => {
  const navigate = useNavigate();
  const { isStaff, isLoading } = useRole();

  useEffect(() => {
    if (!isLoading && isStaff) {
      navigate("/transactions", { replace: true });
    }
  }, [isStaff, isLoading, navigate]);

  if (isLoading) {
    return null;
  }

  if (isStaff) {
    return null;
  }

  return <>{children}</>;
};
