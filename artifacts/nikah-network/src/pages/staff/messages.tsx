import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function StaffMessages() {
  const { messages, users, proposals, approveMessage, rejectMessage, currentUser } = useStore();
  if (!currentUser) return null;

  const pendingMessages = messages.filter(m => m.status === "pending_staff_review");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Q&A Moderation</h1>
        <p className="text-muted-foreground">Review questions and replies for adherence to guidelines.</p>
      </div>

      <div className="space-y-4">
        {pendingMessages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Queue is empty.
            </CardContent>
          </Card>
        ) : (
          pendingMessages.map(msg => {
            const sender = users.find(u => u.id === msg.senderId);
            const proposal = proposals.find(p => p.id === msg.proposalId);
            
            return (
              <Card key={msg.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">From: {sender?.name}</CardTitle>
                    <Badge variant="outline" className="capitalize">{msg.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-md text-foreground">
                    {msg.text}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="destructive" onClick={() => rejectMessage(msg.id, currentUser.id, "Inappropriate content")}>Reject</Button>
                    <Button onClick={() => approveMessage(msg.id, currentUser.id)}>Approve Message</Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  );
}
