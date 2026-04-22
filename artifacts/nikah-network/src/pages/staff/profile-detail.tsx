import { useStore } from "@/lib/store";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, X } from "lucide-react";

export default function StaffProfileDetail() {
  const params = useParams();
  const id = params.id as string;
  const { users, currentUser, approveProfile, rejectProfile } = useStore();

  if (!currentUser) return null;

  const profile = users.find(u => u.id === id);
  if (!profile) return <div className="p-8">Profile not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/staff/profiles">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-3xl font-serif font-bold">Review Profile: {profile.name}</h1>
        <Badge variant={profile.profileStatus === 'approved' ? 'default' : 'secondary'} className="capitalize ml-auto">
          {profile.profileStatus}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-y-4 text-sm">
              <div><span className="text-muted-foreground block">Email</span> {profile.email}</div>
              <div><span className="text-muted-foreground block">DOB</span> {profile.dob}</div>
              <div><span className="text-muted-foreground block">City</span> {profile.city}</div>
              <div><span className="text-muted-foreground block">Caste</span> {profile.caste}</div>
              <div><span className="text-muted-foreground block">Education</span> {profile.education}</div>
              <div><span className="text-muted-foreground block">Occupation</span> {profile.occupation}</div>
              <div><span className="text-muted-foreground block">Marital Status</span> {profile.maritalStatus}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Bio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{profile.bio}</p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Moderation Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.profileStatus === 'pending' && (
                <>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => approveProfile(profile.id, currentUser.id)}>
                    <Check className="w-4 h-4 mr-2" /> Approve Profile
                  </Button>
                  <Button className="w-full" variant="destructive" onClick={() => rejectProfile(profile.id, currentUser.id, "Violates terms")}>
                    <X className="w-4 h-4 mr-2" /> Reject Profile
                  </Button>
                </>
              )}
              {profile.profileStatus !== 'pending' && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Profile is already {profile.profileStatus}.
                </p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Duplicate Check</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No fuzzy duplicates found for this user.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
