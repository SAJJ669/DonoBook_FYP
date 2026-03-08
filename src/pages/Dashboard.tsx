import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, BookOpen, Package, RefreshCw, Gift, Badge } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EditItemDialog from "@/components/EditItemDialog";
import type { Database } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/StatusBadge";
import { ReviewModal } from "@/components/ReviewModal";

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

  // To track items/books sent by owners
  const [givenAway, setGivenAway] = useState<any[]>([]);
  const [receivedItems, setReceivedItems] = useState<any[]>([]);

  // State to control visibility
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // State to keep track of WHICH book/item is being reviewed
  const [selectedItemForReview, setSelectedItemForReview] = useState<any>(null);

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
      const [booksRes, itemsRes, givenBooksRes, givenItemsRes, receivedBooksRes, receivedItemsRes] = await Promise.all([
        // 1. Currently Owned & Available/Pending
        supabase.from("books").select("*").eq("owner_id", user.id).neq("status", "claimed"),
        supabase.from("items").select("*").eq("owner_id", user.id).neq("status", "claimed"),

        // 2. Given Away (Owned by me, but status is claimed)

        /* The profiles!receiver_id(name) syntax tells Supabase: "Look at the receiver_id column, 
         find that person in the profiles table, and just give me their name." */
        supabase.from("books").select(`*, receiver:profiles!books_receiver_id_fkey(name)`).eq("owner_id", user.id).eq("status", "claimed"),
        supabase.from("items").select(`*, receiver:profiles!items_receiver_id_fkey(name)`).eq("owner_id", user.id).eq("status", "claimed"),

        // 3. Received (Owned by others, but receiver_id is me)
        supabase.from("books").select(`*, owner:profiles!books_owner_id_fkey(name), reviews(id)`).eq("receiver_id", user.id),
        supabase.from("items").select(`*, owner:profiles!items_owner_id_fkey(name), reviews(id)`).eq("receiver_id", user.id)
      ]);

      if (booksRes.error) throw booksRes.error;
      if (itemsRes.error) throw itemsRes.error;
      setBooks(booksRes.data || []);
      setItems(itemsRes.data || []);

      setGivenAway([
        ...(givenBooksRes.data || []),
        ...(givenItemsRes.data || [])
      ]);

      setReceivedItems([
        ...(receivedBooksRes.data || []),
        ...(receivedItemsRes.data || [])
      ]);

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

  const handleConfirmHandover = async (item: any, table: 'books' | 'items') => {
    const { error } = await supabase
      .from(table)
      .update({ handover_confirmed: true })
      .eq('id', item.id);

    if (error) throw error;

    toast({
      title: "Handover Confirmed!",
      description: "Thanks for confirming. Please leave a review for the owner!"
    });

    // THIS TRIGGERS THE MODAL
    setSelectedItemForReview(item);
    setIsReviewModalOpen(true);

    // Refresh the list so the "Confirm" button turns into "Leave Review"
    await fetchUserListings();
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
          <h1 className="text-4xl font-heading font-bold text-foreground">My Inventory</h1>
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
            <p className="text-muted-foreground">Loading your inventory...</p>
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
              <TabsTrigger value="history" className="gap-2">
                <RefreshCw className="h-4 w-4" /> History ({givenAway.length + receivedItems.length})
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
                        <img src={book.image_url || "/placeholder.svg"} alt={book.title} className={`w-full h-48 object-cover rounded-lg transition-all ${book.status !== "available" ? "grayscale opacity-60" : ""}`} />
                        <CardTitle className="font-heading">{book.title}</CardTitle>
                        <CardDescription>
                          {book.grade && `Grade: ${book.grade} • `}{book.category} • {book.condition}
                        </CardDescription>
                        <div className="mt-2">
                          <StatusBadge status={book.status} />
                        </div>
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
                        <img src={item.image_url || "/placeholder.svg"} alt={item.name} className={`w-full h-48 object-cover rounded-lg transition-all ${item.status !== "available" ? "grayscale opacity-60" : ""}`} />
                        <CardTitle className="font-heading">{item.name}</CardTitle>
                        <CardDescription>
                          {item.category} • {item.condition} • {item.type} • <StatusBadge status={item.status} />
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
            <TabsContent value="history">
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" /> Given Away
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {givenAway.map((item) => (
                      <Card key={item.id} className="opacity-80 grayscale-[0.3]">
                        <CardHeader className="p-4">
                          <img src={item.image_url} className="h-32 w-full object-cover rounded-md mb-2" />
                          <CardTitle className="text-sm">{item.title || item.name}</CardTitle>
                          <StatusBadge status="claimed" />
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
                            🎁 Given to: <span className="text-foreground">{item.receiver?.name || "Unknown"}</span>
                          </p>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" /> Received
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {receivedItems.map((item) => {
                      // Check if a review already exists for this specific item
                      const alreadyReviewed = item.reviews && item.reviews.length > 0;
                      return (
                        <Card key={item.id} className="border-green-200 bg-green-50/30">
                          <CardHeader className="p-4">
                            <img src={item.image_url} className="h-32 w-full object-cover rounded-md mb-2" />
                            <CardTitle className="text-sm">{item.title || item.name}</CardTitle>
                            <Badge variant="outline" className="bg-green-100 text-green-700">Received</Badge>
                            <div className="mt-4 space-y-2">
                              {!item.handover_confirmed ? (
                                <Button
                                  size="sm"
                                  className="w-full bg-green-600 hover:bg-green-700"
                                  onClick={() => handleConfirmHandover(item, item.title ? 'books' : 'items')}
                                >
                                  Confirm I Received This
                                </Button>
                              ) : !alreadyReviewed ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full border-primary text-primary hover:bg-primary/10"
                                  onClick={() => {
                                    setSelectedItemForReview(item); // Ensure this is set
                                    setIsReviewModalOpen(true);   // Then open
                                  }}
                                >
                                  Leave a Review
                                </Button>
                              ) : (
                                <div className="text-center py-2 px-3 bg-green-100 rounded-md text-green-700 text-xs font-medium flex items-center justify-center gap-1">
                                  Review Submitted
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
                            📩 Received from: <span className="text-foreground">{item.owner?.name || "Unknown"}</span>
                          </p>
                        </Card>
                      )
                    })}
                  </div>
                </section>
              </div>
            </TabsContent>
          </Tabs>
        )}
        {/* THE MODAL COMPONENT */}
        {selectedItemForReview && (
          <ReviewModal
            open={isReviewModalOpen}
            onOpenChange={setIsReviewModalOpen}
            targetItem={selectedItemForReview}
            currentUserId={userProfile?.id}
            onSuccess={fetchUserListings} // Refresh UI after review is saved
          />
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
