import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt?: string;
  lastSignIn?: string;
}

const PROFILE_UPDATED_EVENT = "payment_track_profile_updated";

class ProfileService {
  /**
   * Get current authenticated user profile details from Supabase
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || user.user_metadata?.name || "",
        avatarUrl: "/logo-circle.png",
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
      };
    } catch (e) {
      console.error("Error fetching user profile:", e);
      return null;
    }
  }

  /**
   * Update full display name in user metadata
   */
  async updateFullName(fullName: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      this.notifyProfileUpdated();
      return { success: true, error: null };
    } catch (e: any) {
      console.error("Error updating display name:", e);
      return { success: false, error: e?.message || "Failed to update display name." };
    }
  }

  /**
   * Notify other components about profile changes
   */
  notifyProfileUpdated() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
    }
  }

  /**
   * Subscribe to profile updates
   */
  subscribe(callback: () => void): () => void {
    if (typeof window === "undefined") return () => {};

    const handler = () => callback();
    window.addEventListener(PROFILE_UPDATED_EVENT, handler);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      callback();
    });

    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, handler);
      subscription.unsubscribe();
    };
  }
}

export const profileService = new ProfileService();
