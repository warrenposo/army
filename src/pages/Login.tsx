import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, LogIn, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [serviceNumber, setServiceNumber] = useState("");
  const [name, setName] = useState("");

  const getEmailFromServiceNumber = (sn: string) => {
    // Sanitize in case user enters full email
    const cleanSN = sn.split('@')[0].trim();
    return `${cleanSN}@army-armoury.com`;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceNumber.trim()) {
      setError("Please enter your service number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const email = getEmailFromServiceNumber(serviceNumber);
      const password = "TemporaryPassword123!";

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("User not found. Please Sign Up first.");
        } else {
          setError(signInError.message);
        }
        return;
      }

      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceNumber.trim() || !name.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const email = getEmailFromServiceNumber(serviceNumber);
      const password = "TemporaryPassword123!";

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            service_number: serviceNumber.split('@')[0].trim(),
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      toast.success("Account created! You can now sign in.");
      // Auto sign in or switch tab? Let's just navigate if Supabase auto-signs in
      // Supabase usually signs in automatically after sign up unless validation is required
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary mb-4">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            AHQ SIG BN
          </h1>
          <p className="text-lg font-semibold text-primary mt-1">
            Armoury Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-lg shadow-lg border border-border p-6 sm:p-8">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="serviceNumber" className="text-sm font-medium">
                    Service Number
                  </Label>
                  <Input
                    id="serviceNumber"
                    type="text"
                    placeholder="e.g. 12345"
                    value={serviceNumber}
                    onChange={(e) => {
                      setServiceNumber(e.target.value);
                      setError("");
                    }}
                    className="h-11"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4 mr-2" />
                  )}
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="regServiceNumber" className="text-sm font-medium">
                    Service Number
                  </Label>
                  <Input
                    id="regServiceNumber"
                    type="text"
                    placeholder="e.g. 12345"
                    value={serviceNumber}
                    onChange={(e) => {
                      setServiceNumber(e.target.value);
                      setError("");
                    }}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regName" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="regName"
                    type="text"
                    placeholder="e.g. Warren Poso Okumu"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError("");
                    }}
                    className="h-11"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Authorized Personnel Only
        </p>
      </div>
    </div>
  );
};

export default Login;
