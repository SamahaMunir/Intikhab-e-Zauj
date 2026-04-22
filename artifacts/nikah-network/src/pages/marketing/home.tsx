import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ShieldCheck, Users, MessageCircle } from "lucide-react";
import heroImg from "@/assets/images/hero.png";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background">
        <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-8 z-10 text-center md:text-left">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-foreground leading-tight">
              Where families find <span className="text-primary italic">barakah</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto md:mx-0">
              A secure, staff-moderated matrimonial platform by Falah Khandan Center. We prioritize respect, privacy, and family involvement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto text-base">Join the Network</Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base">How it Works</Button>
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full max-w-xl mx-auto z-10 relative">
            <div className="absolute inset-0 bg-primary/10 rounded-[2rem] transform rotate-3 scale-105 -z-10"></div>
            <img 
              src={heroImg} 
              alt="Hands holding a Quran" 
              className="rounded-[2rem] w-full h-auto object-cover shadow-2xl"
            />
          </div>
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"></div>
      </section>

      {/* Trust Pillars */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">A Dignified Approach to Matchmaking</h2>
            <p className="text-muted-foreground">We blend modern technology with traditional Islamic values to create a safe space for finding your life partner.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-card border-none shadow-md hover-elevate">
              <CardContent className="p-8 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-serif font-semibold">100% Staff Moderated</h3>
                <p className="text-muted-foreground">Every profile, photo, and message is reviewed by our dedicated staff to ensure authenticity and respect.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-none shadow-md hover-elevate">
              <CardContent className="p-8 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-serif font-semibold">Structured Q&A</h3>
                <p className="text-muted-foreground">No open chat. Communication happens through thoughtful, moderated questions and answers.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-none shadow-md hover-elevate">
              <CardContent className="p-8 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-serif font-semibold">Family Oriented</h3>
                <p className="text-muted-foreground">Built to support family involvement throughout the process, honoring our cultural and religious values.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Counselling Teaser */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">Pre & Post Marriage Counselling</h2>
          <p className="text-lg mb-8 opacity-90">
            Marriage is a journey. Falah Khandan Center provides professional counselling services to help you build a strong foundation and navigate challenges together.
          </p>
          <Link href="/counselling">
            <Button variant="secondary" size="lg" className="text-primary font-medium">Learn About Counselling</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}