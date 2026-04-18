import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Navigation, MapPin, Search } from "lucide-react";
import { API_URL } from "../config/api";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  lat: number;
  lng: number;
  geofenceMeters: number;
  onChange: (data: { lat: number; lng: number; address?: string }) => void;
  onGeofenceChange?: (meters: number) => void;
}

const GOOGLE_MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ?? "";

export function WorkLocationPicker({ lat, lng, geofenceMeters, onChange, onGeofenceChange }: Props) {
  const { accessToken, deviceId } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const headers = { 
    'Authorization': `Bearer ${accessToken}`, 
    'Content-Type': 'application/json',
    'x-device-id': deviceId || ''
  };

  useEffect(() => {
    if (window.google?.maps?.Map) {
      setMapReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=marker,geometry&v=weekly`;
    s.async = true;
    s.onload = () => setMapReady(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;

    const initialPos = { lat: lat || 20.5937, lng: lng || 78.9629 };
    
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: initialPos,
      zoom: lat ? 16 : 5,
      mapId: "LOCATION_PICKER_MAP",
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const { AdvancedMarkerElement, PinElement } = window.google.maps.marker;

    const pin = new PinElement({
      background: "#4f46e5",
      borderColor: "#fff",
      glyphColor: "#fff",
    });

    markerRef.current = new AdvancedMarkerElement({
      map: mapInstanceRef.current,
      position: initialPos,
      content: pin.element,
      gmpDraggable: true,
    });

    circleRef.current = new window.google.maps.Circle({
      map: mapInstanceRef.current,
      center: initialPos,
      radius: Number(geofenceMeters) || 0,
      fillColor: "#4f46e5",
      fillOpacity: 0.2,
      strokeColor: "#4f46e5",
      strokeWeight: 3,
      strokeOpacity: 0.8,
      visible: Number(geofenceMeters) > 0,
      clickable: false,
    });

    // Handle Drag
    markerRef.current.addListener("dragend", async () => {
      const pos = markerRef.current.position;
      const newLat = pos.lat;
      const newLng = pos.lng;
      if (circleRef.current) {
        circleRef.current.setCenter({ lat: newLat, lng: newLng });
        circleRef.current.setVisible(Number(geofenceMeters) > 0);
      }
      
      // Reverse geocode via OSRM/Nominatim (no key needed)
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json&zoom=18`, {
          headers: { 'User-Agent': 'BillVyapar/1.0' }
        });
        const data = await response.json();
        const addr = data.display_name || "";
        onChange({ lat: newLat, lng: newLng, address: addr });
      } catch {
        onChange({ lat: newLat, lng: newLng });
      }
    });

    // Handle Map Click
    mapInstanceRef.current.addListener("click", async (e: any) => {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      if (markerRef.current) markerRef.current.position = { lat: newLat, lng: newLng };
      if (circleRef.current) {
        circleRef.current.setCenter({ lat: newLat, lng: newLng });
        circleRef.current.setVisible(Number(geofenceMeters) > 0);
      }

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json&zoom=18`, {
          headers: { 'User-Agent': 'BillVyapar/1.0' }
        });
        const data = await response.json();
        const addr = data.display_name || "";
        onChange({ lat: newLat, lng: newLng, address: addr });
      } catch {
        onChange({ lat: newLat, lng: newLng });
      }
    });

  }, [mapReady, geofenceMeters]);

  // Sync circle radius
  useEffect(() => {
    if (circleRef.current) {
      const val = Number(geofenceMeters) || 0;
      circleRef.current.setRadius(val);
      circleRef.current.setVisible(val > 0);
    }
  }, [geofenceMeters]);

  // Sync marker position if externally updated
  useEffect(() => {
    if (markerRef.current && lat && lng) {
      const currentPos = markerRef.current.position;
      if (Math.abs(currentPos.lat - lat) > 0.0001 || Math.abs(currentPos.lng - lng) > 0.0001) {
        markerRef.current.position = { lat, lng };
        if (circleRef.current) circleRef.current.setCenter({ lat, lng });
        if (mapInstanceRef.current) mapInstanceRef.current.panTo({ lat, lng });
      }
    }
  }, [lat, lng]);

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        if (markerRef.current) markerRef.current.position = { lat: newLat, lng: newLng };
        if (circleRef.current) circleRef.current.setCenter({ lat: newLat, lng: newLng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({ lat: newLat, lng: newLng });
          mapInstanceRef.current.setZoom(17);
        }
        onChange({ lat: newLat, lng: newLng });
        setLoading(false);
      },
      () => setLoading(false)
    );
  };

  // ── Integrated Search Logic ──────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);

  const searchPlaces = async (val: string) => {
    setQuery(val);
    if (!val || val.length < 2) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const p = new URLSearchParams({ q: val });
      if (mapInstanceRef.current) {
        const center = mapInstanceRef.current.getCenter();
        p.set("lat", String(center.lat()));
        p.set("lng", String(center.lng()));
      }
      const r = await fetch(`${API_URL}/attendance/places/autocomplete?${p}`, { headers });
      const data = await r.json();
      setSuggestions(Array.isArray(data) ? data : []);
      setShowSuggestions(data.length > 0);
    } catch { /* silent */ }
    finally { setSearching(false); }
  };

  const selectPlace = async (s: any) => {
    setShowSuggestions(false);
    setQuery(s.description);
    try {
      const r = await fetch(`${API_URL}/attendance/places/details?place_id=${encodeURIComponent(s.place_id)}`, { headers });
      const d = await r.json();
      if (d.lat && d.lng) {
        if (markerRef.current) markerRef.current.position = { lat: d.lat, lng: d.lng };
        if (circleRef.current) circleRef.current.setCenter({ lat: d.lat, lng: d.lng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo({ lat: d.lat, lng: d.lng });
          mapInstanceRef.current.setZoom(18);
        }
        onChange({ lat: d.lat, lng: d.lng, address: d.name || s.main || s.description });
      }
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 relative">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Search Landmark or Area</label>
          <Button size="sm" variant="ghost" onClick={detectLocation} disabled={loading} className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/5">
            <Navigation className="h-3 w-3 mr-1" /> Use My Location
          </Button>
        </div>
        
        <div className="relative group">
          <input
            value={query}
            onChange={(e) => searchPlaces(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search e.g. 'Coffee Shop', 'Sector 14', 'Business Park'..."
            className="w-full h-12 pl-11 pr-4 bg-muted/30 border-none rounded-2xl text-sm font-bold placeholder:font-normal focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" />
          
          {searching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-[210] mt-2 bg-card border border-border/40 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl bg-card/95">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onMouseDown={() => selectPlace(s)}
                  className="w-full text-left px-5 py-3.5 hover:bg-primary/5 transition-colors border-b border-border/10 last:border-0 flex gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4 text-primary/60" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{s.main}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{s.secondary}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative rounded-[28px] overflow-hidden border border-border/40 h-[280px] shadow-2xl bg-muted/10 group">
        <div ref={mapRef} className="w-full h-full" />
        
        {/* Floating Coordinates Tag */}
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
             <span className="text-[10px] font-black font-mono text-foreground opacity-80 uppercase tracking-tighter">
                {lat ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "Positioning..."}
             </span>
          </div>
        </div>

        {/* Instructions Overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-all duration-500 opacity-60 group-hover:opacity-100">
          <div className="bg-black/40 backdrop-blur-lg px-4 py-2 rounded-2xl border border-white/5 shadow-2xl">
             <p className="text-[9px] font-bold text-white uppercase tracking-widest text-center">Drag pin or click map to adjust precisely</p>
          </div>
        </div>
      </div>

      {/* Geofence Progress Visualizer */}
      <div className="bg-muted/20 p-5 rounded-3xl border border-border/40">
        <div className="flex justify-between items-end mb-3">
          <div className="space-y-0.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Geofence Lockdown Radius</label>
            <p className="text-[9px] text-muted-foreground">Area where attendance will be permitted</p>
          </div>
          <div className="px-3 py-1 bg-primary/10 rounded-lg border border-primary/20">
            <span className="text-xs font-black text-primary">{geofenceMeters}m</span>
          </div>
        </div>
        <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden border border-border/10 p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-primary to-indigo-400 rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]" 
            style={{ width: `${Math.max(5, Math.min(100, (geofenceMeters / 1000) * 100))}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 px-1">
          <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">Entry Range</span>
          <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">1km Max Guard</span>
        </div>
      </div>
    </div>
  );
}
