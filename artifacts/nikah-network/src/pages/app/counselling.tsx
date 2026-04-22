import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AppCounselling() {
  const { currentUser, counselling } = useStore();
  if (!currentUser) return null;

  const myRequests = counselling.filter(c => c.userId === currentUser.id);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-serif font-bold">Counselling</h1>
        <p className="text-muted-foreground">Request guidance from our professional staff.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Session</CardTitle>
            <CardDescription>Submit a request and staff will assign a counsellor.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label>Counselling Type</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_marriage">Pre-Marriage</SelectItem>
                    <SelectItem value="post_marriage">Post-Marriage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topic / Concern</Label>
                <Input placeholder="E.g., Financial planning, conflict resolution..." />
              </div>
              <Button className="w-full">Submit Request</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Requests</h2>
          {myRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                You have no active counselling requests.
              </CardContent>
            </Card>
          ) : (
            myRequests.map(req => (
              <Card key={req.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{req.topic}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(req.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                  <Badge variant={req.status === 'completed' ? 'secondary' : 'default'} className="capitalize">
                    {req.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
