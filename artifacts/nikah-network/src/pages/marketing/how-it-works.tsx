export default function HowItWorks() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-serif font-bold mb-6">How It Works</h1>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-2">1. Register</h2>
          <p className="text-muted-foreground">Create a profile and provide your details.</p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-2">2. Verification</h2>
          <p className="text-muted-foreground">Our staff reviews and approves your profile.</p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-2">3. Match</h2>
          <p className="text-muted-foreground">Receive suggested matches based on your preferences.</p>
        </div>
      </div>
    </div>
  );
}
