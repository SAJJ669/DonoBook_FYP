/**
 * Geocoding utility using Nominatim API (OpenStreetMap)
 * Free geocoding service - no API key required
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Convert address to coordinates using Nominatim API
 * @param address - The address to geocode
 * @returns Promise with lat, lng, and display name
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!address || address.trim().length === 0) {
    return null;
  }

  try {
    // Use Nominatim API (free, no key required)
    // Note: Add a delay between requests to respect usage policy
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'BookExchangeApp/1.0' // Required by Nominatim
        }
      }
    );

    if (!response.ok) {
      console.error('Geocoding failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Reverse geocode: convert coordinates to address
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Promise with address string
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'BookExchangeApp/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.display_name || null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}
