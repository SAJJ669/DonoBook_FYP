import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Gift, RefreshCw, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Item = Database['public']['Tables']['items']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

const ItemDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [item, setItem] = useState<Item | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchItemDetails();
    getCurrentUser();
  }, [id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchItemDetails = async () => {
    try {
      const { data: itemData, error: itemError } = await supabase
        .from("items")
        .select("*")
        .eq("id", id!)
        .single();

      if (itemError) throw itemError;
      setItem(itemData);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", itemData.owner_id)
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
    navigate(`/messages?userId=${item?.owner_id}`);
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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      bag: "Bag",
      water_bottle: "Water Bottle",
      pencil_box: "Pencil Box",
      lunchbox: "Lunchbox",
      stationery: "Stationery",
      other: "Other",
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Loading item details...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  const isOwner = currentUserId === item.owner_id;

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
          <Card className="shadow-card">
            <CardContent className="p-6">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-96 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-96 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Package className="h-24 w-24 text-white" />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-3xl font-heading">{item.name}</CardTitle>
                <CardDescription>
                  Posted by {owner?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-base py-2 px-4">
                    {getTypeIcon(item.type)}
                    <span className="ml-2 capitalize">{item.type}</span>
                  </Badge>
                  <Badge variant="outline" className="text-base py-2 px-4">
                    {item.condition === "new" ? "New" : "Used"}
                  </Badge>
                  <Badge variant="outline" className="text-base py-2 px-4">
                    <Package className="h-4 w-4 mr-2" />
                    {getCategoryLabel(item.category)}
                  </Badge>
                </div>

                {item.description && (
                  <div className="pt-4 border-t">
                    <h3 className="font-heading font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                )}

                {!isOwner && (
                  <Button
                    onClick={handleContact}
                    className="w-full bg-primary hover:bg-primary-hover gap-2 text-lg py-6"
                  >
                    <MessageSquare className="h-5 w-5" />
                    Contact Owner
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

export default ItemDetails;