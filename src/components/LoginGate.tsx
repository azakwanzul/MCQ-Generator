import { useState } from 'react';
import { LogIn, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthProvider';
import { toast } from '@/hooks/use-toast';

const LoginGate = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithEmail } = useAuth();

  const handleLogin = async () => {
    if (!email) {
      toast({ title: 'Enter email', description: 'Please enter your email address' });
      return;
    }
    
    setIsLoading(true);
    const { error } = await signInWithEmail(email);
    setIsLoading(false);
    
    if (error) {
      toast({ title: 'Login failed', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'We sent you a magic link to sign in' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to MCQDeck</CardTitle>
          <CardDescription>
            Sign in to save your decks and sync across devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <Button 
            onClick={handleLogin} 
            className="w-full" 
            disabled={isLoading}
          >
            <Mail className="h-4 w-4 mr-2" />
            {isLoading ? 'Sending...' : 'Send magic link'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            We'll send you a secure link to sign in without a password
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginGate;
