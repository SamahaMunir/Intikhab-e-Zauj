import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Matches() {
  const { currentUser, matches, users } = useStore();
  if (!currentUser) return null;

  const myMatches = matches.filter(m => (m.userAId === currentUser.id || m.userBId === currentUser.id) && m.status === "approved");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold">Suggested Matches</h1>
      
      {myMatches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No matches found yet. We will notify you when we find suitable profiles.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myMatches.map(m => {
            const otherId = m.userAId === currentUser.id ? m.userBId : m.userAId;
            const otherUser = users.find(u => u.id === otherId);
            if (!otherUser) return null;

            return (
              <Card key={m.id} className="hover-elevate">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {otherUser.name}
                    <Badge variant="secondary" className="bg-primary/10 text-primary">{m.score}% Match</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>{new Date().getFullYear() - new Date(otherUser.dob).getFullYear()} yrs • {otherUser.city} • {otherUser.education}</p>
                    <p>{otherUser.occupation}</p>
                  </div>
                  <Link href={`/app/match/${m.id}`}>
                    <Button className="w-full">View Profile</Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
