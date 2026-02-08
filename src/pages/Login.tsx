import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [serviceNumber, setServiceNumber] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceNumber.trim() || !name.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // In a real app, we'd use email/password or another auth method.
      // For this system, we'll use a simplified flow where we check if a profile exists.
      // If doesn't exist, we can't really "sign in" without a password unless we use an OTP or similar.
      // However, for this demo/conversion, let's assume we use the serviceNumber as a pseudo-identifier.

      // Attempt to find user profile by service number
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('service_number', serviceNumber)
        .single();

      if (profileError || !profile) {
        // If not found, we might want to "sign up" or just show error
        // Let's sign them up for now to make it easy for the user to start
        const email = `${serviceNumber}@army.system`;
        const password = "TemporaryPassword123!"; // This is just for demonstration

        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          // Try to sign up if sign in fails (meaning user doesn't exist)
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name,
                service_number: serviceNumber,
              }
            }
          });

          if (signUpError) {
            setError(signUpError.message);
            return;
          }
          toast.success("Account created successfully!");
        }
      } else {
        // User exists, attempt sign in
        const email = `${serviceNumber}@army.system`;
        const password = "TemporaryPassword123!";

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          setError("Invalid credentials or server error");
          return;
        }
      }

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
        <div className="bg-card rounded-lg shadow-lg border border-border p-8">
          <h2 className="text-lg font-semibold text-foreground mb-6 text-center">
            Sign In
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="serviceNumber" className="text-sm font-medium text-foreground">
                Service Number
              </Label>
              <Input
                id="serviceNumber"
                type="text"
                placeholder="Enter service number"
                value={serviceNumber}
                onChange={(e) => {
                  setServiceNumber(e.target.value);
                  setError("");
                }}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
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
                <LogIn className="w-4 h-4 mr-2" />
              )}
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Authorized Personnel Only
        </p>
      </div>
    </div>
  );
};

export default Login;
