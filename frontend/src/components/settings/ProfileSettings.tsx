import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User,
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  Loader2,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  HardDrive,
  Calendar,
  Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { profileService, UserProfile } from "@/services/profileService";
import { motion } from "framer-motion";

export const ProfileSettings = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const [fullName, setFullName] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const loadProfile = async () => {
    try {
      const data = await profileService.getUserProfile();
      setProfile(data);
      if (data?.fullName) {
        setFullName(data.fullName);
      }
    } catch (e) {
      console.error("Error loading profile:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    return profileService.subscribe(() => {
      loadProfile();
    });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    await processUpload(file);
    // Reset file input so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const { url, error } = await profileService.uploadProfilePicture(file);

      if (error) {
        toast({
          title: "Upload Failed",
          description: error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profile Picture Updated",
          description: "Your new avatar has been uploaded to Supabase 'profile' storage bucket.",
        });
        await loadProfile();
      }
    } catch (err: any) {
      toast({
        title: "Upload Error",
        description: err?.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processUpload(files[0]);
    }
  };

  const handleRemovePhoto = async () => {
    setIsRemoving(true);
    try {
      const { success, error } = await profileService.removeProfilePicture();
      if (error) {
        toast({
          title: "Failed to Remove Photo",
          description: error,
          variant: "destructive",
        });
      } else if (success) {
        toast({
          title: "Photo Removed",
          description: "Your profile picture has been reset to default.",
        });
        await loadProfile();
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to remove photo",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
      setRemoveDialogOpen(false);
    }
  };

  const handleSaveFullName = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingName(true);
    try {
      const { success, error } = await profileService.updateFullName(fullName);
      if (error) {
        toast({
          title: "Update Failed",
          description: error,
          variant: "destructive",
        });
      } else if (success) {
        toast({
          title: "Profile Saved",
          description: "Your display name has been updated.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCopyUserId = () => {
    if (!profile?.id) return;
    navigator.clipboard.writeText(profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast({
      title: "User ID Copied",
      description: "User ID copied to clipboard",
    });
  };

  const getInitials = (name?: string, email?: string) => {
    if (name?.trim()) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "PT";
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main Profile & Avatar Card */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="h-28 sm:h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 border-b relative">
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-md border border-border/60 text-xs font-semibold text-foreground/80 shadow-xs">
            <HardDrive className="h-3.5 w-3.5 text-primary" />
            <span>Supabase Bucket: <code className="font-mono text-primary font-bold">profile</code></span>
          </div>
        </div>

        <CardContent className="pt-0 relative px-4 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-14 sm:-mt-16 mb-6">
            {/* Avatar Section */}
            <div className="flex items-end gap-4">
              <div
                className={`relative group cursor-pointer rounded-full p-1 bg-background ring-4 ring-card shadow-lg transition-all duration-200 ${
                  isDragOver ? "ring-primary scale-105" : ""
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                title="Click or drag & drop to change profile picture"
              >
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-border/80 bg-muted overflow-hidden">
                  <AvatarImage
                    src={profile?.avatarUrl || "/logo-circle.png"}
                    alt={profile?.fullName || "User Profile"}
                    className="object-cover h-full w-full"
                  />
                  <AvatarFallback className="text-xl font-bold bg-primary/15 text-primary">
                    {getInitials(profile?.fullName, profile?.email)}
                  </AvatarFallback>
                </Avatar>

                {/* Upload Hover Overlay */}
                <div className="absolute inset-1 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white text-xs font-medium">
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <>
                      <Camera className="h-6 w-6 mb-1" />
                      <span>Change</span>
                    </>
                  )}
                </div>

                {/* Active Uploading Spinner */}
                {isUploading && (
                  <div className="absolute inset-1 rounded-full bg-black/60 flex flex-col items-center justify-center text-white">
                    <Loader2 className="h-7 w-7 animate-spin text-primary-foreground mb-1" />
                    <span className="text-[10px] font-semibold">Uploading...</span>
                  </div>
                )}

                {/* Camera Quick Button Badge */}
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="absolute bottom-1 right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95 border-2 border-background"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Basic Profile Name Display */}
              <div className="space-y-1 pb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                    {profile?.fullName || "Admin User"}
                  </h2>
                  <Badge variant="secondary" className="text-[11px] gap-1 py-0.5 px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    <ShieldCheck className="h-3 w-3" />
                    Active User
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {profile?.email || "No email available"}
                </p>
              </div>
            </div>

            {/* Avatar Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-9 text-xs sm:text-sm gap-1.5 font-medium shadow-xs"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5 text-primary" />
                    {profile?.avatarUrl ? "Change Photo" : "Upload Picture"}
                  </>
                )}
              </Button>

              {profile?.avatarUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isUploading || isRemoving}
                  onClick={() => setRemoveDialogOpen(true)}
                  className="h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-5 text-center transition-all duration-200 ${
              isDragOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border/80 bg-muted/20 hover:bg-muted/40 hover:border-primary/50"
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold">
                  Click to browse or drag and drop your photo
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Supported formats: JPG, PNG, WEBP, GIF, SVG (Up to 5 MB). Stored in <code className="font-semibold text-primary">profile</code> bucket.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account & Details Settings Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Profile Details
            </CardTitle>
            <CardDescription className="text-xs">
              Update your account display name and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveFullName} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="display-name" className="text-xs font-semibold">
                  Display Name
                </Label>
                <Input
                  id="display-name"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-email" className="text-xs font-semibold">
                  Account Email
                </Label>
                <Input
                  id="profile-email"
                  value={profile?.email || ""}
                  disabled
                  className="h-9 text-sm bg-muted/50 cursor-not-allowed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Login identifier associated with this user session
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingName}
                  className="h-9 text-xs sm:text-sm gap-1.5"
                >
                  {isSavingName ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Supabase Storage & Account Metadata */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Storage & Account Info
            </CardTitle>
            <CardDescription className="text-xs">
              Supabase storage bucket and authentication status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-primary" />
                  Storage Bucket
                </span>
                <Badge variant="outline" className="font-mono text-xs font-semibold text-primary border-primary/30 bg-primary/5">
                  profile
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Profile images are directly uploaded and synced using Supabase Cloud Storage.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                <span className="text-muted-foreground">User ID</span>
                <div className="flex items-center gap-1.5">
                  <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded max-w-[140px] truncate">
                    {profile?.id || "N/A"}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopyUserId}
                    title="Copy User ID"
                  >
                    {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Account Created
                </span>
                <span className="font-medium text-foreground">
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-muted-foreground">App Brand Header</span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Profile Pic Synced
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog for Photo Removal */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Profile Picture?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your current profile picture? The logo fallback will be displayed instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemovePhoto}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? "Removing..." : "Remove Photo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
