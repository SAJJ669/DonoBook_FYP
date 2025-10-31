import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AISettings {
  matching_threshold: number;
  enable_web_lookup: boolean;
  enable_fact_checking: boolean;
  preferred_sources: string[];
  cache_duration_days: number;
  max_image_size_mb: number;
}

const AdminSettings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState<AISettings>({
    matching_threshold: 98,
    enable_web_lookup: true,
    enable_fact_checking: true,
    preferred_sources: ["google_books", "open_library", "isbndb"],
    cache_duration_days: 30,
    max_image_size_mb: 10,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

      if (!roles || roles.length === 0) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await fetchSettings();
    } catch (error: any) {
      console.error("Error checking admin access:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_settings")
        .select("*");

      if (error) throw error;

      if (data) {
        const settingsMap: any = {};
        data.forEach(item => {
          settingsMap[item.setting_key] = item.setting_value;
        });

        setSettings({
          matching_threshold: parseFloat(settingsMap.matching_threshold || 98),
          enable_web_lookup: settingsMap.enable_web_lookup === true,
          enable_fact_checking: settingsMap.enable_fact_checking === true,
          preferred_sources: Array.isArray(settingsMap.preferred_sources) 
            ? settingsMap.preferred_sources 
            : ["google_books", "open_library", "isbndb"],
          cache_duration_days: parseInt(settingsMap.cache_duration_days || 30),
          max_image_size_mb: parseInt(settingsMap.max_image_size_mb || 10),
        });
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const { error } = await supabase
        .from("ai_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Setting updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating setting:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await Promise.all([
        updateSetting("matching_threshold", settings.matching_threshold),
        updateSetting("enable_web_lookup", settings.enable_web_lookup),
        updateSetting("enable_fact_checking", settings.enable_fact_checking),
        updateSetting("preferred_sources", settings.preferred_sources),
        updateSetting("cache_duration_days", settings.cache_duration_days),
        updateSetting("max_image_size_mb", settings.max_image_size_mb),
      ]);

      toast({
        title: "Success",
        description: "All settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save some settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto shadow-card">
          <CardHeader>
            <CardTitle className="text-3xl font-heading flex items-center gap-2">
              <Settings className="h-8 w-8" />
              AI Configuration Settings
            </CardTitle>
            <CardDescription>
              Fine-tune AI behavior for book metadata extraction and matching
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Matching Threshold */}
            <div className="space-y-2">
              <Label htmlFor="threshold">
                Matching Threshold (%)
                <span className="text-sm text-muted-foreground ml-2">
                  Current: {settings.matching_threshold}%
                </span>
              </Label>
              <Input
                id="threshold"
                type="range"
                min="90"
                max="100"
                step="0.5"
                value={settings.matching_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, matching_threshold: parseFloat(e.target.value) })
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Minimum confidence score required for accepting book matches (90-100%)
              </p>
            </div>

            {/* Web Lookup Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="web-lookup">Enable Web Lookup</Label>
                <p className="text-sm text-muted-foreground">
                  Search online databases for book metadata
                </p>
              </div>
              <Switch
                id="web-lookup"
                checked={settings.enable_web_lookup}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_web_lookup: checked })
                }
              />
            </div>

            {/* Fact-Checking Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="fact-check">Enable Fact-Checking</Label>
                <p className="text-sm text-muted-foreground">
                  Verify extracted data against external sources
                </p>
              </div>
              <Switch
                id="fact-check"
                checked={settings.enable_fact_checking}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_fact_checking: checked })
                }
              />
            </div>

            {/* Cache Duration */}
            <div className="space-y-2">
              <Label htmlFor="cache">Cache Duration (Days)</Label>
              <Input
                id="cache"
                type="number"
                min="1"
                max="365"
                value={settings.cache_duration_days}
                onChange={(e) =>
                  setSettings({ ...settings, cache_duration_days: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                How long to cache book metadata before refreshing
              </p>
            </div>

            {/* Max Image Size */}
            <div className="space-y-2">
              <Label htmlFor="image-size">Maximum Image Size (MB)</Label>
              <Input
                id="image-size"
                type="number"
                min="1"
                max="50"
                value={settings.max_image_size_mb}
                onChange={(e) =>
                  setSettings({ ...settings, max_image_size_mb: parseInt(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum allowed image file size for uploads
              </p>
            </div>

            {/* Preferred Sources */}
            <div className="space-y-2">
              <Label>Preferred Data Sources</Label>
              <div className="space-y-2">
                {["google_books", "open_library", "isbndb"].map((source) => (
                  <div key={source} className="flex items-center space-x-2">
                    <Switch
                      checked={settings.preferred_sources.includes(source)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSettings({
                            ...settings,
                            preferred_sources: [...settings.preferred_sources, source],
                          });
                        } else {
                          setSettings({
                            ...settings,
                            preferred_sources: settings.preferred_sources.filter(
                              (s) => s !== source
                            ),
                          });
                        }
                      }}
                    />
                    <Label className="font-normal capitalize">
                      {source.replace("_", " ")}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save All Settings"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;