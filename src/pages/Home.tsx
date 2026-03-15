import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Backpack, BookOpen, BookOpenText, Gift, RefreshCw, Package, GraduationCap, PencilRuler, ShoppingBag, Loader2, BadgeCheck, MapPin, X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";
import { UserReputation } from '@/components/UserReputation'

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
  owner?: {
    name: string;
    verified: boolean;
    received_reviews: { rating: number }[];
    address: string;
  };
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

// All filter pill definitions
const CATEGORY_FILTERS = [
  { value: "books",        label: "All Books",     icon: BookOpen },
  { value: "textbook",     label: "Textbooks",     icon: BookOpenText },
  { value: "reading_book", label: "Story Books",   icon: BookOpenText },
  { value: "items",        label: "All Items",     icon: Package },
  { value: "bag",          label: "Bags",          icon: Backpack },
  { value: "stationery",   label: "Stationery",    icon: PencilRuler },
  { value: "pencil_box",   label: "Pencil Boxes",  icon: PencilRuler },
  { value: "lunchbox",     label: "Lunchboxes",    icon: ShoppingBag },
  { value: "water_bottle", label: "Water Bottles", icon: Package },
];

const TYPE_FILTERS = [
  { value: "donate",   label: "Donate",   icon: Gift },
  { value: "exchange", label: "Exchange", icon: RefreshCw },
];

