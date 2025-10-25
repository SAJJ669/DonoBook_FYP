import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Gift, RefreshCw, DollarSign } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Book = Database['public']['Tables']['books']['Row'];

const Home = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = books.filter((book) =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "donate":
        return <Gift className="h-4 w-4" />;
      case "exchange":
        return <RefreshCw className="h-4 w-4" />;
      case "sell":
        return <DollarSign className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "donate":
        return "bg-green-100 text-green-700 border-green-200";
      case "exchange":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "sell":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary-light/20 to-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-heading font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Share Books, Build Knowledge
          </h1>
          <p className="text-xl text-muted-foreground">
            A community platform to donate, exchange, and sell educational books
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="Search for books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg shadow-card"
            />
          </div>

          <div className="flex gap-4 justify-center pt-4">
            <Button
              size="lg"
              onClick={() => navigate("/upload")}
              className="bg-primary hover:bg-primary-hover shadow-soft"
            >
              Upload a Book
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/assistant")}
              className="shadow-soft"
            >
              Get Help from AI
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="shadow-card hover:shadow-soft transition-smooth">
            <CardHeader className="text-center">
              <Gift className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle className="font-heading">Donate</CardTitle>
              <CardDescription>Share books with students who need them</CardDescription>
            </CardHeader>
          </Card>
          <Card className="shadow-card hover:shadow-soft transition-smooth">
            <CardHeader className="text-center">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 text-secondary" />
              <CardTitle className="font-heading">Exchange</CardTitle>
              <CardDescription>Swap books with other students</CardDescription>
            </CardHeader>
          </Card>
          <Card className="shadow-card hover:shadow-soft transition-smooth">
            <CardHeader className="text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-accent" />
              <CardTitle className="font-heading">Sell</CardTitle>
              <CardDescription>List books for sale at affordable prices</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Books Section */}
      <section className="container mx-auto px-4 pb-16">
        <h2 className="text-3xl font-heading font-bold mb-8 text-center">
          Available Books
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading books...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "No books found matching your search."
                  : "No books available yet. Be the first to share!"}
              </p>
              <Button
                onClick={() => navigate("/upload")}
                className="bg-primary hover:bg-primary-hover"
              >
                Upload a Book
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <Card
                key={book.id}
                className="shadow-card hover:shadow-soft transition-smooth cursor-pointer group"
                onClick={() => navigate(`/book/${book.id}`)}
              >
                <CardHeader className="p-0">
                  {book.image_url ? (
                    <img
                      src={book.image_url}
                      alt={book.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-primary rounded-t-lg flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-white" />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="font-heading text-lg mb-2 group-hover:text-primary transition-smooth">
                    {book.title}
                  </CardTitle>
                  <div className="space-y-2">
                    {book.grade && (
                      <p className="text-sm text-muted-foreground">Grade: {book.grade}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className={getTypeColor(book.type)}>
                        {getTypeIcon(book.type)}
                        <span className="ml-1 capitalize">{book.type}</span>
                      </Badge>
                      <Badge variant="outline">
                        {book.condition === "new" ? "New" : "Used"}
                      </Badge>
                    </div>
                    {book.type === "sell" && book.price && (
                      <p className="text-lg font-semibold text-primary">
                        ${Number(book.price).toFixed(2)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
