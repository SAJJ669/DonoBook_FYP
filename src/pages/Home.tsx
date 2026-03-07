import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, Gift, RefreshCw, Package, Lamp, PencilRuler, ShoppingBag, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/StatusBadge";

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

const PAGE_SIZE = 12;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const Home = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreBooks, setHasMoreBooks] = useState(true);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [booksOffset, setBooksOffset] = useState(0);
  const [itemsOffset, setItemsOffset] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    try {
      const [booksResult, itemsResult] = await Promise.all([
        supabase.from("books").select("*").order("created_at", { ascending: false }).range(0, PAGE_SIZE - 1).eq('is_available', true),
        supabase.from("items").select("*").order("created_at", { ascending: false }).range(0, PAGE_SIZE - 1).eq('is_available', true),
      ]);
      if (booksResult.error) throw booksResult.error;
      if (itemsResult.error) throw itemsResult.error;
      const bData = booksResult.data || [];
      const iData = itemsResult.data || [];
      setBooks(bData);
      setItems(iData);
      setBooksOffset(bData.length);
      setItemsOffset(iData.length);
      setHasMoreBooks(bData.length === PAGE_SIZE);
      setHasMoreItems(iData.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || (!hasMoreBooks && !hasMoreItems)) return;
    setLoadingMore(true);
    try {
      const fetchMore = async () => {
        let newBooks: Book[] = [];
        let newItems: Item[] = [];
        if (hasMoreBooks) {
          const { data } = await supabase.from("books").select("*").order("created_at", { ascending: false }).range(booksOffset, booksOffset + PAGE_SIZE - 1);
          newBooks = data || [];
        }
        if (hasMoreItems) {
          const { data } = await supabase.from("items").select("*").order("created_at", { ascending: false }).range(itemsOffset, itemsOffset + PAGE_SIZE - 1);
          newItems = data || [];
        }
        return { newBooks, newItems };
      };
      const { newBooks, newItems } = await fetchMore();
      if (newBooks.length > 0) {
        setBooks(prev => [...prev, ...newBooks]);
        setBooksOffset(prev => prev + newBooks.length);
      }
      if (newBooks.length < PAGE_SIZE) setHasMoreBooks(false);
      if (newItems.length > 0) {
        setItems(prev => [...prev, ...newItems]);
        setItemsOffset(prev => prev + newItems.length);
      }
      if (newItems.length < PAGE_SIZE) setHasMoreItems(false);
    } catch (error) {
      console.error("Error loading more:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreBooks, hasMoreItems, booksOffset, itemsOffset]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const getCombinedListings = (): ListingItem[] => {
    const bookListings: ListingItem[] = books.map(book => ({
      id: book.id, name: book.title, type: book.type, condition: book.condition,
      description: book.description, image_url: book.image_url, created_at: book.created_at,
      itemType: 'book', grade: book.grade, category: book.category, is_available: book.is_available, status: book.status
    }));
    const itemListings: ListingItem[] = items.map(item => ({
      id: item.id, name: item.name, type: item.type, condition: item.condition,
      description: item.description, image_url: item.image_url, created_at: item.created_at,
      itemType: 'item', category: item.category, is_available: item.is_available, status: item.status
    }));
    return [...bookListings, ...itemListings].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const getFilteredListings = () => {
    let listings = getCombinedListings();
    if (filterType === "books") listings = listings.filter(i => i.itemType === 'book');
    else if (filterType === "items") listings = listings.filter(i => i.itemType === 'item');
    else if (filterType !== "all") listings = listings.filter(i => i.itemType === 'item' && i.category === filterType);
    if (searchQuery) listings = listings.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return listings;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "donate": return <Gift className="h-4 w-4" />;
      case "exchange": return <RefreshCw className="h-4 w-4" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "donate": return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
      case "exchange": return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800";
      default: return "";
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      bag: "Bag", water_bottle: "Water Bottle", pencil_box: "Pencil Box",
      lunchbox: "Lunchbox", stationery: "Stationery", other: "Other",
      textbook: "Textbook", reading_book: "Reading Book",
    };
    return labels[category] || category;
  };

  const handleItemClick = (item: ListingItem) => {
    navigate(item.itemType === 'book' ? `/book/${item.id}` : `/item/${item.id}`);
  };

  const filteredListings = getFilteredListings();
  const hasMore = hasMoreBooks || hasMoreItems;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary-light/20 to-background">
      <Navbar />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <motion.div className="max-w-3xl mx-auto space-y-6" initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.h1 variants={fadeUp} transition={{ duration: 0.6 }} className="text-5xl md:text-6xl font-heading font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Share & Exchange
          </motion.h1>
          <motion.p variants={fadeUp} transition={{ duration: 0.6, delay: 0.1 }} className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Beyond just books—our platform is a complete ecosystem for school essentials.
            Whether it's a sturdy backpack, a complete stationary set, or a much-needed textbook,
            we connect students to ensure no resource goes to waste.
          </motion.p>

          <motion.div variants={fadeUp} transition={{ duration: 0.5, delay: 0.2 }} className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text" placeholder="Search for books or items..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg shadow-card"
            />
          </motion.div>

          <motion.div variants={fadeUp} transition={{ duration: 0.5, delay: 0.3 }} className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/upload")} className="bg-primary hover:bg-primary-hover shadow-soft">
              Upload an Item
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/assistant")} className="shadow-soft">
              Get Help from AI
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Categories */}
      <div className="container mx-auto py-20 px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-heading font-bold mb-4">Categories at a Glance</h2>
          <div className="h-1 w-20 bg-primary mx-auto rounded-full" />
        </div>
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
          {[
            { icon: BookOpen, title: "Academic Gear", desc: "Textbooks, reference guides, and specialized lab manuals.", color: "text-primary" },
            { icon: ShoppingBag, title: "Daily Essentials", desc: "Ergonomic school bags, lunch boxes, and water bottles.", color: "text-secondary" },
            { icon: PencilRuler, title: "Writing & Tools", desc: "Pencil boxes, geometry sets, calculators, and art supplies.", color: "text-primary" },
            { icon: Lamp, title: "Study Space", desc: "Desk organizers, lamps, and unused notebooks.", color: "text-secondary" },
          ].map((cat) => (
            <motion.div key={cat.title} variants={fadeUp} transition={{ duration: 0.5 }}>
              <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
                <CardHeader className="text-center">
                  <cat.icon className={`h-10 w-10 mx-auto mb-4 ${cat.color}`} />
                  <CardTitle>{cat.title}</CardTitle>
                  <CardDescription>{cat.desc}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Mission Section */}
      <section className="bg-primary/5 py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2 space-y-6">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary">Give Every Supply a Second Life</h2>
              <p className="text-lg text-muted-foreground leading-relaxed italic">
                "Every semester, millions of stationary items and school bags are discarded while still in perfect condition."
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                From high-quality lunch boxes to professional-grade calculators, we help you find what you need and give away what you don't.
              </p>
            </div>
            <div className="md:w-1/2 bg-card p-8 rounded-2xl shadow-xl border-t-4 border-primary">
              <div className="grid grid-cols-2 gap-4 text-center">
                {[
                  { word: "Reduce", sub: "Waste", color: "text-primary" },
                  { word: "Reuse", sub: "Supplies", color: "text-secondary" },
                  { word: "Recycle", sub: "Resources", color: "text-primary" },
                  { word: "Reward", sub: "Community", color: "text-secondary" },
                ].map((r) => (
                  <div key={r.word} className="p-4 border rounded-lg">
                    <span className={`block text-2xl font-bold ${r.color}`}>{r.word}</span>
                    <span className="text-xs text-muted-foreground uppercase">{r.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Participate */}
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

      {/* Listings */}
      <section className="container mx-auto px-4 pb-16">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h2 className="text-3xl font-heading font-bold">Available Items</h2>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by type" /></SelectTrigger>
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
          <div className="text-center py-12"><p className="text-muted-foreground">Loading items...</p></div>
        ) : filteredListings.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "No items found matching your search." : "No items available yet. Be the first to share!"}
              </p>
              <Button onClick={() => navigate("/upload")} className="bg-primary hover:bg-primary-hover">Upload an Item</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
            >
              {filteredListings.map((item) => (
                <motion.div key={`${item.itemType}-${item.id}`} variants={fadeUp} transition={{ duration: 0.4 }}>
                  <Card
                    className="shadow-card hover:shadow-soft transition-smooth cursor-pointer group"
                    onClick={() => handleItemClick(item)}
                  >
                    <CardHeader className="p-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-48 object-cover rounded-t-lg" />
                      ) : (
                        <img
                          src="/placeholder.svg"
                          alt="placeholder"
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                      )}
                    </CardHeader>
                    <CardContent className="p-4">
                      <CardTitle className="font-heading text-lg mb-2 group-hover:text-primary transition-smooth">{item.name}</CardTitle>
                      <div className="space-y-2">
                        {item.itemType === 'book' && item.grade && <p className="text-sm text-muted-foreground">Grade: {item.grade}</p>}
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className={getTypeColor(item.type)}>
                            {getTypeIcon(item.type)}<span className="ml-1 capitalize">{item.type}</span>
                          </Badge>
                          <Badge variant="outline">{item.condition === "new" ? "New" : "Used"}</Badge>
                          <Badge variant="secondary" className="text-xs">
                            {item.itemType === 'book' ? <><BookOpen className="h-3 w-3 mr-1" />{getCategoryLabel(item.category)}</> : <><Package className="h-3 w-3 mr-1" />{getCategoryLabel(item.category)}</>}
                          </Badge>
                          <StatusBadge status={item.status} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-8 text-center">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading more...</span>
                </div>
              )}
              {!hasMore && filteredListings.length > 0 && (
                <p className="text-muted-foreground text-sm">You've reached the end</p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default Home;
