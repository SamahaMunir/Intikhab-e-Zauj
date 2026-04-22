import { useState } from "react";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Register() {
  const [, setLocation] = useLocation();
  const { login, users } = useStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const applicant = users.find(u => u.role === "applicant");
    if (applicant) {
      login(applicant.id);
      setLocation("/app/dashboard");
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-16rem)] py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-center">Create an Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" required />
            </div>
            <Button type="submit" className="w-full">Register</Button>
            <p className="text-sm text-center text-muted-foreground mt-4">
              Demo: Registers and logs you in as default applicant.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
