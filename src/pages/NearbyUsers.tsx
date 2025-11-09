import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { User, MapPin } from "lucide-react";

// Fix for default marker icons in react-leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface UserLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  gender: string | null;
  bookTypes: string[]; // types of books this user has listed
}

const NearbyUsers = () => {
  const [users, setUsers] = useState<UserLocation[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserLocation[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.505, -0.09]); // Default: London
  const { toast } = useToast();

  // Custom icons for male/female
  const maleIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
        <path d="M15 0C8.373 0 3 5.373 3 12c0 8.25 12 24 12 24s12-15.75 12-24c0-6.627-5.373-12-12-12z" fill="#3b82f6"/>
        <circle cx="15" cy="12" r="6" fill="white"/>
        <path d="M15 8a4 4 0 100 8 4 4 0 000-8z" fill="#3b82f6"/>
      </svg>
    `),
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40],
  });

  const femaleIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
        <path d="M15 0C8.373 0 3 5.373 3 12c0 8.25 12 24 12 24s12-15.75 12-24c0-6.627-5.373-12-12-12z" fill="#ec4899"/>
        <circle cx="15" cy="12" r="6" fill="white"/>
        <path d="M15 8a4 4 0 100 8 4 4 0 000-8z" fill="#ec4899"/>
      </svg>
    `),
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40],
  });

  const defaultIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
        <path d="M15 0C8.373 0 3 5.373 3 12c0 8.25 12 24 12 24s12-15.75 12-24c0-6.627-5.373-12-12-12z" fill="#6366f1"/>
        <circle cx="15" cy="12" r="6" fill="white"/>
        <path d="M15 8a4 4 0 100 8 4 4 0 000-8z" fill="#6366f1"/>
      </svg>
    `),
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40],
  });

  useEffect(() => {
    fetchUsersWithLocation();
    // Try to get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log("Geolocation error:", error);
        }
      );
    }
  }, []);

  useEffect(() => {
    filterUsers();
  }, [selectedFilter, users]);

  const fetchUsersWithLocation = async () => {
    try {
      setLoading(true);

      // Fetch users with location data
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, latitude, longitude, address, gender")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setFilteredUsers([]);
        toast({
          title: "No users found",
          description: "No users have added their location yet.",
        });
        return;
      }

      // Fetch books for each user to determine what types they offer
      const { data: books, error: booksError } = await supabase
        .from("books")
        .select("owner_id, type");

      if (booksError) throw booksError;

      // Group books by owner
      const booksByOwner: { [key: string]: string[] } = {};
      books?.forEach((book) => {
        if (!booksByOwner[book.owner_id]) {
          booksByOwner[book.owner_id] = [];
        }
        if (!booksByOwner[book.owner_id].includes(book.type)) {
          booksByOwner[book.owner_id].push(book.type);
        }
      });

      const usersWithLocation: UserLocation[] = profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        latitude: profile.latitude,
        longitude: profile.longitude,
        address: profile.address || "Address not provided",
        gender: profile.gender,
        bookTypes: booksByOwner[profile.id] || [],
      }));

      setUsers(usersWithLocation);
      setFilteredUsers(usersWithLocation);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (selectedFilter === "all") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter((user) =>
        user.bookTypes.includes(selectedFilter)
      );
      setFilteredUsers(filtered);
    }
  };

  const getMarkerIcon = (gender: string | null) => {
    if (gender === "male") return maleIcon;
    if (gender === "female") return femaleIcon;
    return defaultIcon;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <MapPin className="h-8 w-8 text-primary" />
            Nearby Users
          </h1>
          <p className="text-muted-foreground">
            Find users near you who are willing to exchange, sell, or donate books
          </p>
        </div>

        {/* Filter buttons */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedFilter === "all" ? "default" : "outline"}
              onClick={() => setSelectedFilter("all")}
            >
              All Users ({users.length})
            </Button>
            <Button
              variant={selectedFilter === "donate" ? "default" : "outline"}
              onClick={() => setSelectedFilter("donate")}
            >
              Donate (
              {users.filter((u) => u.bookTypes.includes("donate")).length})
            </Button>
            <Button
              variant={selectedFilter === "exchange" ? "default" : "outline"}
              onClick={() => setSelectedFilter("exchange")}
            >
              Exchange (
              {users.filter((u) => u.bookTypes.includes("exchange")).length})
            </Button>
            <Button
              variant={selectedFilter === "sell" ? "default" : "outline"}
              onClick={() => setSelectedFilter("sell")}
            >
              Sell ({users.filter((u) => u.bookTypes.includes("sell")).length})
            </Button>
          </div>
        </Card>

        {/* Legend */}
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-2">Legend:</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span>Male</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-pink-500"></div>
              <span>Female</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-indigo-500"></div>
              <span>Other/Not specified</span>
            </div>
          </div>
        </Card>

        {/* Map */}
        {loading ? (
          <div className="flex items-center justify-center h-[600px] bg-muted rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="p-12 text-center">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground">
              {selectedFilter === "all"
                ? "No users have added their location yet."
                : `No users offering "${selectedFilter}" books in your area.`}
            </p>
          </Card>
        ) : (
          <div className="rounded-lg overflow-hidden shadow-lg" style={{ height: "600px" }}>
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredUsers.map((user) => (
                <Marker
                  key={user.id}
                  position={[user.latitude, user.longitude]}
                  icon={getMarkerIcon(user.gender)}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-lg mb-1">{user.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{user.address}</p>
                      {user.bookTypes.length > 0 && (
                        <div>
                          <p className="text-sm font-medium">Offers:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.bookTypes.map((type) => (
                              <span
                                key={type}
                                className="inline-block bg-primary text-primary-foreground text-xs px-2 py-1 rounded"
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyUsers;
