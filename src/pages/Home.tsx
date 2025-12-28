import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, Gift, RefreshCw, Package, Lamp, PencilRuler, ShoppingBag } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Book = Database['public']['Tables']['books']['Row'];
type Item = Database['public']['Tables']['items']['Row'];

type ListingItem = {
  id: string;
  name: string;
  type: string;
  condition: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  itemType: 'book' | 'item';
  grade?: string | null;
  category: string;
};

const Home = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const [booksResult, itemsResult] = await Promise.all([
        supabase
          .from("books")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("items")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(12)
      ]);

      if (booksResult.error) throw booksResult.error;
      if (itemsResult.error) throw itemsResult.error;

      setBooks(booksResult.data || []);
      setItems(itemsResult.data || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCombinedListings = (): ListingItem[] => {
    const bookListings: ListingItem[] = books.map(book => ({
      id: book.id,
      name: book.title,
      type: book.type,
      condition: book.condition,
      description: book.description,
      image_url: book.image_url,
      created_at: book.created_at,
      itemType: 'book',
      grade: book.grade,
      category: book.category,
    }));

    const itemListings: ListingItem[] = items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      condition: item.condition,
      description: item.description,
      image_url: item.image_url,
      created_at: item.created_at,
      itemType: 'item',
      category: item.category,
    }));

    return [...bookListings, ...itemListings].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const getFilteredListings = () => {
    let listings = getCombinedListings();

    // Filter by type
    if (filterType === "books") {
      listings = listings.filter(item => item.itemType === 'book');
    } else if (filterType === "items") {
      listings = listings.filter(item => item.itemType === 'item');
    } else if (filterType !== "all") {
      listings = listings.filter(item => item.itemType === 'item' && item.category === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      listings = listings.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return listings;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "donate":
        return <Gift className="h-4 w-4" />;
      case "exchange":
        return <RefreshCw className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "donate":
        return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
      case "exchange":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
      default:
        return "";
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      bag: "Bag",
      water_bottle: "Water Bottle",
      pencil_box: "Pencil Box",
      lunchbox: "Lunchbox",
      stationery: "Stationery",
      other: "Other",
      textbook: "Textbook",
      reading_book: "Reading Book",
    };
    return labels[category] || category;
  };

  const handleItemClick = (item: ListingItem) => {
    if (item.itemType === 'book') {
      navigate(`/book/${item.id}`);
    } else {
      navigate(`/item/${item.id}`);
    }
  };

  const filteredListings = getFilteredListings();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary-light/20 to-background">
      <Navbar />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-heading font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Share & Exchange
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Beyond just books—our platform is a complete ecosystem for school essentials.
            Whether it's a sturdy backpack, a complete stationary set, or a much-needed textbook,
            we connect students to ensure no resource goes to waste.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="Search for books or items..."
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
              Upload an Item
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

      <div className="container mx-auto py-20 px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-heading font-bold mb-4">Categories at a Glance</h2>
          <div className="h-1 w-20 bg-primary mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Academic Gear */}
          <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
            <CardHeader className="text-center">
              <BookOpen className="h-10 w-10 mx-auto mb-4 text-primary" />
              <CardTitle>Academic Gear</CardTitle>
              <CardDescription>Textbooks, reference guides, and specialized lab manuals.</CardDescription>
            </CardHeader>
          </Card>

          {/* Daily Essentials */}
          <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
            <CardHeader className="text-center">
              <ShoppingBag className="h-10 w-10 mx-auto mb-4 text-secondary" />
              <CardTitle>Daily Essentials</CardTitle>
              <CardDescription>Ergonomic school bags, lunch boxes, and water bottles.</CardDescription>
            </CardHeader>
          </Card>

          {/* Writing & Tools */}
          <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
            <CardHeader className="text-center">
              <PencilRuler className="h-10 w-10 mx-auto mb-4 text-primary" />
              <CardTitle>Writing & Tools</CardTitle>
              <CardDescription>Pencil boxes, geometry sets, calculators, and art supplies.</CardDescription>
            </CardHeader>
          </Card>

          {/* Study Space */}
          <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
            <CardHeader className="text-center">
              <Lamp className="h-10 w-10 mx-auto mb-4 text-secondary" />
              <CardTitle>Study Space</CardTitle>
              <CardDescription>Desk organizers, lamps, and unused notebooks.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      <section className="bg-primary/5 py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Text Content */}
            <div className="md:w-1/2 space-y-6">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary">
                Give Every Supply a Second Life
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed italic">
                "Every semester, millions of stationary items and school bags are discarded
                while still in perfect condition. Our platform bridges the gap between students
                who have finished their journey and those just beginning."
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                From high-quality lunch boxes to professional-grade calculators, we help you
                find what you need and give away what you don't—all while protecting the
                planet and your wallet.
              </p>
            </div>

            {/* Decorative Visual Box */}
            <div className="md:w-1/2 bg-white p-8 rounded-2xl shadow-xl border-t-4 border-primary">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 border rounded-lg">
                  <span className="block text-2xl font-bold text-primary">Reduce</span>
                  <span className="text-xs text-muted-foreground uppercase">Waste</span>
                </div>
                <div className="p-4 border rounded-lg">
                  <span className="block text-2xl font-bold text-secondary">Reuse</span>
                  <span className="text-xs text-muted-foreground uppercase">Supplies</span>
                </div>
                <div className="p-4 border rounded-lg">
                  <span className="block text-2xl font-bold text-primary">Recycle</span>
                  <span className="text-xs text-muted-foreground uppercase">Resources</span>
                </div>
                <div className="p-4 border rounded-lg">
                  <span className="block text-2xl font-bold text-secondary">Reward</span>
                  <span className="text-xs text-muted-foreground uppercase">Community</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-heading font-bold mb-4">How to Participate</h2>
          <div className="h-1 w-20 bg-primary mx-auto rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="shadow-card hover:shadow-soft transition-smooth">
            <CardHeader className="text-center">
              <Gift className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle className="font-heading">Donate</CardTitle>
              <CardDescription>Share items with students who need them</CardDescription>
            </CardHeader>
          </Card>
          <Card className="shadow-card hover:shadow-soft transition-smooth">
            <CardHeader className="text-center">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 text-secondary" />
              <CardTitle className="font-heading">Exchange</CardTitle>
              <CardDescription>Swap items with other students</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Listings Section */}
      <section className="container mx-auto px-4 pb-16">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h2 className="text-3xl font-heading font-bold">
            Available Items
          </h2>

          {/* Filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="books">Books Only</SelectItem>
              <SelectItem value="items">Other Items Only</SelectItem>
              <SelectItem value="bag">Bags</SelectItem>
              <SelectItem value="water_bottle">Water Bottles</SelectItem>
              <SelectItem value="pencil_box">Pencil Boxes</SelectItem>
              <SelectItem value="lunchbox">Lunchboxes</SelectItem>
              <SelectItem value="stationery">Stationery</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading items...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "No items found matching your search."
                  : "No items available yet. Be the first to share!"}
              </p>
              <Button
                onClick={() => navigate("/upload")}
                className="bg-primary hover:bg-primary-hover"
              >
                Upload an Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map((item) => (
              <Card
                key={`${item.itemType}-${item.id}`}
                className="shadow-card hover:shadow-soft transition-smooth cursor-pointer group"
                onClick={() => handleItemClick(item)}
              >
                <CardHeader className="p-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-primary rounded-t-lg flex items-center justify-center">
                      {item.itemType === 'book' ? (
                        <BookOpen className="h-16 w-16 text-white" />
                      ) : (
                        <Package className="h-16 w-16 text-white" />
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="font-heading text-lg mb-2 group-hover:text-primary transition-smooth">
                    {item.name}
                  </CardTitle>
                  <div className="space-y-2">
                    {item.itemType === 'book' && item.grade && (
                      <p className="text-sm text-muted-foreground">Grade: {item.grade}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className={getTypeColor(item.type)}>
                        {getTypeIcon(item.type)}
                        <span className="ml-1 capitalize">{item.type}</span>
                      </Badge>
                      <Badge variant="outline">
                        {item.condition === "new" ? "New" : "Used"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {item.itemType === 'book' ? (
                          <><BookOpen className="h-3 w-3 mr-1" />{getCategoryLabel(item.category)}</>
                        ) : (
                          <><Package className="h-3 w-3 mr-1" />{getCategoryLabel(item.category)}</>
                        )}
                      </Badge>
                    </div>
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