const Home = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreBooks, setHasMoreBooks] = useState(true);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [booksOffset, setBooksOffset] = useState(0);
  const [itemsOffset, setItemsOffset] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Multi-select filter state
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [locationQuery, setLocationQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchInitial(); }, []);

  const fetchInitial = async () => {
    try {
      const bookSelect = `*, owner:profiles!books_owner_id_fkey(name, verified, address, received_reviews:reviews!reviewee_id(rating))`;
      const itemSelect = `*, owner:profiles!items_owner_id_fkey(name, verified, address, received_reviews:reviews!reviewee_id(rating))`;

      const [booksResult, itemsResult] = await Promise.all([
        supabase.from("books").select(bookSelect).order("created_at", { ascending: false }).range(0, PAGE_SIZE - 1).eq('is_available', true),
        supabase.from("items").select(itemSelect).order("created_at", { ascending: false }).range(0, PAGE_SIZE - 1).eq('is_available', true),
      ]);

      if (booksResult.error) throw booksResult.error;
      if (itemsResult.error) throw itemsResult.error;

      const bData = booksResult.data || [];
      const iData = itemsResult.data || [];

      setBooks(bData as any);
      setItems(iData as any);
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
      const bookSelect = `*, owner:profiles!books_owner_id_fkey(name, verified, address, received_reviews:reviews!reviewee_id(rating))`;
      const itemSelect = `*, owner:profiles!items_owner_id_fkey(name, verified, address, received_reviews:reviews!reviewee_id(rating))`;

      let newBooks: any[] = [];
      let newItems: any[] = [];

      if (hasMoreBooks) {
        const { data } = await supabase.from("books").select(bookSelect).order("created_at", { ascending: false }).range(booksOffset, booksOffset + PAGE_SIZE - 1).eq('is_available', true);
        newBooks = data || [];
      }
      if (hasMoreItems) {
        const { data } = await supabase.from("items").select(itemSelect).order("created_at", { ascending: false }).range(itemsOffset, itemsOffset + PAGE_SIZE - 1).eq('is_available', true);
        newItems = data || [];
      }

      if (newBooks.length > 0) { setBooks(prev => [...prev, ...newBooks]); setBooksOffset(prev => prev + newBooks.length); }
      if (newBooks.length < PAGE_SIZE) setHasMoreBooks(false);
      if (newItems.length > 0) { setItems(prev => [...prev, ...newItems]); setItemsOffset(prev => prev + newItems.length); }
      if (newItems.length < PAGE_SIZE) setHasMoreItems(false);
    } catch (error) {
      console.error("Error loading more:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreBooks, hasMoreItems, booksOffset, itemsOffset]);

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

  const toggleCategory = (value: string) => {
    setActiveCategories(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleType = (value: string) => {
    setActiveTypes(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const clearAllFilters = () => {
    setActiveCategories([]);
    setActiveTypes([]);
    setLocationQuery("");
    setSearchQuery("");
  };

  const activeFilterCount = activeCategories.length + activeTypes.length + (locationQuery ? 1 : 0);

  const getCombinedListings = (): ListingItem[] => {
    const bookListings: ListingItem[] = books.map(book => ({
      id: book.id, name: book.title, type: book.type, condition: book.condition,
      description: book.description, image_url: book.image_url, created_at: book.created_at,
      itemType: 'book', grade: book.grade, category: book.category,
      owner: (book as any).owner
    }));
    const itemListings: ListingItem[] = items.map(item => ({
      id: item.id, name: item.name, type: item.type, condition: item.condition,
      description: item.description, image_url: item.image_url, created_at: item.created_at,
      itemType: 'item', category: item.category,
      owner: (item as any).owner
    }));
    return [...bookListings, ...itemListings].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const getFilteredListings = () => {
    let listings = getCombinedListings();

    // --- Category filter (multi-select, OR logic within group) ---
    if (activeCategories.length > 0) {
      listings = listings.filter(item => {
        return activeCategories.some(cat => {
          if (cat === "books") return item.itemType === 'book';
          if (cat === "items") return item.itemType === 'item';
          // specific book categories (textbook, reading_book)
          if (cat === "textbook" || cat === "reading_book") return item.itemType === 'book' && item.category === cat;
          // specific item categories
          return item.itemType === 'item' && item.category === cat;
        });
      });
    }

    // --- Type filter (donate / exchange) ---
    if (activeTypes.length > 0) {
      listings = listings.filter(item => activeTypes.includes(item.type));
    }

    // --- Location filter (searches owner address) ---
    if (locationQuery.trim()) {
      const loc = locationQuery.toLowerCase();
      listings = listings.filter(item =>
        item.owner?.address?.toLowerCase().includes(loc)
      );
    }

    // --- Search query ---
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      listings = listings.filter(item => item.name.toLowerCase().includes(q));
    }

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
  
  // for rendering the listings properly after removing filters
  const filterKey = [...activeCategories, ...activeTypes, locationQuery, searchQuery].join("|");


  const getThumbnail = (imageUrl: string | null) => {
    if (!imageUrl) return "/placeholder.svg";
    if (imageUrl.startsWith('[')) {
      try {
        const parsed = JSON.parse(imageUrl);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : "/placeholder.svg";
      } catch (e) { return imageUrl; }
    }
    return imageUrl;
  };

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
            <Button size="lg" onClick={() => navigate("/upload")} className="bg-primary hover:bg-primary-hover shadow-soft">Upload an Item</Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/assistant")} className="shadow-soft">Get Help from AI</Button>
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
            { icon: BookOpenText, title: "Academic Gear", desc: "Textbooks, reference guides, and story books.", color: "text-primary" },
            { icon: Backpack, title: "Daily Essentials", desc: "School bags, lunch boxes, and water bottles.", color: "text-secondary" },
            { icon: PencilRuler, title: "Writing & Tools", desc: "Pencil boxes, geometry sets, and calculators.", color: "text-primary" },
            { icon: ShoppingBag, title: "School Apparel", desc: "School uniforms, and other required clothing items.", color: "text-secondary" }
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

      {/* ── LISTINGS ── */}
      <section className="container mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-heading font-bold">Available Items</h2>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowFilters(v => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* ── FILTER PANEL ── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <Card className="mb-6 border-primary/20">
                <CardContent className="pt-5 pb-4 space-y-5">

                  {/* Location filter */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Location</p>
                    <div className="relative max-w-sm">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g. Karachi, Gulshan..."
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        className="pl-9 h-9 text-sm"
                      />
                      {locationQuery && (
                        <button onClick={() => setLocationQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category pills */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Category</p>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_FILTERS.map(({ value, label, icon: Icon }) => {
                        const active = activeCategories.includes(value);
                        return (
                          <button
                            key={value}
                            onClick={() => toggleCategory(value)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Type pills */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Listing type</p>
                    <div className="flex gap-2">
                      {TYPE_FILTERS.map(({ value, label, icon: Icon }) => {
                        const active = activeTypes.includes(value);
                        return (
                          <button
                            key={value}
                            onClick={() => toggleType(value)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                              active
                                ? value === "donate"
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "bg-violet-600 text-white border-violet-600"
                                : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clear all */}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                    >
                      <X className="h-3 w-3" /> Clear all filters
                    </button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter summary chips (always visible when filters are on) */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeCategories.map(cat => {
              const label = CATEGORY_FILTERS.find(f => f.value === cat)?.label || cat;
              return (
                <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
                  {label}
                  <button onClick={() => toggleCategory(cat)}><X className="h-3 w-3" /></button>
                </span>
              );
            })}
            {activeTypes.map(type => {
              const label = TYPE_FILTERS.find(f => f.value === type)?.label || type;
              return (
                <span key={type} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
                  {label}
                  <button onClick={() => toggleType(type)}><X className="h-3 w-3" /></button>
                </span>
              );
            })}
            {locationQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
                <MapPin className="h-3 w-3" />{locationQuery}
                <button onClick={() => setLocationQuery("")}><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          {filteredListings.length} {filteredListings.length === 1 ? "result" : "results"}
          {activeFilterCount > 0 || searchQuery ? " for current filters" : " available"}
        </p>

        {loading ? (
          <div className="text-center py-12"><p className="text-muted-foreground">Loading items...</p></div>
        ) : filteredListings.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {searchQuery || activeFilterCount > 0 ? "No items match your current filters." : "No items available yet. Be the first to share!"}
              </p>
              {activeFilterCount > 0 && (
                <Button variant="outline" onClick={clearAllFilters} className="mr-2">Clear Filters</Button>
              )}
              <Button onClick={() => navigate("/upload")} className="bg-primary hover:bg-primary-hover">Upload an Item</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} key={filterKey}
            >
              {filteredListings.map((item) => (
                <motion.div key={`${item.itemType}-${item.id}`} variants={fadeUp} transition={{ duration: 0.4 }}>
                  <Card
                    className="shadow-card hover:shadow-soft transition-smooth cursor-pointer group"
                    onClick={() => handleItemClick(item)}
                  >
                    <CardHeader className="p-0">
                      <img
                        src={getThumbnail(item.image_url)}
                        alt={item.name}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
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
                            {item.itemType === 'book'
                              ? <><BookOpen className="h-3 w-3 mr-1" />{getCategoryLabel(item.category)}</>
                              : <><Package className="h-3 w-3 mr-1" />{getCategoryLabel(item.category)}</>}
                          </Badge>
                        </div>
                        <div className="pt-2 border-t flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Posted by</span>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium truncate max-w-[100px]">{item.owner?.name || 'User'}</span>
                              {item.owner?.verified && <BadgeCheck className="h-4 w-4 text-white bg-blue-600 rounded-full" />}
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-3 w-3 text-violet-500 mt-0.5" />
                              <p className="text-[12px] text-muted-foreground">{item.owner?.address}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">User Reputation</span>
                            <UserReputation reviews={item.owner?.received_reviews} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

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