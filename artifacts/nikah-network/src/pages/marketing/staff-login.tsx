import { useState } from "react";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function StaffLogin() {
  const [email, setEmail] = useState("");
  const [, setLocation] = useLocation();
  const { login, users } = useStore();
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email === email && (u.role === "staff" || u.role === "admin"));
    if (user) {
      login(user.id);
      setLocation("/staff/dashboard");
    } else {
      const fallback = users.find(u => u.role === "staff");
      if (fallback) { login(fallback.id); setLocation("/staff/dashboard"); }
      else setError("No staff account found");
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
              <Input id="email" type="email" placeholder="staff@nikahnetwork.pk" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full">Sign In to Staff Portal</Button>
            <p className="text-sm text-center text-muted-foreground">Demo: any email signs you in as staff.</p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
