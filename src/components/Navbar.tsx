import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, User, LogOut, MessageSquare, Bot, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import type { User as SupabaseUser } from '@supabase/supabase-js';

const Navbar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);


  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
        subscribeToUnreadMessages(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
        subscribeToUnreadMessages(session.user.id);
      } else {
        setIsAdmin(false);
        setUnreadMessages(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const subscribeToUnreadMessages = (userId: string) => {
    // Fetch initial unread count
    fetchUnreadCount(userId);

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`user_messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_messages',
        },
        () => {
          // Refetch unread count on any message change
          fetchUnreadCount(userId);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const fetchUnreadCount = async (userId: string) => {
    const { count, error } = await supabase
      .from("user_messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("read", false);

    if (!error) {
      setUnreadMessages(count || 0);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      navigate("/");
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border shadow-soft">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-smooth">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-2xl font-heading font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              BookShare
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/dashboard")}
                  className="gap-2"
                >
                  <User className="h-4 w-4" />
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/conversations")}
                  className="gap-2 relative"
                >
                  <MessageSquare className="h-4 w-4" />
                  Messages
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadMessages}
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/search-messages")}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  Search
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/assistant")}
                  className="gap-2"
                >
                  <Bot className="h-4 w-4" />
                  Assistant
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/admin")}
                    className="gap-2 text-primary"
                  >
                    <User className="h-4 w-4" />
                    Admin Panel
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/auth")}
                >
                  Login
                </Button>
                <Button
                  onClick={() => navigate("/auth?mode=signup")}
                  className="bg-primary hover:bg-primary-hover"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
