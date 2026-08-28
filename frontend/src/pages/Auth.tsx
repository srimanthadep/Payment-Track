import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  UserPlus, 
  LogIn, 
  Lock, 
  User, 
  Building2, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  Sparkles
} from "lucide-react";
import SpecularButton from "@/components/ui/SpecularButton";
import { motion, AnimatePresence } from "framer-motion";

import { invokeBackendApi } from "@/integrations/backend/api";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const defaultTab = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Sign In Form State
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInIdentifier, setSignInIdentifier] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up Form State
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [signUpIdentifier, setSignUpIdentifier] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  useEffect(() => {
    // Check if user is already logged in, handle stale refresh tokens
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Clear invalid stale token
        supabase.auth.signOut().catch(() => {});
      } else if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup" || mode === "signin") {
      setActiveTab(mode);
    }
  }, [searchParams]);

  // Convert raw username to standard email format if needed
  const formatEmail = (identifier: string) => {
    const clean = identifier.trim().toLowerCase();
    if (clean.includes("@")) {
      return clean;
    }
    // Clean spaces and special characters for username-to-email mapping
    const safeUsername = clean.replace(/[^a-z0-9._-]/g, "");
    return `${safeUsername || "user"}@paymenttrack.com`;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInIdentifier || !signInPassword) {
      toast({
        title: "Missing Information",
        description: "Please enter your username/email and password.",
        variant: "destructive",
      });
      return;
    }

    setSignInLoading(true);
    const emailIdentifier = formatEmail(signInIdentifier);
    console.log("[Auth] Attempting sign in for:", signInIdentifier, "->", emailIdentifier);

    try {
      // Add a 12-second timeout protection so it never hangs indefinitely
      const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(
          () => reject(new Error("Sign-in timed out. Please check your network connection and try again.")),
          12000
        )
      );

      const authPromise = supabase.auth.signInWithPassword({
        email: emailIdentifier,
        password: signInPassword,
      });

      const res: any = await Promise.race([authPromise, timeoutPromise]);
      const error = res?.error;

      if (error) {
        console.error("[Auth] Sign in failed:", error);
        toast({
          title: "Sign In Failed",
          description: error.message.includes("Invalid login credentials")
            ? "Invalid username or password. Please check your credentials."
            : error.message,
          variant: "destructive",
        });
      } else {
        console.log("[Auth] Sign in success, navigating to dashboard...");
        toast({
          title: "Welcome Back!",
          description: "Signing into your workspace...",
        });
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      console.error("[Auth] Exception during sign in:", err);
      toast({
        title: "Sign In Error",
        description: err.message || "An unexpected error occurred during sign in.",
        variant: "destructive",
      });
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({
        title: "Full Name Required",
        description: "Please provide your full name.",
        variant: "destructive",
      });
      return;
    }

    if (!signUpIdentifier.trim()) {
      toast({
        title: "Username/Email Required",
        description: "Please choose a username or enter your email.",
        variant: "destructive",
      });
      return;
    }

    if (signUpPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (signUpPassword !== confirmPassword) {
      toast({
        title: "Passwords Do Not Match",
        description: "Please ensure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    setSignUpLoading(true);
    const emailIdentifier = formatEmail(signUpIdentifier);

    try {
      // 1. Call Backend Registration API
      const { data: regData, error: regError } = await invokeBackendApi("register", {
        username: signUpIdentifier.trim(),
        email: emailIdentifier,
        password: signUpPassword,
        full_name: fullName.trim(),
        business_name: businessName.trim() || "My Business",
      });

      if (regError) {
        // If backend fails, fallback to Supabase GoTrue signUp
        const { error: sbError } = await supabase.auth.signUp({
          email: emailIdentifier,
          password: signUpPassword,
          options: {
            data: {
              full_name: fullName.trim(),
              business_name: businessName.trim() || "My Business",
              username: signUpIdentifier.trim(),
            },
          },
        });

        if (sbError) {
          throw new Error(regError.message || sbError.message);
        }
      }

      // 2. Automatically sign in with the new credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailIdentifier,
        password: signUpPassword,
      });

      if (signInError) {
        toast({
          title: "Account Created Successfully",
          description: "Please sign in with your credentials.",
        });
        setActiveTab("signin");
        setSignInIdentifier(signUpIdentifier);
      } else {
        toast({
          title: "Account Created!",
          description: `Welcome ${fullName.trim()}! Your new isolated account is ready.`,
        });
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({
        title: "Registration Error",
        description: err.message || "An unexpected error occurred during signup.",
        variant: "destructive",
      });
    } finally {
      setSignUpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4 py-8 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-accent/15 rounded-full blur-2xl pointer-events-none" />

      <Card className="w-full max-w-md shadow-2xl border border-border/80 backdrop-blur-xl bg-card/95 relative z-10 rounded-2xl overflow-hidden">
        <CardHeader className="space-y-2 text-center pb-4 pt-6">
          <div className="flex justify-center mb-2">
            <div className="relative group cursor-pointer" onClick={() => navigate("/")}>
              <img
                src="/logo-circle.png"
                alt="Payment Tracker"
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full drop-shadow-lg object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 ring-4 ring-card rounded-full p-1 shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </span>
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
            Payment Tracker
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground px-4">
            Secure multi-user payment transaction and profit tracking
          </CardDescription>

          {/* Privacy badge */}
          <div className="pt-1 flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              Isolated & 100% Private Account Data
            </span>
          </div>
        </CardHeader>

        <CardContent className="px-5 sm:px-6 pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-5 p-1 bg-muted/70 rounded-xl">
              <TabsTrigger
                value="signin"
                className="rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Create Account
              </TabsTrigger>
            </TabsList>

            {/* --- SIGN IN TAB --- */}
            <TabsContent value="signin">
              <AnimatePresence mode="wait">
                <motion.form
                  key="signin-form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignIn}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-username" className="text-xs font-semibold">
                      Username or Email
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-username"
                        type="text"
                        placeholder="e.g. srimanth or user@email.com"
                        value={signInIdentifier}
                        onChange={(e) => setSignInIdentifier(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        className="pl-9 h-11 text-sm rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password" className="text-xs font-semibold">
                        Password
                      </Label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type={showSignInPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        className="pl-9 pr-10 h-11 text-sm rounded-xl"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <SpecularButton
                      type="submit"
                      size="md"
                      radius={12}
                      tint="#1d4ed8"
                      tintOpacity={0.95}
                      textColor="#ffffff"
                      lineColor="#93c5fd"
                      baseColor="#1e3a8a"
                      intensity={1.2}
                      thickness={1.5}
                      speed={0.4}
                      followMouse
                      disabled={signInLoading}
                      className="w-full font-semibold shadow-md py-3 text-sm h-11 rounded-xl"
                    >
                      {signInLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In to Your Workspace"
                      )}
                    </SpecularButton>
                  </div>

                  <div className="text-center pt-2">
                    <p className="text-xs text-muted-foreground">
                      Don't have an account yet?{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("signup")}
                        className="text-primary font-semibold hover:underline"
                      >
                        Create one now
                      </button>
                    </p>
                  </div>
                </motion.form>
              </AnimatePresence>
            </TabsContent>

            {/* --- CREATE ACCOUNT TAB --- */}
            <TabsContent value="signup">
              <AnimatePresence mode="wait">
                <motion.form
                  key="signup-form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignUp}
                  className="space-y-3"
                >
                  <div className="space-y-1">
                    <Label htmlFor="signup-fullname" className="text-xs font-semibold">
                      Your Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-fullname"
                        type="text"
                        placeholder="e.g. Srimanth Adep"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-9 h-10 text-sm rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="signup-businessname" className="text-xs font-semibold">
                      Business / Shop Name <span className="text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-businessname"
                        type="text"
                        placeholder="e.g. Adep Enterprises"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="pl-9 h-10 text-sm rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="signup-identifier" className="text-xs font-semibold">
                      Choose Username or Email
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-identifier"
                        type="text"
                        placeholder="e.g. srimanth or srimanth@gmail.com"
                        value={signUpIdentifier}
                        onChange={(e) => setSignUpIdentifier(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        className="pl-9 h-10 text-sm rounded-xl"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      You will use this username to sign in every time.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="signup-password" className="text-xs font-semibold">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type={showSignUpPassword ? "text" : "password"}
                          placeholder="Min 6 chars"
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          className="pl-9 pr-8 h-10 text-sm rounded-xl"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                        >
                          {showSignUpPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="signup-confirm-password" className="text-xs font-semibold">
                        Confirm
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm-password"
                          type={showSignUpPassword ? "text" : "password"}
                          placeholder="Repeat pass"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-9 h-10 text-sm rounded-xl"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <SpecularButton
                      type="submit"
                      size="md"
                      radius={12}
                      tint="#059669"
                      tintOpacity={0.95}
                      textColor="#ffffff"
                      lineColor="#6ee7b7"
                      baseColor="#064e3b"
                      intensity={1.2}
                      thickness={1.5}
                      speed={0.4}
                      followMouse
                      disabled={signUpLoading}
                      className="w-full font-semibold shadow-md py-3 text-sm h-11 rounded-xl"
                    >
                      {signUpLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                          Creating your account...
                        </>
                      ) : (
                        "Create Private Account"
                      )}
                    </SpecularButton>
                  </div>

                  <div className="text-center pt-1">
                    <p className="text-xs text-muted-foreground">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("signin")}
                        className="text-primary font-semibold hover:underline"
                      >
                        Sign in here
                      </button>
                    </p>
                  </div>
                </motion.form>
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
