import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, CheckCircle, Shield, AlertTriangle } from "lucide-react";

export default function StaffDashboard() {
  const { users, proposals, messages, counselling } = useStore();

  const pendingProfiles = users.filter(u => u.profileStatus === "pending").length;
  const pendingProposals = proposals.filter(p => p.status === "pending_staff_approval").length;
  const pendingMessages = messages.filter(m => m.status === "pending_staff_review").length;
  const pendingCounselling = counselling.filter(c => c.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Staff Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of platform moderation queue.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary text-primary-foreground border-none">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-primary-foreground/80 text-sm font-medium">Pending Profiles</p>
                <h3 className="text-3xl font-bold mt-2">{pendingProfiles}</h3>
              </div>
              <Users className="h-8 w-8 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Pending Proposals</p>
                <h3 className="text-3xl font-bold mt-2">{pendingProposals}</h3>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Pending Messages</p>
                <h3 className="text-3xl font-bold mt-2">{pendingMessages}</h3>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Counselling Req</p>
                <h3 className="text-3xl font-bold mt-2">{pendingCounselling}</h3>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground text-sm">
              Activity feed will appear here.
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Select an item from the sidebar to manage it.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}