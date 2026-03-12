import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Gift, RefreshCw, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type Book = Database['public']['Tables']['books']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

const BookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [book, setBook] = useState<Book | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookDetails();
    getCurrentUser();
  }, [id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchBookDetails = async () => {
    try {
      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select("*")
        .eq("id", id!)
        .single();

      if (bookError) throw bookError;
      setBook(bookData);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", bookData.owner_id)
        .single();

      if (profileError) throw profileError;
      setOwner(profileData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleContact = () => {
    if (!currentUserId) {
      navigate("/auth");
      return;
    }
    navigate(`/messages?userId=${book?.owner_id}`);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "donate":
        return <Gift className="h-5 w-5" />;
      case "exchange":
        return <RefreshCw className="h-5 w-5" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Loading book details...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return null;
  }

  const isOwner = currentUserId === book.owner_id;

  const getImages = () => {
    if (!book?.image_url) return ["/placeholder.svg"];

    // If it's already an array, we're good
    if (Array.isArray(book.image_url)) return book.image_url;

    // If it's a string, check if it's a stringified JSON array
    if (typeof book.image_url === 'string' && book.image_url.startsWith('[')) {
      try {
        return JSON.parse(book.image_url);
      } catch (e) {
        return [book.image_url];
      }
    }

    // Default: it's a single string URL
    return [book.image_url];
  };

  const images = getImages();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-card overflow-hidden">
            <CardContent className="p-6">
              <Carousel className="w-full max-w-xl mx-auto">
                <CarouselContent>
                  {images.map((url, index) => (
                    <CarouselItem key={index}>
                      <div className="p-1">
                        <img
                          src={url}
                          alt={`${book.title} - image ${index + 1}`}
                          className={`w-full h-96 object-cover rounded-lg transition-all ${book.status !== "available" ? "grayscale opacity-60" : ""
                            }`}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {/* Only show arrows if there's more than one image */}
                {images.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>
                )}
              </Carousel>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex flex-col items-start">
                  <StatusBadge status={book.status} />
                  <CardTitle className="text-3xl font-heading mt-1">{book.title}</CardTitle>
                </div>
                <CardDescription>
                  Posted by {owner?.name}
                  {book.grade && ` • Grade ${book.grade}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-base py-2 px-4">
                    {getTypeIcon(book.type)}
                    <span className="ml-2 capitalize">{book.type}</span>
                  </Badge>
                  <Badge variant="outline" className="text-base py-2 px-4">
                    {book.condition === "new" ? "New" : "Used"}
                  </Badge>
                  <Badge variant="outline" className="text-base py-2 px-4">
                    {book.category === "textbook" ? "Textbook" : "Reading Book"}
                  </Badge>
                </div>


                {book.description && (
                  <div className="pt-4 border-t">
                    <h3 className="font-heading font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground">{book.description}</p>
                  </div>
                )}

                {!isOwner && (
                  <Button
                    onClick={handleContact}
                    // DISABLE BUTTON IF NOT AVAILABLE (Might change this logic in future)
                    disabled={book.status !== "available"}
                    className={`w-full gap-2 text-lg py-6 ${book.status === "available"
                      ? "bg-primary hover:bg-primary-hover"
                      : "bg-muted text-muted-foreground"
                      }`}
                  >
                    <MessageSquare className="h-5 w-5" />
                    {book.status === "available" ? "Contact Owner" : "Currently Unavailable"}
                  </Button>
                )}

                {isOwner && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      This is your listing. Go to your dashboard to edit or delete it.
                    </p>
                    <Button
                      onClick={() => navigate("/dashboard")}
                      variant="outline"
                      className="w-full mt-4"
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetails;
