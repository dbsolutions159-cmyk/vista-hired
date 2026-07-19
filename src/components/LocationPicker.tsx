import { useMemo, useState } from "react";
import { MapPin, Navigation, Search, Star, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const POPULAR = ["Delhi", "Mumbai", "Pune", "Bhopal"];

// Curated alphabetical list of major Indian cities.
const ALL_CITIES = [
  "Agra", "Ahmedabad", "Ajmer", "Aligarh", "Allahabad", "Amritsar", "Aurangabad",
  "Bangalore", "Bareilly", "Bhopal", "Bhubaneswar", "Bikaner",
  "Chandigarh", "Chennai", "Coimbatore", "Cuttack",
  "Dehradun", "Delhi", "Dhanbad", "Durgapur",
  "Faridabad",
  "Ghaziabad", "Goa", "Gorakhpur", "Guntur", "Gurgaon", "Guwahati", "Gwalior",
  "Howrah", "Hubli", "Hyderabad",
  "Indore",
  "Jabalpur", "Jaipur", "Jalandhar", "Jammu", "Jamshedpur", "Jodhpur",
  "Kanpur", "Kochi", "Kolhapur", "Kolkata", "Kota",
  "Lucknow", "Ludhiana",
  "Madurai", "Mangalore", "Meerut", "Moradabad", "Mumbai", "Mysore",
  "Nagpur", "Nashik", "Navi Mumbai", "Noida",
  "Patna", "Pondicherry", "Prayagraj", "Pune",
  "Raipur", "Rajkot", "Ranchi", "Rourkela",
  "Salem", "Shillong", "Siliguri", "Solapur", "Srinagar", "Surat",
  "Thane", "Thiruvananthapuram", "Tiruchirappalli", "Tirupati",
  "Udaipur",
  "Vadodara", "Varanasi", "Vasai", "Vellore", "Vijayawada", "Visakhapatnam",
  "Warangal",
].sort((a, b) => a.localeCompare(b));

export function LocationPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [detecting, setDetecting] = useState(false);

  const filteredCities = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return ALL_CITIES;
    return ALL_CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [filter]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setFilter("");
  };

  const detect = async () => {
    if (!("geolocation" in navigator)) {
      toast.error("Location not supported on this device");
      return;
    }
    setDetecting(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 60_000,
        });
      });
      const { latitude, longitude } = pos.coords;
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Reverse geocode failed");
      const data = await res.json();
      const a = data.address || {};
      // Prefer the most specific locality/neighbourhood available.
      const locality =
        a.neighbourhood ||
        a.suburb ||
        a.quarter ||
        a.hamlet ||
        a.village ||
        a.town ||
        a.city_district ||
        a.city ||
        a.county ||
        a.state ||
        data.name;
      if (!locality) throw new Error("Could not detect location");
      pick(locality);
      toast.success(`Location set: ${locality}`);
    } catch (e: any) {
      const msg =
        e?.code === 1
          ? "Location permission denied"
          : e?.message || "Could not detect location";
      toast.error(msg);
    } finally {
      setDetecting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex h-11 w-full items-center gap-2 rounded-md border border-input bg-background/70 px-3 text-left text-sm md:w-56 ${className || ""}`}
          aria-label="Choose location"
        >
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className={`flex-1 truncate ${value ? "" : "text-muted-foreground"}`}>
            {value || "Location"}
          </span>
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear location"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[92vw] max-w-sm p-0 sm:w-80"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b p-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-start gap-2"
            onClick={detect}
            disabled={detecting}
          >
            {detecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4 text-primary" />
            )}
            {detecting ? "Detecting…" : "Use current location"}
          </Button>
        </div>

        <div className="p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Star className="h-3.5 w-3.5 text-primary" /> Popular cities
          </div>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => pick(c)}
                className={`rounded-full border px-3 py-1 text-xs transition-all ${
                  value === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t p-3">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search all cities"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <ScrollArea className="h-56 pr-2">
            <ul className="space-y-0.5">
              {filteredCities.length === 0 && (
                <li className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No cities match "{filter}"
                </li>
              )}
              {filteredCities.map((c) => (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                      value === c ? "bg-muted font-medium text-primary" : ""
                    }`}
                  >
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
