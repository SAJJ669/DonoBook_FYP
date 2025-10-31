import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import Book3DView from "@/components/Book3DView";

const UploadBookAI = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");
  
  const [images, setImages] = useState<{
    front: File | null;
    back: File | null;
    binder: File | null;
    innerPages: File[];
  }>({
    front: null,
    back: null,
    binder: null,
    innerPages: [],
  });

  const [imageUrls, setImageUrls] = useState<{
    front?: string;
    back?: string;
    binder?: string;
    innerPages?: string[];
  }>({});

  const [extractedData, setExtractedData] = useState<any>(null);
  const [finalMetadata, setFinalMetadata] = useState<any>(null);
  const [formData, setFormData] = useState({
    type: "",
    condition: "",
    price: "",
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

  const handleImageChange = (type: 'front' | 'back' | 'binder' | 'innerPages', files: FileList | null) => {
    if (!files) return;
    
    if (type === 'innerPages') {
      setImages(prev => ({ ...prev, innerPages: Array.from(files) }));
    } else {
      setImages(prev => ({ ...prev, [type]: files[0] }));
    }
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${path}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('book-images')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const analyzeImages = async () => {
    setLoading(true);
    setProgress(10);
    setCurrentStep("Uploading images...");

    try {
      // Upload all images
      const uploadedUrls: any = {};
      
      if (images.front) {
        uploadedUrls.front = await uploadImage(images.front, 'front');
      }
      if (images.back) {
        uploadedUrls.back = await uploadImage(images.back, 'back');
      }
      if (images.binder) {
        uploadedUrls.binder = await uploadImage(images.binder, 'binder');
      }
      if (images.innerPages.length > 0) {
        uploadedUrls.innerPages = [];
        for (const page of images.innerPages) {
          const url = await uploadImage(page, 'page');
          uploadedUrls.innerPages.push(url);
        }
      }

      setImageUrls(uploadedUrls);
      setProgress(30);
      setCurrentStep("Extracting metadata from images...");

      // Call AI to analyze images
      const allImageUrls = [
        uploadedUrls.front,
        uploadedUrls.back,
        uploadedUrls.binder,
        ...(uploadedUrls.innerPages || [])
      ].filter(Boolean);

      const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke(
        'analyze-book-images',
        { body: { imageUrls: allImageUrls } }
      );

      if (analyzeError) throw analyzeError;
      if (!analyzeData.success) throw new Error(analyzeData.error);

      setExtractedData(analyzeData.data);
      setProgress(50);
      setCurrentStep("Looking up book in database...");

      // Lookup book metadata
      const { data: lookupData, error: lookupError } = await supabase.functions.invoke(
        'lookup-book-metadata',
        { body: { extractedData: analyzeData.data, isbn: analyzeData.data.isbn } }
      );

      if (lookupError) throw lookupError;
      
      setProgress(70);
      setCurrentStep("Fact-checking metadata...");

      // Fact-check the data
      const { data: factCheckData, error: factCheckError } = await supabase.functions.invoke(
        'fact-check-book',
        { body: { extractedData: analyzeData.data, lookupData: lookupData.data } }
      );

      if (factCheckError) throw factCheckError;
      if (!factCheckData.success) throw new Error(factCheckData.error);

      setFinalMetadata(factCheckData.data);
      setProgress(100);
      setCurrentStep("Analysis complete!");

      toast({
        title: "Success!",
        description: "Book metadata extracted and verified",
      });

    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setProgress(0);
      setCurrentStep("");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!finalMetadata) {
      toast({
        title: "Error",
        description: "Please analyze the book images first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert book with AI-enhanced metadata
      const { error } = await supabase.from("books").insert([
        {
          title: finalMetadata.verified_data?.title || extractedData.title,
          grade: extractedData.grade || null,
          category: extractedData.category || "textbook",
          type: formData.type as "donate" | "exchange" | "sell",
          condition: formData.condition as "new" | "used",
          description: finalMetadata.verified_data?.description || extractedData.description,
          price: formData.price ? parseFloat(formData.price) : null,
          owner_id: user.id,
          image_url: imageUrls.front || null,
          front_image_url: imageUrls.front,
          back_image_url: imageUrls.back,
          binder_image_url: imageUrls.binder,
          inner_pages: imageUrls.innerPages,
          dimensions: finalMetadata.verified_data?.dimensions,
          isbn: finalMetadata.verified_data?.isbn,
          ai_extracted_data: { extractedData, finalMetadata },
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Book uploaded with AI-enhanced metadata",
      });
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

  const hasRequiredImages = images.front && images.innerPages.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto shadow-card">
          <CardHeader>
            <CardTitle className="text-3xl font-heading">AI-Enhanced Book Upload</CardTitle>
            <CardDescription>Upload images and let AI extract all the metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Image Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="front">Front Cover *</Label>
                <Input
                  id="front"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange('front', e.target.files)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="back">Back Cover</Label>
                <Input
                  id="back"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange('back', e.target.files)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="binder">Binder/Spine</Label>
                <Input
                  id="binder"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange('binder', e.target.files)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pages">Inner Pages * (at least 1)</Label>
                <Input
                  id="pages"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageChange('innerPages', e.target.files)}
                />
                {images.innerPages.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {images.innerPages.length} page(s) selected
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={analyzeImages}
              disabled={!hasRequiredImages || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentStep}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Analyze Book Images
                </>
              )}
            </Button>

            {loading && <Progress value={progress} className="w-full" />}

            {/* Extracted Data Display */}
            {extractedData && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Extracted Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm overflow-auto max-h-40">
                    {JSON.stringify(extractedData, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Fact-Check Results */}
            {finalMetadata && (
              <>
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {finalMetadata.confidence_score >= 90 ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                      Verified Metadata (Confidence: {finalMetadata.confidence_score}%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm overflow-auto max-h-40">
                      {JSON.stringify(finalMetadata.verified_data, null, 2)}
                    </pre>
                    {finalMetadata.discrepancies && finalMetadata.discrepancies.length > 0 && (
                      <div className="mt-4">
                        <p className="font-semibold text-sm">Discrepancies Found:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {finalMetadata.discrepancies.map((d: string, i: number) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 3D Preview */}
                <div>
                  <Label className="text-lg mb-2 block">3D Book Preview</Label>
                  <Book3DView
                    frontImage={imageUrls.front}
                    backImage={imageUrls.back}
                    binderImage={imageUrls.binder}
                    innerPages={imageUrls.innerPages}
                    dimensions={finalMetadata.verified_data?.dimensions}
                  />
                </div>

                {/* Additional Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="donate">Donate</SelectItem>
                          <SelectItem value="exchange">Exchange</SelectItem>
                          <SelectItem value="sell">Sell</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Condition *</Label>
                      <Select
                        value={formData.condition}
                        onValueChange={(value) => setFormData({ ...formData, condition: value })}
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
                  </div>

                  {formData.type === "sell" && (
                    <div className="space-y-2">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !formData.type || !formData.condition}
                  >
                    {loading ? "Uploading..." : "Complete Upload"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadBookAI;