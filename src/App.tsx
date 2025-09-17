import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from 'react';
import { storage } from '@/lib/storage';
import { AuthProvider, useAuth } from '@/lib/AuthProvider';
import LoginGate from './components/LoginGate';
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import CreateDeck from "./pages/CreateDeck";
import EditDeck from "./pages/EditDeck";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";
import StudyMode from "./pages/StudyMode";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    // one-time background sync from Supabase into local storage
    storage.syncFromRemote?.();
  }, []);

  if (!user) {
    return <LoginGate />;
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/study/:deckId" element={<StudyMode />} />
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/create" element={<CreateDeck />} />
              <Route path="/edit/:deckId" element={<EditDeck />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
