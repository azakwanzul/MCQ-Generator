import { useEffect, useState } from 'react';
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
  const { user, session, signOut } = useAuth();
  const [dailyGoal, setDailyGoal] = useState<number>(storage.getDailyGoal());
  const [dueToday, setDueToday] = useState<number>(0);

  useEffect(() => {
    const decks = storage.getDecks();
    const allProgress = storage.getAllProgress();
    const now = new Date();
    let count = 0;
    for (const deck of decks) {
      const p = allProgress.find(ap => ap.deckId === deck.id);
      if (!p?.srsByQuestionId) continue;
      for (const q of deck.questions) {
        const s = p.srsByQuestionId[q.id];
        if (s && new Date(s.dueAt) <= now) count++;
      }
    }
    setDueToday(count);
  }, []);

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

  const saveDailyGoal = () => {
    storage.setDailyGoal(dailyGoal);
    toast({ title: 'Daily goal saved', description: `${dailyGoal} reviews/day` });
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
            ) : null}
          </CardContent>
        </Card>

        {/* Spaced Repetition Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Spaced Repetition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Daily goal</h3>
                <p className="text-sm text-muted-foreground">Target reviews per day</p>
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" min={1} value={dailyGoal} onChange={(e) => setDailyGoal(parseInt(e.target.value || '0', 10))} className="w-24" />
                <Button variant="outline" onClick={saveDailyGoal}>Save</Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Due today</h3>
                <p className="text-sm text-muted-foreground">Cards ready to review now</p>
              </div>
              <div className="text-xl font-semibold">{dueToday}</div>
            </div>
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

        {/* Debug Info */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>User:</strong> {user ? user.email : 'Not signed in'}</p>
              <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
              <p><strong>Session:</strong> {session ? 'Active' : 'None'}</p>
              <p><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL ? 'Configured' : 'Missing'}</p>
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