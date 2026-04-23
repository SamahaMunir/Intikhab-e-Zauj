import { useState } from "react";
import { useStore, type User } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function StaffRegister() {
  const [, setLocation] = useLocation();
  const { register } = useStore();
  const [form, setForm] = useState({ name: "", email: "", inviteCode: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newStaff: User = {
      id: `staff${Date.now()}`,
      email: form.email,
      role: "staff",
      name: form.name,
      profileStatus: "approved",
      gender: "F",
      dob: "1985-01-01",
      city: "Lahore",
      caste: "N/A",
      education: "Masters",
      occupation: "Counsellor",
      income: 0,
      bio: "Staff member",
      maritalStatus: "single",
      children: 0,
      preferences: { ageMin: 0, ageMax: 0, locationRadius: 0, castePrefs: [], educationMin: "", incomeMin: 0 },
      completion: 100,
    };
    register(newStaff);
    setLocation("/staff/dashboard");
  };

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-16rem)] py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-serif">Create Staff Account</CardTitle>
          <CardDescription>Requires an invite code from the administrator</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite">Invite Code</Label>
              <Input id="invite" placeholder="FKC-2026" value={form.inviteCode} onChange={(e) => setForm({ ...form, inviteCode: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full">Create Staff Account</Button>
            <p className="text-sm text-center text-muted-foreground">Demo: invite code is not validated.</p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
