import { useStore } from "@/lib/store";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, User, Heart, MapPin, Briefcase, GraduationCap } from "lucide-react";

export default function MatchDetail() {
  const params = useParams();
  const id = params.id as string;
  const { currentUser, matches, users, sendProposal, proposals } = useStore();

  if (!currentUser) return null;

  const match = matches.find(m => m.id === id);
  if (!match) return <div className="p-8">Match not found.</div>;

  const otherId = match.userAId === currentUser.id ? match.userBId : match.userAId;
  const otherUser = users.find(u => u.id === otherId);
  if (!otherUser) return <div className="p-8">User not found.</div>;

  const existingProposal = proposals.find(p => 
    (p.initiatorId === currentUser.id && p.recipientId === otherUser.id) || 
    (p.initiatorId === otherUser.id && p.recipientId === currentUser.id)
  );

  const handleSendProposal = () => {
    sendProposal(currentUser.id, otherUser.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/app/matches">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-3xl font-serif font-bold">Match Detail</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-full overflow-hidden mb-4 bg-muted border-4 border-primary/20">
                {otherUser.avatar ? (
                  <img src={otherUser.avatar} alt={otherUser.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 m-8 text-muted-foreground" />
                )}
              </div>
              <h2 className="text-2xl font-serif font-bold">{otherUser.name}</h2>
              <p className="text-muted-foreground">{new Date().getFullYear() - new Date(otherUser.dob).getFullYear()} yrs • {otherUser.maritalStatus}</p>
              
              <div className="mt-6 w-full space-y-3 text-left text-sm">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {otherUser.city}</div>
                <div className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" /> {otherUser.education}</div>
                <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" /> {otherUser.occupation}</div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 pt-4">
              {existingProposal ? (
                <Button className="w-full" disabled>Proposal {existingProposal.status.replace(/_/g, ' ')}</Button>
              ) : (
                <Button className="w-full" onClick={handleSendProposal}>Send Proposal</Button>
              )}
            </CardFooter>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{otherUser.bio || "No bio provided."}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Match Compatibility</span>
                <span className="text-primary font-bold text-xl">{match.score}%</span>
              </CardTitle>
              <CardDescription>Breakdown of how well your preferences align.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(match.breakdown).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1 capitalize">
                    <span>{key}</span>
                    <span className="font-medium">{value}%</span>
                  </div>
                  <Progress value={value} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
