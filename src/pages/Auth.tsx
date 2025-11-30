import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BookOpen } from "lucide-react";
import Navbar from "@/components/Navbar";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(searchParams.get("mode") === "signup");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    userType: "user" as "user" | "bookstore",
    shopName: "",
    shopAddress: "",
    contactNumber: "",
    businessId: "",
  });
  const [proofImage, setProofImage] = useState<File | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: formData.name,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // Create profile
          const { error: profileError } = await supabase
            .from("profiles")
            .insert([
              {
                id: data.user.id,
                name: formData.name,
                user_type: formData.userType,
                shop_name: formData.userType === "bookstore" ? formData.shopName : null,
                shop_address: formData.userType === "bookstore" ? formData.shopAddress : null,
                contact_number: formData.userType === "bookstore" ? formData.contactNumber : null,
                business_id: formData.userType === "bookstore" ? formData.businessId : null,
              },
            ]);

          if (profileError) throw profileError;

          // If bookstore, create verification request
          if (formData.userType === "bookstore") {
            let proofImageUrl = null;

            // Upload proof image if provided
            if (proofImage) {
              const fileExt = proofImage.name.split('.').pop();
              const fileName = `${data.user.id}/${Date.now()}.${fileExt}`;

              const { error: uploadError } = await supabase.storage
                .from('verification-proofs')
                .upload(fileName, proofImage);

              if (uploadError) throw uploadError;

              const { data: { publicUrl } } = supabase.storage
                .from('verification-proofs')
                .getPublicUrl(fileName);

              proofImageUrl = publicUrl;
            }

            const { error: verificationError } = await supabase
              .from("bookstore_verifications")
              .insert([
                {
                  user_id: data.user.id,
                  shop_name: formData.shopName,
                  shop_address: formData.shopAddress,
                  contact_number: formData.contactNumber,
                  business_id: formData.businessId,
                  proof_image_url: proofImageUrl,
                },
              ]);

            if (verificationError) throw verificationError;
          }

          toast({
            title: "Success!",
            description: formData.userType === "bookstore" 
              ? "Account created! Your verification request is pending approval." 
              : "Account created successfully!",
          });
          navigate("/dashboard");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "Logged in successfully",
        });
        navigate("/dashboard");
      }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-background to-secondary/20">
      <Navbar />
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <BookOpen className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-heading">
              {isSignup ? "Create an account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isSignup
                ? "Enter your information to create your account"
                : "Enter your credentials to access your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userType">Account Type</Label>
                    <select
                      id="userType"
                      value={formData.userType}
                      onChange={(e) => setFormData({ ...formData, userType: e.target.value as "user" | "bookstore" })}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      required
                    >
                      <option value="user">Student/User</option>
                      <option value="bookstore">Bookstore</option>
                    </select>
                  </div>
                  {formData.userType === "bookstore" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="shopName">Shop Name</Label>
                        <Input
                          id="shopName"
                          type="text"
                          placeholder="Book Haven"
                          value={formData.shopName}
                          onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shopAddress">Shop Address</Label>
                        <Input
                          id="shopAddress"
                          type="text"
                          placeholder="123 Main St, City"
                          value={formData.shopAddress}
                          onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactNumber">Contact Number</Label>
                        <Input
                          id="contactNumber"
                          type="tel"
                          placeholder="+1234567890"
                          value={formData.contactNumber}
                          onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessId">Business ID / Registration Number</Label>
                        <Input
                          id="businessId"
                          type="text"
                          placeholder="BUS123456"
                          value={formData.businessId}
                          onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proofImage">Business Proof Document (Optional)</Label>
                        <Input
                          id="proofImage"
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setProofImage(e.target.files?.[0] || null)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Upload business license or registration certificate
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover"
                disabled={loading}
              >
                {loading ? "Loading..." : isSignup ? "Sign Up" : "Login"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="text-primary hover:underline"
              >
                {isSignup
                  ? "Already have an account? Login"
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
