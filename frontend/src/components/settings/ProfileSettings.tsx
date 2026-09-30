import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  CheckCircle2,
  Loader2,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  Mail,
  Palette,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { profileService, UserProfile } from "@/services/profileService";
import { themeService, THEME_ACCENTS, ThemeAccent } from "@/services/themeService";
import { settingsService } from "@/services/settingsService";

export const ProfileSettings = () => {
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);

  const [fullName, setFullName] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [activeAccent, setActiveAccent] = useState<ThemeAccent>(() => themeService.getActiveAccent());

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
    const unsubProfile = profileService.subscribe(() => {
      loadProfile();
    });
    const unsubSettings = settingsService.subscribe((s) => {
      if (s.theme) {
        const found = THEME_ACCENTS.find((a) => a.id === s.theme);
        if (found) setActiveAccent(found);
      }
    });
    return () => {
      unsubProfile();
      unsubSettings();
    };
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Main Profile & Brand Card */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="h-24 sm:h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 border-b relative" />

        <CardContent className="pt-0 relative px-4 sm:px-6 pb-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-end sm:justify-between gap-4 -mt-12 sm:-mt-16 mb-5 text-center sm:text-left">
            {/* Avatar & User Details */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4">
              <div className="relative rounded-full p-1 bg-background ring-4 ring-card shadow-lg">
                <Avatar className="h-20 w-20 sm:h-28 sm:w-28 rounded-full border-2 border-border/80 bg-background overflow-hidden">
                  <AvatarImage
                    src="/logo-circle.png"
                    alt="Logo"
                    className="object-contain h-full w-full p-1"
                  />
                  <AvatarFallback className="text-lg sm:text-xl font-bold bg-primary/15 text-primary">
                    PT
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Basic Profile Name Display */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                    {profile?.fullName || "Admin User"}
                  </h2>
                  <Badge variant="secondary" className="text-[10px] sm:text-[11px] gap-1 py-0.5 px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    <ShieldCheck className="h-3 w-3" />
                    Active User
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {profile?.email || "No email available"}
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

        {/* Account Info */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Account Info
            </CardTitle>
            <CardDescription className="text-xs">
              Authentication and account metadata
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <span className="text-muted-foreground">App Brand Logo</span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Active
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Accent Customization Card */}
        <Card className="border shadow-xs md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Theme Accent Color
            </CardTitle>
            <CardDescription className="text-xs">
              Choose your primary highlight palette for buttons, active indicators, and charts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {THEME_ACCENTS.map((accent) => {
                const isSelected = activeAccent.id === accent.id;
                return (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() => {
                      settingsService.setTheme(accent.id);
                      setActiveAccent(accent);
                      toast({
                        title: "🎨 Theme Accent Updated",
                        description: `Switched to ${accent.name} (synced across your account)`,
                      });
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20"
                        : "border-border/60 hover:bg-muted/60"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full shadow-inner flex items-center justify-center text-white"
                      style={{ background: accent.colorHex }}
                    >
                      {isSelected && <Check className="h-4 w-4" />}
                    </div>
                    <span className={`text-xs font-medium ${isSelected ? "text-primary font-bold" : "text-foreground"}`}>
                      {accent.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
