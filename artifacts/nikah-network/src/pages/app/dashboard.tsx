import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Users, BarChart3, Shield, LogOut, Settings } from "lucide-react";

export default function StaffDashboard() {
  const { currentUser } = useStore();
  const [, setLocation] = useLocation();

  if (!currentUser) return null;

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setLocation('/staff-login');
  };

  // ADMIN DASHBOARD
  if (currentUser.role === 'admin') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage staff, audit logs, and system settings
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
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
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
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

  // REGULAR STAFF DASHBOARD
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">
            Staff Portal
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome, {currentUser.name}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="flex gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

      {/* Staff Options */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Profiles */}
        <Link href="/staff/profiles">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Profiles</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Review and approve member profiles
                  </p>
                </div>
                <Button className="w-full">Manage Profiles</Button>
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
                    View your activity history
                  </p>
                </div>
                <Button variant="outline" className="w-full">View Logs</Button>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Staff Info Card */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Your Account
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
              <p className="font-semibold capitalize px-3 py-1 rounded-full bg-green-100 text-green-700 w-fit">
                {currentUser.role}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}