import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, BookOpen, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EditItemDialog from "@/components/EditItemDialog";
import type { Database } from "@/integrations/supabase/types";

type Book = Database['public']['Tables']['books']['Row'];
type Item = Database['public']['Tables']['items']['Row'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Book | Item | null>(null);
  const [editType, setEditType] = useState<'book' | 'item'>('book');

  useEffect(() => {
    checkAuth();
    fetchUserProfile();
    fetchUserListings();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile, error } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      setUserProfile(profile);
      if (profile.user_type === "bookstore") {
        const { data: verification } = await supabase
          .from("bookstore_verifications").select("status").eq("user_id", user.id).single();
        setVerificationStatus(verification?.status || null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const fetchUserListings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [booksRes, itemsRes] = await Promise.all([
        supabase.from("books").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
        supabase.from("items").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (booksRes.error) throw booksRes.error;
      if (itemsRes.error) throw itemsRes.error;
      setBooks(booksRes.data || []);
      setItems(itemsRes.data || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBook = async (id: string) => {
    try {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Book deleted successfully" });
      fetchUserListings();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Item deleted successfully" });
      fetchUserListings();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const openEdit = (item: Book | Item, type: 'book' | 'item') => {
    setEditItem(item);
    setEditType(type);
    setEditOpen(true);
  };

  const isUploadDisabled = userProfile?.user_type === "bookstore" && !userProfile?.verified;

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
                    {verificationStatus === "pending" && "Your bookstore verification is under review."}
                    {verificationStatus === "rejected" && "Your verification request was rejected. Please contact support."}
                    {!verificationStatus && "Please submit verification documents to start selling books."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-heading font-bold text-foreground">My Items</h1>
          <Button
            onClick={() => navigate("/upload")}
            className="bg-primary hover:bg-primary-hover gap-2"
            disabled={isUploadDisabled}
          >
            <Plus className="h-4 w-4" />
            Upload Item
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your items...</p>
          </div>
        ) : (
          <Tabs defaultValue="books">
            <TabsList className="mb-6">
              <TabsTrigger value="books" className="gap-2">
                <BookOpen className="h-4 w-4" /> Books ({books.length})
              </TabsTrigger>
              <TabsTrigger value="items" className="gap-2">
                <Package className="h-4 w-4" /> Items ({items.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="books">
              {books.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">No books uploaded yet.</p>
                    <Button onClick={() => navigate("/upload")} className="bg-primary hover:bg-primary-hover">
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
                          <img src={book.image_url} alt={book.title} className="w-full h-48 object-cover rounded-lg mb-4" />
                        )}
                        <CardTitle className="font-heading">{book.title}</CardTitle>
                        <CardDescription>
                          {book.grade && `Grade: ${book.grade} • `}{book.category} • {book.condition}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/book/${book.id}`)} className="flex-1">
                            View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEdit(book, 'book')}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteBook(book.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="items">
              {items.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">No items uploaded yet.</p>
                    <Button onClick={() => navigate("/upload")} className="bg-primary hover:bg-primary-hover">
                      Upload Your First Item
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((item) => (
                    <Card key={item.id} className="shadow-card hover:shadow-soft transition-smooth">
                      <CardHeader>
                        {item.image_url && (
                          <img src={item.image_url} alt={item.name} className="w-full h-48 object-cover rounded-lg mb-4" />
                        )}
                        <CardTitle className="font-heading">{item.name}</CardTitle>
                        <CardDescription>
                          {item.category} • {item.condition} • {item.type}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/item/${item.id}`)} className="flex-1">
                            View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEdit(item, 'item')}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <EditItemDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        item={editItem}
        itemType={editType}
        onSaved={fetchUserListings}
      />
    </div>
  );
};

export default Dashboard;
