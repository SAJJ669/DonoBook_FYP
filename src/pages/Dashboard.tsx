import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Book = Database['public']['Tables']['books']['Row'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchUserProfile();
    fetchUserBooks();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profile);

      // If bookstore, check verification status
      if (profile.user_type === "bookstore") {
        const { data: verification } = await supabase
          .from("bookstore_verifications")
          .select("status")
          .eq("user_id", user.id)
          .single();

        setVerificationStatus(verification?.status || null);
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    }
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchUserBooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bookId: string) => {
    try {
      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", bookId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Book deleted successfully",
      });
      fetchUserBooks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {userProfile?.user_type === "bookstore" && !userProfile?.verified && (
          <Card className="shadow-card mb-8 border-amber-500/50 bg-amber-50/50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="text-amber-600">
                  {verificationStatus === "pending" && "⏳"}
                  {verificationStatus === "rejected" && "❌"}
                  {!verificationStatus && "📋"}
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-semibold text-foreground mb-1">
                    {verificationStatus === "pending" && "Verification Pending"}
                    {verificationStatus === "rejected" && "Verification Rejected"}
                    {!verificationStatus && "Complete Your Verification"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {verificationStatus === "pending" && "Your bookstore verification is under review. You can browse but cannot upload books until approved."}
                    {verificationStatus === "rejected" && "Your verification request was rejected. Please contact support for more information."}
                    {!verificationStatus && "Please submit verification documents to start selling books."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-heading font-bold text-foreground">My Books</h1>
          <Button
            onClick={() => navigate("/upload")}
            className="bg-primary hover:bg-primary-hover gap-2"
            disabled={userProfile?.user_type === "bookstore" && !userProfile?.verified}
          >
            <Plus className="h-4 w-4" />
            Upload Book
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your books...</p>
          </div>
        ) : books.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">You haven't uploaded any books yet.</p>
              <Button
                onClick={() => navigate("/upload")}
                className="bg-primary hover:bg-primary-hover"
              >
                Upload Your First Book
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <Card key={book.id} className="shadow-card hover:shadow-soft transition-smooth">
                <CardHeader>
                  {book.image_url && (
                    <img
                      src={book.image_url}
                      alt={book.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <CardTitle className="font-heading">{book.title}</CardTitle>
                  <CardDescription>
                    {book.grade && `Grade: ${book.grade} • `}
                    {book.category} • {book.condition}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/book/${book.id}`)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(book.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
