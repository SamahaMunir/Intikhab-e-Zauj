export default function Pricing() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-serif font-bold mb-6">Pricing</h1>
      <div className="p-8 border rounded-lg bg-card">
        <h2 className="text-2xl font-semibold mb-4">Standard Plan</h2>
        <p className="text-4xl font-bold mb-4">PKR 4,000 <span className="text-lg font-normal text-muted-foreground">/ year</span></p>
        <ul className="space-y-2 mb-8">
          <li>✓ Staff-moderated profile</li>
          <li>✓ Verified matches</li>
          <li>✓ Secure Q&A communication</li>
        </ul>
      </div>
    </div>
  );
}
