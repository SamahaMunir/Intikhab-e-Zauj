import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function About() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-serif font-bold mb-6">About Us</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Nikah Network is dedicated to helping families find suitable matches in a secure, staff-moderated environment.
      </p>
      <div className="prose dark:prose-invert">
        <h2>Our Mission</h2>
        <p>To provide a dignified approach to matchmaking, blending modern technology with traditional Islamic values.</p>
      </div>
    </div>
  );
}
