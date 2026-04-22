import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { currentUser, updateProfile } = useStore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "", city: "", occupation: "", bio: ""
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name,
        city: currentUser.city,
        occupation: currentUser.occupation,
        bio: currentUser.bio
      });
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(currentUser.id, formData);
    toast({ title: "Profile Updated", description: "Your changes have been saved." });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-serif font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your public information.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
          <CardDescription>This information is visible to approved matches.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Occupation</Label>
                <Input value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>About Me</Label>
              <Textarea 
                className="min-h-[120px]"
                value={formData.bio} 
                onChange={e => setFormData({...formData, bio: e.target.value})} 
                placeholder="Share a little about yourself, your values, and what you're looking for..."
              />
            </div>
            <Button type="submit">Save Changes</Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Add preferences section here as well later */}
    </div>
  );
}
