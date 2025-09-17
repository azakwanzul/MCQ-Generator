import { useState } from 'react';
import { Settings as SettingsIcon, Download, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage';

const Settings = () => {
  const [isExporting, setIsExporting] = useState(false);

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
        
        if (!importData.decks || !Array.isArray(importData.decks)) {
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your MCQDeck preferences and data</p>
      </div>

      <div className="space-y-6">
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
              <p><strong>Storage:</strong> Local browser storage</p>
              <p><strong>Supported formats:</strong> Text files with pipe-separated questions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;