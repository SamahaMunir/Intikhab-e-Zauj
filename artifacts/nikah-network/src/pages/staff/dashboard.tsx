import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Users, FileText, CheckCircle, Shield, Sparkles, Check, X, BarChart3, Settings, LogOut } from "lucide-react";

function age(dob: string) {
  return new Date().getFullYear() - new Date(dob).getFullYear();
}

export default function StaffDashboard() {
  const { users, proposals, messages, counselling, matches, approveMatch, rejectMatch, currentUser, logout } = useStore();
  const [, setLocation] = useLocation();

  if (!currentUser) return null;

  // ============================================================================
  // ADMIN DASHBOARD
  // ============================================================================
  if (currentUser.role === 'admin') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage staff, audit logs, and system settings</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              logout();
              setLocation('/staff-login');
            }}
            className="flex gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Main Admin Options */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Staff Management */}
          <Link href="/staff/admin-panel">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Staff Management</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Add, remove, and manage staff members
                    </p>
                  </div>
                  <Button className="w-full">Manage Staff</Button>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Audit Logs */}
          <Link href="/staff/audit">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Audit Logs</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      View system activity and staff actions
                    </p>
                  </div>
                  <Button variant="outline" className="w-full">View Logs</Button>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* System Settings */}
          <Link href="/staff/config">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">System Settings</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Configure platform settings
                    </p>
                  </div>
                  <Button variant="outline" className="w-full">Settings</Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Admin Info Card */}
        <Card className="bg-linear-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{currentUser.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">{currentUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-semibold capitalize px-3 py-1 rounded-full bg-blue-100 text-blue-700 w-fit">
                  {currentUser.role}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // REGULAR STAFF DASHBOARD
  // ============================================================================
  const pendingProfiles = users.filter(u => u.profileStatus === "pending").length;
  const pendingProposals = proposals.filter(p => p.status === "pending_staff_approval").length;
  const pendingMessages = messages.filter(m => m.status === "pending_staff_review").length;
  const pendingCounselling = counselling.filter(c => c.status === "pending").length;

  const pendingMatches = matches
    .filter(m => m.status === "suggested")
    .sort((a, b) => b.score - a.score);

  const userById = (id: string) => users.find(u => u.id === id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Staff Dashboard</h1>
          <p className="text-muted-foreground mt-1">Auto-generated matches awaiting your review.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            logout();
            setLocation('/staff-login');
          }}
          className="flex gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-primary text-primary-foreground border-none">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-primary-foreground/80 text-xs font-medium">Pending Matches</p>
                <h3 className="text-3xl font-bold mt-1">{pendingMatches.length}</h3>
              </div>
              <Sparkles className="h-7 w-7 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-xs font-medium">Pending Profiles</p>
                <h3 className="text-3xl font-bold mt-1">{pendingProfiles}</h3>
              </div>
              <Users className="h-7 w-7 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-xs font-medium">Pending Proposals</p>
                <h3 className="text-3xl font-bold mt-1">{pendingProposals}</h3>
              </div>
              <FileText className="h-7 w-7 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-xs font-medium">Pending Q&amp;A</p>
                <h3 className="text-3xl font-bold mt-1">{pendingMessages}</h3>
              </div>
              <Shield className="h-7 w-7 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-xs font-medium">Counselling</p>
                <h3 className="text-3xl font-bold mt-1">{pendingCounselling}</h3>
              </div>
              <CheckCircle className="h-7 w-7 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Auto-Generated Matches
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Suggested by the matching engine for every approved profile. Approve to release them to applicants, or reject to remove.
            </p>
          </div>
          <Link href="/staff/matches"><Button variant="outline" size="sm">View all</Button></Link>
        </CardHeader>
        <CardContent>
          {pendingMatches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No matches awaiting review. New matches appear here automatically when profiles are approved.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingMatches.slice(0, 8).map(m => {
                const a = userById(m.userAId);
                const b = userById(m.userBId);
                if (!a || !b) return null;
                return (
                  <div key={m.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card hover-elevate">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      <div>
                        <p className="font-semibold">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{age(a.dob)} yrs · {a.city} · {a.education}</p>
                      </div>
                      <div className="flex items-center gap-2 justify-center">
                        <Badge variant="secondary" className="text-base px-3 py-1">{m.score}% match</Badge>
                      </div>
                      <div className="text-right sm:text-left">
                        <p className="font-semibold">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{age(b.dob)} yrs · {b.city} · {b.education}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => currentUser && rejectMatch(m.id, currentUser.id)}>
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                      <Button size="sm" onClick={() => currentUser && approveMatch(m.id, currentUser.id)}>
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}