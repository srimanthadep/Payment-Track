import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "user" | "staff";

export interface UseRoleReturn {
  role: UserRole | null;
  isAdmin: boolean;
  isStaff: boolean;
  isOwner: boolean; // admin or user (has full business owner access)
  isLoading: boolean;
  currentUserId: string | null;
  ownerId: string | null;
  effectiveUserId: string | null;
}

interface CachedRoleData {
  userId: string;
  role: UserRole;
  ownerId: string | null;
  effectiveUserId: string;
}

let cachedRole: CachedRoleData | null = null;

export const useRole = (): UseRoleReturn => {
  const [roleData, setRoleData] = useState<CachedRoleData | null>(cachedRole);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedRole);

  useEffect(() => {
    let isMounted = true;

    const fetchRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (isMounted) {
            setRoleData(null);
            setIsLoading(false);
          }
          return;
        }

        const userId = session.user.id;
        if (cachedRole && cachedRole.userId === userId) {
          if (isMounted) {
            setRoleData(cachedRole);
            setIsLoading(false);
          }
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, owner_id")
          .eq("id", userId)
          .maybeSingle();

        const fetchedRole: UserRole = (profile?.role as UserRole) || "user";
        let ownerId: string | null = (profile as any)?.owner_id || null;
        let effectiveUserId = userId;

        if (fetchedRole === "staff") {
          if (!ownerId) {
            const { data: adminProfile } = await supabase
              .from("profiles")
              .select("id")
              .eq("role", "admin")
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();
            ownerId = adminProfile?.id || "98cab8fb-b582-493f-91a0-b8f3954a1366";
          }
          effectiveUserId = ownerId;
        }

        const newCachedData: CachedRoleData = {
          userId,
          role: fetchedRole,
          ownerId,
          effectiveUserId,
        };

        cachedRole = newCachedData;
        if (isMounted) {
          setRoleData(newCachedData);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading user role:", err);
        if (isMounted) {
          setRoleData({
            userId: "",
            role: "user",
            ownerId: null,
            effectiveUserId: "",
          });
          setIsLoading(false);
        }
      }
    };

    fetchRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        cachedRole = null;
        if (isMounted) {
          setRoleData(null);
          setIsLoading(false);
        }
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        cachedRole = null;
        fetchRole();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const role = roleData?.role ?? null;

  return {
    role,
    isAdmin: role === "admin",
    isStaff: role === "staff",
    isOwner: role === "admin" || role === "user",
    isLoading,
    currentUserId: roleData?.userId ?? null,
    ownerId: roleData?.ownerId ?? null,
    effectiveUserId: roleData?.effectiveUserId ?? null,
  };
};

/**
 * Invalidate cached role so next call re-fetches
 */
export const invalidateRoleCache = () => {
  cachedRole = null;
};
