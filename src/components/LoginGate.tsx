import { useState } from 'react';
import { LogIn, Mail, KeyRound, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthProvider';
import { toast } from '@/hooks/use-toast';

const LoginGate = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithEmail, signInWithPassword, signUpWithPassword } = useAuth();

  const handleMagicLink = async () => {
    if (!email) {
      toast({ title: 'Enter email', description: 'Please enter your email address' });
      return;
    }
    setIsLoading(true);
    const { error } = await signInWithEmail(email);
    setIsLoading(false);
    if (error) {
      toast({ title: 'Send failed', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'We sent you a magic link to sign in' });
    }
  };

  const handlePasswordLogin = async () => {
    if (!email || !password) {
      toast({ title: 'Missing info', description: 'Enter email and password' });
      return;
    }
    setIsLoading(true);
    const { error } = await signInWithPassword(email, password);
    setIsLoading(false);
    if (error) {
      toast({ title: 'Login failed', description: error, variant: 'destructive' });
    }
  };

  const handlePasswordSignup = async () => {
    if (!email || !password) {
      toast({ title: 'Missing info', description: 'Enter email and password' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Weak password', description: 'Use at least 6 characters' });
      return;
    }
    setIsLoading(true);
    const { error } = await signUpWithPassword(email, password);
    setIsLoading(false);
    if (error) {
      toast({ title: 'Signup failed', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'Confirm your email to finish signup' });
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
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePasswordLogin} className="flex-1" disabled={isLoading}>
              <KeyRound className="h-4 w-4 mr-2" />
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
            <Button onClick={handlePasswordSignup} variant="outline" className="flex-1" disabled={isLoading}>
              <UserPlus className="h-4 w-4 mr-2" />
              Sign up
            </Button>
          </div>

          <div className="relative py-2 text-center text-xs text-muted-foreground">
            <span>or</span>
          </div>

          <Button onClick={handleMagicLink} variant="outline" className="w-full" disabled={isLoading}>
            <Mail className="h-4 w-4 mr-2" />
            {isLoading ? 'Sending...' : 'Send magic link'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginGate;
