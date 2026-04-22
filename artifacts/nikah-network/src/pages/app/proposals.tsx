import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Clock, MessageSquare } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

export default function Proposals() {
  const { currentUser, proposals, users } = useStore();
  if (!currentUser) return null;

  const sentProposals = proposals.filter(p => p.initiatorId === currentUser.id);
  const receivedProposals = proposals.filter(p => p.recipientId === currentUser.id);

  const renderProposalCard = (p: any, isReceived: boolean) => {
    const otherId = isReceived ? p.initiatorId : p.recipientId;
    const otherUser = users.find(u => u.id === otherId);
    if (!otherUser) return null;

    return (
      <Card key={p.id} className="hover-elevate">
        <CardHeader className="pb-3">
          <CardTitle className="flex justify-between items-center text-lg">
            <span>{otherUser.name}</span>
            <Badge variant={p.status === 'approved' ? 'default' : 'secondary'} className="capitalize">
              {p.status.replace(/_/g, ' ')}
            </Badge>
          </CardTitle>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> 
            Expires {formatDistanceToNow(parseISO(p.expiresAt), { addSuffix: true })}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {otherUser.city} • {otherUser.education} • {otherUser.occupation}
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Link href={`/app/proposals/${p.id}`} className="w-full">
            <Button variant={p.status === 'approved' ? 'default' : 'outline'} className="w-full">
              {p.status === 'approved' ? <><MessageSquare className="w-4 h-4 mr-2" /> View Q&A</> : 'View Details'}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold">Proposals</h1>
      
      <Tabs defaultValue="received">
        <TabsList className="mb-4">
          <TabsTrigger value="received">Received ({receivedProposals.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sentProposals.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="received" className="space-y-4">
          {receivedProposals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No received proposals.
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {receivedProposals.map(p => renderProposalCard(p, true))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="sent" className="space-y-4">
          {sentProposals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No sent proposals.
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sentProposals.map(p => renderProposalCard(p, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
