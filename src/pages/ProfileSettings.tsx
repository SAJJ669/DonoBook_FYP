import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Settings, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { geocodeAddress } from "@/utils/geocoding";

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    gender: "",
    contactNumber: "",
    shopName: "",
    shopAddress: "",
    businessId: "",
    userType: "user" as "user" | "bookstore",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setFormData({
          name: profile.name || "",
          address: profile.address || "",
          gender: profile.gender || "",
          contactNumber: profile.contact_number || "",
          shopName: profile.shop_name || "",
          shopAddress: profile.shop_address || "",
          businessId: profile.business_id || "",
          userType: profile.user_type,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);

    try {
      // Geocode address if it has changed
      let latitude = null;
      let longitude = null;

      const addressToGeocode = formData.userType === "user" ? formData.address : formData.shopAddress;

      if (addressToGeocode && addressToGeocode.trim()) {
        toast({
          title: "Geocoding address...",
          description: "Please wait while we process your location",
        });

        const geocodeResult = await geocodeAddress(addressToGeocode);
        if (geocodeResult) {
          latitude = geocodeResult.lat;
          longitude = geocodeResult.lng;
        }
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          name: formData.name,
          address: formData.userType === "user" ? formData.address : null,
          gender: formData.userType === "user" ? formData.gender : null,
          contact_number: formData.contactNumber || null,
          latitude: latitude,
          longitude: longitude,
          shop_name: formData.userType === "bookstore" ? formData.shopName : null,
          shop_address: formData.userType === "bookstore" ? formData.shopAddress : null,
          business_id: formData.userType === "bookstore" ? formData.businessId : null,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Profile updated successfully",
      });
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

  if (fetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-light via-background to-secondary/20">
        <Navbar />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-background to-secondary/20">
      <Navbar />
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-2xl shadow-card">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-heading">Profile Settings</CardTitle>
            </div>
            <CardDescription>
              Update your profile information and location settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {formData.userType === "user" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      type="text"
                      placeholder="123 Main St, City, Country"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your address will be geocoded and used to show you on the nearby users map
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact Number (Optional)</Label>
                    <Input
                      id="contactNumber"
                      type="tel"
                      placeholder="+1234567890"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    />
                  </div>
                </>
              )}

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
                    <p className="text-xs text-muted-foreground">
                      Your shop address will be geocoded and used for location-based features
                    </p>
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
                </>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-hover"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettings;
