import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";

export default function AppDashboard() {
  const { currentUser, matches, proposals } = useStore();

  if (!currentUser) return null;

  const pendingMatches = matches.filter(m => (m.userAId === currentUser.id || m.userBId === currentUser.id) && m.status === "approved").length;
  const activeProposals = proposals.filter(p => (p.initiatorId === currentUser.id || p.recipientId === currentUser.id) && p.status !== "expired" && p.status !== "declined").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Welcome, {currentUser.name.split(' ')[0]}</h1>
        <p className="text-muted-foreground mt-1">Here is a summary of your activity on Nikah Network.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Profile Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-2">
              <Progress value={currentUser.completion} className="flex-1" />
              <span className="text-sm font-medium">{currentUser.completion}%</span>
            </div>
            {currentUser.completion < 100 ? (
              <p className="text-sm text-muted-foreground mb-4">Complete your profile to receive better matches.</p>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">Your profile is complete and visible to approved matches.</p>
            )}
            <Link href="/app/profile">
              <Button variant="outline" size="sm">Edit Profile</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Account Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-medium capitalize px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {currentUser.profileStatus}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">New Matches</span>
                <span className="text-sm font-medium">{pendingMatches}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Proposals</span>
                <span className="text-sm font-medium">{activeProposals}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex justify-between items-center">
              Recent Matches
              <Link href="/app/matches">
                <Button variant="ghost" size="sm" className="h-8 text-xs">View All</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingMatches === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">No new matches right now. Check back later.</p>
              </div>
            ) : (
              <div className="space-y-4">
                 {/* Preview matches would go here */}
                 <p className="text-sm text-muted-foreground">You have {pendingMatches} suggested matches waiting for your review.</p>
                 <Link href="/app/matches">
                  <Button className="w-full">View Matches</Button>
                 </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex justify-between items-center">
              Recent Proposals
              <Link href="/app/proposals">
                <Button variant="ghost" size="sm" className="h-8 text-xs">View All</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
             {activeProposals === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">No active proposals right now.</p>
              </div>
            ) : (
              <div className="space-y-4">
                 {/* Preview proposals would go here */}
                 <p className="text-sm text-muted-foreground">You have {activeProposals} active proposals in progress.</p>
                 <Link href="/app/proposals">
                  <Button variant="outline" className="w-full">Manage Proposals</Button>
                 </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}