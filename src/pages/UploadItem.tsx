import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, BookOpen, Package } from "lucide-react";

type UploadType = "book" | "item";

const UploadItem = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<UploadType>("book");

  // Book-specific form data
  const [bookFormData, setBookFormData] = useState({
    title: "",
    grade: "",
    category: "",
    type: "",
    condition: "",
    description: "",
  });

  // Item-specific form data
  const [itemFormData, setItemFormData] = useState({
    name: "",
    category: "",
    type: "",
    condition: "",
    description: "",
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const uploadImage = async (userId: string, bucket: string) => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, imageFile);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (uploadType === "book") {
        const imageUrl = await uploadImage(user.id, 'book-images');

        const { error } = await supabase.from("books").insert([
          {
            title: bookFormData.title,
            grade: bookFormData.grade || null,
            category: bookFormData.category as "textbook" | "reading_book",
            type: bookFormData.type as "donate" | "exchange",
            condition: bookFormData.condition as "new" | "used",
            description: bookFormData.description || null,
            owner_id: user.id,
            image_url: imageUrl,
          },
        ]);

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Book uploaded successfully",
        });
      } else {
        const imageUrl = await uploadImage(user.id, 'item-images');

        const { error } = await supabase.from("items").insert([
          {
            name: itemFormData.name,
            category: itemFormData.category as "bag" | "water_bottle" | "pencil_box" | "lunchbox" | "stationery" | "other",
            type: itemFormData.type as "donate" | "exchange",
            condition: itemFormData.condition as "new" | "used",
            description: itemFormData.description || null,
            owner_id: user.id,
            image_url: imageUrl,
          },
        ]);

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Item uploaded successfully",
        });
      }

      navigate("/dashboard");
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

  const resetForms = () => {
    setBookFormData({
      title: "",
      grade: "",
      category: "",
      type: "",
      condition: "",
      description: "",
    });
    setItemFormData({
      name: "",
      category: "",
      type: "",
      condition: "",
      description: "",
    });
    setImageFile(null);
  };

  const handleTypeChange = (type: UploadType) => {
    setUploadType(type);
    resetForms();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto shadow-card">
          <CardHeader>
            <CardTitle className="text-3xl font-heading">Upload an Item</CardTitle>
            <CardDescription>Share books or other items with the community</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Upload Type Selection */}
              <div className="space-y-2">
                <Label>What would you like to upload? *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={uploadType === "book" ? "default" : "outline"}
                    className={`h-20 flex flex-col gap-2 ${uploadType === "book" ? "bg-primary" : ""}`}
                    onClick={() => handleTypeChange("book")}
                  >
                    <BookOpen className="h-6 w-6" />
                    <span>Book</span>
                  </Button>
                  <Button
                    type="button"
                    variant={uploadType === "item" ? "default" : "outline"}
                    className={`h-20 flex flex-col gap-2 ${uploadType === "item" ? "bg-primary" : ""}`}
                    onClick={() => handleTypeChange("item")}
                  >
                    <Package className="h-6 w-6" />
                    <span>Other Item</span>
                  </Button>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="image">{uploadType === "book" ? "Book" : "Item"} Image</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              {uploadType === "book" ? (
                <>
                  {/* Book Form */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Book Title *</Label>
                    <Input
                      id="title"
                      type="text"
                      value={bookFormData.title}
                      onChange={(e) => setBookFormData({ ...bookFormData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade/Class</Label>
                    <Input
                      id="grade"
                      type="text"
                      placeholder="e.g., Grade 10"
                      value={bookFormData.grade}
                      onChange={(e) => setBookFormData({ ...bookFormData, grade: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Book Category *</Label>
                      <Select
                        value={bookFormData.category}
                        onValueChange={(value) => setBookFormData({ ...bookFormData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="textbook">Textbook</SelectItem>
                          <SelectItem value="reading_book">Reading Book</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Transaction Type *</Label>
                      <Select
                        value={bookFormData.type}
                        onValueChange={(value) => setBookFormData({ ...bookFormData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="donate">Donate</SelectItem>
                          <SelectItem value="exchange">Exchange</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Condition *</Label>
                    <Select
                      value={bookFormData.condition}
                      onValueChange={(value) => setBookFormData({ ...bookFormData, condition: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bookDescription">Description</Label>
                    <Textarea
                      id="bookDescription"
                      value={bookFormData.description}
                      onChange={(e) => setBookFormData({ ...bookFormData, description: e.target.value })}
                      placeholder="Add any additional details about the book..."
                      rows={4}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Item Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Item Category *</Label>
                      <Select
                        value={itemFormData.category}
                        onValueChange={(value) => {
                          const categoryLabels: Record<string, string> = {
                            bag: "Bag",
                            water_bottle: "Water Bottle",
                            pencil_box: "Pencil Box",
                            lunchbox: "Lunchbox",
                            stationery: "Stationery",
                          };

                          setItemFormData({
                            ...itemFormData,
                            category: value,
                            name: value === "other" ? "" : categoryLabels[value],
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bag">Bag</SelectItem>
                          <SelectItem value="water_bottle">Water Bottle</SelectItem>
                          <SelectItem value="pencil_box">Pencil Box</SelectItem>
                          <SelectItem value="lunchbox">Lunchbox</SelectItem>
                          <SelectItem value="stationery">Stationery</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Item Name *</Label>
                      <Input
                        id="name"
                        type="text"
                        value={itemFormData.name}
                        onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                        disabled={itemFormData.category !== "other"}
                        required
                      />
                    </div>


                  </div>
                  <div className="space-y-2">
                    <Label>Transaction Type *</Label>
                    <Select
                      value={itemFormData.type}
                      onValueChange={(value) => setItemFormData({ ...itemFormData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="donate">Donate</SelectItem>
                        <SelectItem value="exchange">Exchange</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Condition *</Label>
                    <Select
                      value={itemFormData.condition}
                      onValueChange={(value) => setItemFormData({ ...itemFormData, condition: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemDescription">Description</Label>
                    <Textarea
                      id="itemDescription"
                      value={itemFormData.description}
                      onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                      placeholder="Add any additional details about the item..."
                      rows={4}
                    />
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover"
                disabled={loading}
              >
                {loading ? "Uploading..." : `Upload ${uploadType === "book" ? "Book" : "Item"}`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadItem;