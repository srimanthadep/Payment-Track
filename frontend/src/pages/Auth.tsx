import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import SpecularButton from "@/components/ui/SpecularButton";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    const emailIdentifier = cleanUsername.includes("@")
      ? cleanUsername
      : `${cleanUsername}@paymenttrack.local`;

    const { error } = await supabase.auth.signInWithPassword({
      email: emailIdentifier,
      password,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Sign In Failed",
        description: error.message.includes("Invalid login credentials")
          ? "Invalid username or password. Please check your credentials."
          : error.message,
        variant: "destructive",
      });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-lg border border-border/80">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-3">
            <img
              src="/logo-circle.png"
              alt="Payment Tracker"
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-full drop-shadow-md object-contain transition-transform duration-300 hover:scale-105"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Payment Tracker</CardTitle>
          <CardDescription>Sign in to manage your payment transactions and profits</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-username">Username</Label>
              <div className="relative">
                <Input
                  id="signin-username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
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
                disabled={isLoading}
                className="w-full font-semibold shadow-md py-3 text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </SpecularButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
