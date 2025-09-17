import { useState } from 'react';
import { Settings as SettingsIcon, Download, Upload, Trash2, RefreshCw, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthProvider';

const Settings = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [email, setEmail] = useState('');
  const { user, signInWithEmail, signOut } = useAuth();

  const handleExportData = () => {
    setIsExporting(true);
    
    try {
      const decks = storage.getDecks();
      const progress = storage.getAllProgress();
      
      const exportData = {
        decks,
        progress,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mcqdeck-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Data exported successfully',
        description: 'Your decks and progress have been saved to a file',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export your data',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        
        if (!importData.decks || Array.isArray(importData.decks) === false) {
          throw new Error('Invalid backup file format');
        }

        // Import decks
        importData.decks.forEach((deck: any) => {
          storage.saveDeck({
            ...deck,
            createdAt: new Date(deck.createdAt),
            lastStudied: deck.lastStudied ? new Date(deck.lastStudied) : undefined,
          });
        });

        // Import progress if available
        if (importData.progress && Array.isArray(importData.progress)) {
          importData.progress.forEach((progress: any) => {
            storage.saveProgress(progress);
          });
        }

        toast({
          title: 'Data imported successfully',
          description: `Imported ${importData.decks.length} decks`,
        });
      } catch (error) {
        toast({
          title: 'Import failed',
          description: 'Failed to import data. Please check the file format.',
          variant: 'destructive',
        });
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to delete all your decks and progress? This action cannot be undone.')) {
      localStorage.clear();
      toast({
        title: 'All data cleared',
        description: 'Your decks and progress have been deleted',
      });
    }
  };

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      await storage.syncFromRemote?.();
      toast({ title: 'Synced', description: 'Data refreshed from cloud' });
    } catch {
      toast({ title: 'Sync failed', description: 'Please try again', variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async () => {
    if (!email) return toast({ title: 'Enter email', description: 'Please enter your email' });
    const { error } = await signInWithEmail(email);
    if (error) {
      toast({ title: 'Login failed', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'Magic link sent' });
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: 'Signed out' });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your MCQDeck preferences and data</p>
      </div>

      <div className="space-y-6">
        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Account & Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Signed in</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSyncNow} variant="outline" disabled={isSyncing}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {isSyncing ? 'Syncing...' : 'Sync now'}
                  </Button>
                  <Button onClick={handleLogout} variant="outline">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 border rounded-lg gap-4">
                <div className="flex-1">
                  <h3 className="font-medium">Sign in</h3>
                  <p className="text-sm text-muted-foreground">Use your email to get a magic link</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Button onClick={handleLogin} variant="outline">
                    <LogIn className="h-4 w-4 mr-2" />
                    Send link
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Export Data</h3>
                <p className="text-sm text-muted-foreground">
                  Download a backup of all your decks and progress
                </p>
              </div>
              <Button 
                onClick={handleExportData}
                disabled={isExporting}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Import Data</h3>
                <p className="text-sm text-muted-foreground">
                  Restore your decks and progress from a backup file
                </p>
              </div>
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                  id="import-file"
                />
                <Button variant="outline" asChild>
                  <label htmlFor="import-file" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </label>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/20">
              <div>
                <h3 className="font-medium text-destructive">Clear All Data</h3>
                <p className="text-sm text-muted-foreground">
                  Permanently delete all your decks and progress
                </p>
              </div>
              <Button 
                onClick={handleClearAllData}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle>About MCQDeck</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Version:</strong> 1.0.0</p>
              <p><strong>Storage:</strong> Supabase (cloud) with local backup</p>
              <p><strong>Supported formats:</strong> Text files with pipe-separated questions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;