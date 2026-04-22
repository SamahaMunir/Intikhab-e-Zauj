import { useState } from "react";
import { useStore } from "@/lib/store";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send } from "lucide-react";

export default function ProposalDetail() {
  const params = useParams();
  const id = params.id as string;
  const { currentUser, proposals, users, messages, askQuestion, replyMessage } = useStore();
  const [text, setText] = useState("");

  if (!currentUser) return null;

  const proposal = proposals.find(p => p.id === id);
  if (!proposal) return <div className="p-8">Proposal not found.</div>;

  const isInitiator = proposal.initiatorId === currentUser.id;
  const otherId = isInitiator ? proposal.recipientId : proposal.initiatorId;
  const otherUser = users.find(u => u.id === otherId);
  if (!otherUser) return <div className="p-8">User not found.</div>;

  const proposalMessages = messages.filter(m => m.proposalId === id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handleSend = () => {
    if (!text.trim()) return;
    // Simple heuristic: if the last message was from the other person, it's a reply. Else, question.
    const lastMsg = proposalMessages[proposalMessages.length - 1];
    if (lastMsg && lastMsg.senderId === otherId) {
      replyMessage(id, currentUser.id, text);
    } else {
      askQuestion(id, currentUser.id, text);
    }
    setText("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/app/proposals">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-3xl font-serif font-bold">Proposal with {otherUser.name}</h1>
        <Badge variant={proposal.status === 'approved' ? 'default' : 'secondary'} className="capitalize ml-auto">
          {proposal.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b">
              <CardTitle>Q&A Thread</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {proposalMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No messages yet. Start the conversation with a thoughtful question.
                </div>
              ) : (
                proposalMessages.map(msg => {
                  const isMine = msg.senderId === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">{isMine ? 'You' : otherUser.name}</span>
                        {msg.status !== 'approved' && (
                          <Badge variant="outline" className="text-[10px] py-0 h-4">{msg.status.replace(/_/g, ' ')}</Badge>
                        )}
                      </div>
                      <div className={`p-3 rounded-lg max-w-[80%] ${
                        isMine 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-muted rounded-tl-none'
                      } ${msg.status === 'rejected' ? 'opacity-50 line-through' : ''}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
            {proposal.status === 'approved' && (
              <CardFooter className="p-4 border-t gap-2">
                <Textarea 
                  value={text} 
                  onChange={e => setText(e.target.value)} 
                  placeholder="Type your question or reply..."
                  className="resize-none min-h-[80px]"
                />
                <Button onClick={handleSend} className="h-auto self-stretch aspect-square"><Send className="w-5 h-5" /></Button>
              </CardFooter>
            )}
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <p>• All messages are reviewed by staff before being sent.</p>
              <p>• Keep questions under 300 characters.</p>
              <p>• Keep replies under 500 characters.</p>
              <p>• Be respectful and honest.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
