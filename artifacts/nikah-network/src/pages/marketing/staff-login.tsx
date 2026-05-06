import { useState } from "react";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle } from "lucide-react";

export default function StaffLogin() {
  const [email, setEmail] = useState("staff@nikahnetwork.pk");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { login, users } = useStore();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setIsLoading(true);

  try {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    const response = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    console.log("Login response status:", response.status);

    const data = await response.json();

    // ✅ SUCCESS
    if (response.ok && data.token) {
      console.log(
        "Login success! Token received:",
        data.token.substring(0, 20) + "..."
      );

      // Store JWT
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      console.log("Token stored in localStorage");

      // Sync with Zustand store
      const staffUser = users.find(
        (u) =>
          u.email === data.user.email &&
          (u.role === "staff" || u.role === "admin")
      );

      if (staffUser) {
        login(staffUser.id);
      }

      // Redirect
      setLocation("/staff/dashboard");
      return;
    }

    // ❌ ERROR (no fallback now)
    setError(data.message || "Invalid email or password");
  } catch (err) {
    console.error("Login error:", err);
    setError("Server error. Please try again later.");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-16rem)] py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-serif">Staff Sign In</CardTitle>
          <CardDescription>Access the moderation dashboard</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Staff Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="staff@nikahnetwork.pk" 
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
                placeholder="staff123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            {error && (
              <div className="flex gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In to Staff Portal"}
            </Button>
            <div className="space-y-2 text-sm text-muted-foreground bg-slate-50 p-3 rounded-lg">
              <p className="font-semibold">Staff Credentials:</p>
              <p>📧 Email: staff@nikahnetwork.pk</p>
              <p>🔑 Password: staff123</p>
              <p className="text-xs mt-2">✓ Backend: Uses real JWT if running</p>
              <p className="text-xs">✓ Offline: Falls back to demo mode</p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}