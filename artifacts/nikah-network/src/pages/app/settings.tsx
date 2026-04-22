import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function AppSettings() {
  const { currentUser } = useStore();
  
  if (!currentUser) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-serif font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose what you want to be notified about.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-matches">New Matches</Label>
            <Switch id="notif-matches" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-proposals">New Proposals</Label>
            <Switch id="notif-proposals" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-messages">New Messages</Label>
            <Switch id="notif-messages" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy & Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Data Retention Notice</p>
            As part of Falah Khandan Center guidelines, your data is kept secure and never shared with third parties. If you wish to delete your account, please contact staff.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
