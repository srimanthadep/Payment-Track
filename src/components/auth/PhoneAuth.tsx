import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export const PhoneAuth = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const sendOTP = async () => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ""))) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number (e.g., +1234567890)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phoneNumber: phoneNumber.replace(/\s/g, ""), channel },
      });

      // Check for Supabase function invocation error
      if (error) {
        console.error("Function error:", error);
        
        // Try to extract error message from various possible formats
        let errorMsg = error.message || "Failed to invoke OTP function";
        
        // If error is an object with more details, try to extract them
        if (error.context?.msg) {
          errorMsg = error.context.msg;
        } else if (error.message) {
          errorMsg = error.message;
        }
        
        throw new Error(errorMsg);
      }

      // Check if the response contains an error (even if status is 200)
      if (data?.error) {
        const errorMsg = typeof data.error === 'string' ? data.error : data.error.message || 'Unknown error';
        throw new Error(errorMsg);
      }

      // If in dev mode, show the OTP in the toast
      if (data?.devMode && data?.otp) {
        toast({
          title: "OTP Generated (DEV MODE)",
          description: `Your OTP is: ${data.otp}. This is shown because Twilio is not configured.`,
        });
      } else {
      toast({
        title: "OTP Sent",
          description: `Verification code sent via ${channel.toUpperCase()}`,
      });
      }

      setOtpSent(true);
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      
      // Extract error message from various possible locations
      let errorMessage = "Failed to send OTP";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = typeof error.error === 'string' ? error.error : error.error.message || errorMessage;
      } else if (data?.error) {
        errorMessage = typeof data.error === 'string' ? data.error : data.error.message || errorMessage;
      }
      
      // Check if it's a network error
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyAndSignUp = async () => {
    setLoading(true);
    try {
      // Verify OTP first
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-otp", {
        body: { phoneNumber, otpCode: otp },
      });

      if (verifyError) throw verifyError;

      if (!verifyData.success) {
        toast({
          title: "Invalid OTP",
          description: "Please check your code and try again",
          variant: "destructive",
        });
        return;
      }

      // Create account with email/password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phoneNumber,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      // Update profile with phone number
      if (authData.user) {
        await supabase
          .from("profiles")
          .update({ phone_number: phoneNumber })
          .eq("id", authData.user.id);
      }

      toast({
        title: "Success",
        description: "Account created successfully",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast({
        title: "Error",
        description: "Failed to verify OTP or create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!otpSent ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel">Verification Method</Label>
            <Select value={channel} onValueChange={(value: "sms" | "whatsapp") => setChannel(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={sendOTP} disabled={loading || !phoneNumber} className="w-full">
            {loading ? "Sending..." : "Send Verification Code"}
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="otp">Enter Verification Code</Label>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button onClick={verifyAndSignUp} disabled={loading || otp.length !== 6} className="w-full">
            {loading ? "Verifying..." : "Verify & Create Account"}
          </Button>

          <Button variant="ghost" onClick={() => setOtpSent(false)} className="w-full">
            Change Phone Number
          </Button>
        </>
      )}
    </div>
  );
};
