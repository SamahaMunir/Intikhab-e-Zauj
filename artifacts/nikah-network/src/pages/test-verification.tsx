import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Loader2, AlertCircle } from 'lucide-react';

export default function TestVerification() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  const getTestLink = async () => {
    setError('');
    setLink('');
    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiUrl}/auth/test-verification-link?email=${email}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get verification link');
      }

      console.log('✅ Verification link:', data.link);
      setLink(data.link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error getting link');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-serif">🧪 Test Verification</CardTitle>
          <CardDescription>Get verification link for testing (DEV ONLY)</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Use this to test email verification without Gmail. Enter the email you registered with.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Registered Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="test@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button
            onClick={getTestLink}
            disabled={!email || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Getting Link...
              </>
            ) : (
              'Get Verification Link'
            )}
          </Button>

          {link && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">✅ Verification Link Ready:</p>
              <div className="bg-gray-100 p-3 rounded-lg text-sm break-all">
                {link}
              </div>
              <Button
                onClick={copyLink}
                variant="outline"
                className="w-full"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button
                onClick={() => window.open(link, '_blank')}
                className="w-full"
              >
                Click Link in New Tab
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            After clicking the link, you'll be redirected to complete your profile.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}