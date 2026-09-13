import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string | null;
  avatarStoragePath?: string | null;
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
        avatarUrl: user.user_metadata?.avatar_url || null,
        avatarStoragePath: user.user_metadata?.avatar_storage_path || null,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
      };
    } catch (e) {
      console.error("Error fetching user profile:", e);
      return null;
    }
  }

  /**
   * Upload a profile picture to the 'profile' Supabase storage bucket
   * and update auth user_metadata with the public URL
   */
  async uploadProfilePicture(file: File): Promise<{ url: string; error: string | null }> {
    try {
      // 1. Validation
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
      if (!validTypes.includes(file.type)) {
        return {
          url: "",
          error: "Invalid file format. Please upload a JPG, PNG, WEBP, or GIF image.",
        };
      }

      // Max 5MB
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return {
          url: "",
          error: "File size exceeds 5MB limit. Please choose a smaller image.",
        };
      }

      // 2. Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { url: "", error: "You must be logged in to upload a profile picture." };
      }

      // 3. Prepare file path in 'profile' bucket
      const fileExt = file.name.split(".").pop() || "jpg";
      const cleanFileName = `avatar_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${cleanFileName}`;

      // 4. Upload file to Supabase storage bucket 'profile'
      const { error: uploadError } = await supabase.storage
        .from("profile")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
        return {
          url: "",
          error: `Storage upload failed: ${uploadError.message}. Make sure the 'profile' bucket has public access or proper RLS policies configured.`,
        };
      }

      // 5. Get Public URL for the uploaded file
      const { data: urlData } = supabase.storage.from("profile").getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        return { url: "", error: "Could not retrieve public URL for uploaded photo." };
      }

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // 6. Update user metadata in Supabase Auth & public.profiles table
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: publicUrl,
          avatar_storage_path: filePath,
        },
      });

      if (updateError) {
        console.error("Error updating user metadata:", updateError);
        return {
          url: publicUrl,
          error: `Image uploaded, but failed to save to user profile: ${updateError.message}`,
        };
      }

      // Sync avatar_url to public.profiles so it's accessible across admin and leaderboard views
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);

      // 7. Dispatch event for instant reactive UI updates across the entire app
      this.notifyProfileUpdated();

      return { url: publicUrl, error: null };
    } catch (e: any) {
      console.error("Unexpected error in uploadProfilePicture:", e);
      return { url: "", error: e?.message || "An unexpected error occurred during upload." };
    }
  }

  /**
   * Remove current profile picture from storage and user metadata
   */
  async removeProfilePicture(): Promise<{ success: boolean; error: string | null }> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { success: false, error: "User not authenticated." };
      }

      const existingPath = user.user_metadata?.avatar_storage_path;
      if (existingPath) {
        await supabase.storage.from("profile").remove([existingPath]);
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: null,
          avatar_storage_path: null,
        },
      });

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Sync avatar_url removal to public.profiles table
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);

      this.notifyProfileUpdated();
      return { success: true, error: null };
    } catch (e: any) {
      console.error("Error removing profile picture:", e);
      return { success: false, error: e?.message || "Failed to remove profile picture." };
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
