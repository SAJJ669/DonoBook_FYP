import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import UploadItem from "./pages/UploadItem";
import BookDetails from "./pages/BookDetails";
import ItemDetails from "./pages/ItemDetails";
import Conversations from "./pages/Conversations";
import Messages from "./pages/Messages";
import Assistant from "./pages/Assistant";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import SearchMessages from "./pages/SearchMessages";

const queryClient = new QueryClient();

// 1. Create a dedicated component for your routes so it can safely use Router Hooks!
const AppRoutes = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Check for established sessions on initialization mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log("Active session verified on load.");
        // Only route forward if they are currently idling on auth pages
        if (window.location.pathname === '/auth' || window.location.pathname === '/') {
          navigate('/dashboard', { replace: true });
        }
      }
    });

    // 2. Global application authentication status observer
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Global Auth Status Event:", event);

      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
        // Safe parameter and hash cleanups
        if (window.location.hash || window.location.search) {
          window.history.replaceState(null, "", window.location.pathname);
        }

        console.log("Authentication validated. Transferring user to secure dashboard...");
        navigate('/dashboard', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/upload" element={<UploadItem />} />
      <Route path="/book/:slug" element={<BookDetails />} />
      <Route path="/item/:slug" element={<ItemDetails />} />
      <Route path="/conversations" element={<Conversations />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/search-messages" element={<SearchMessages />} />
      <Route path="/assistant" element={<Assistant />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// 2. Main App Wrapper providing contexts cleanly
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* AppRoutes lives INSIDE BrowserRouter now, resolving the useContext crash! */}
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;