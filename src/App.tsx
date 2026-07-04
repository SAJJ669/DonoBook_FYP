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
// import EditProfile from "./pages/EditProfile"; deleted??? TODO.

const queryClient = new QueryClient();
const navigate = useNavigate();

useEffect(() => {
  // 1. Listen globally for state changes across the entire application runtime
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log("Global Auth Event Triggered:", event);

    if (event === 'SIGNED_IN' && session) {
      // Clean up messy URL hash fragments safely from the window location bar
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }

      // Force navigate straight to dashboard globally
      navigate('/dashboard');
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}, [navigate]);
const App = () => (

  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
