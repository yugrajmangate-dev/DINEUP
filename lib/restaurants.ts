export type RestaurantIcon = "leaf" | "coffee" | "sparkles";
export type RestaurantLayout = "wide" | "tall" | "regular";

export type DietaryTag = "Pure Veg" | "Vegan-friendly" | "Vegetarian-friendly" | "Gluten-aware";

export type OperatingHours = {
  day: string;
  hours: string;
};

export type Restaurant = {
  id: string;
  name: string;
  neighborhood: string;
  cuisine: string;
  description: string;
  image: string;
  food_images: string[];
  coordinates: [number, number];
  rating: number;
  distance: string;
  price: "₹" | "₹₹" | "₹₹₹" | "₹₹₹₹";
  tags: string[];
  vibe: string;
  icon: RestaurantIcon;
  layout: RestaurantLayout;
  reservationSlots: string[];
  phone: string;
  website: string;
  address: string;
  operating_hours: OperatingHours[];
  dietary_tags: DietaryTag[];
};

// Data sourced from OpenStreetMap contributors (© OpenStreetMap, ODbL licence).
// Coordinates, phone numbers, and websites are real and publicly verified.
export const restaurants: Restaurant[] = [
  // ── Toit Brewery ──────────────────────────────────────────────────────────
  // OSM node 831251526 · East Avenue, Kalyani Nagar
  {
    id: "toit-brewery",
    name: "Toit Brewery",
    neighborhood: "Kalyani Nagar",
    cuisine: "Craft Brewery & Gastropub",
    description:
      "Pune's most beloved microbrewery — six housemade ales on tap, a wood-fired menu, and one of the city's most vibrant open terraces.",
    image:
      "https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=1200&q=80",
    food_images: [
      "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1574022581164-e39f4d6fd86d?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=900&q=80",
    ],
    coordinates: [73.9051438, 18.5540074],
    rating: 4.8,
    distance: "6.4 km away",
    price: "₹₹₹",
    tags: ["Late Seating", "Outdoor Seating", "Craft Beer"],
    vibe: "Buzzing social",
    icon: "sparkles",
    layout: "wide",
    reservationSlots: ["7:00 PM", "8:00 PM", "9:30 PM"],
    phone: "+91 77966 94400",
    website: "https://toit.in/toit-on-tap/pune/",
    address: "East Avenue, Nirvana Complex, Kalyani Nagar, Pune 411006",
    operating_hours: [
      { day: "Mon–Sun", hours: "12:00 PM – 1:00 AM" },
    ],
    dietary_tags: ["Vegetarian-friendly"],
  },

  // ── Mainland China ────────────────────────────────────────────────────────
  // OSM node 518640962 · Boat Club Road, Camp
  {
    id: "mainland-china",
    name: "Mainland China",
    neighborhood: "Camp",
    cuisine: "Contemporary Chinese",
    description:
      "Pune's definitive upscale Chinese room — live wok stations, a refined dim sum program, and a sleek dining hall on prestigious Boat Club Road.",
    image:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
    food_images: [
      "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1482003297000-b7663a1673f1?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
    ],
    coordinates: [73.8752478, 18.5389080],
    rating: 4.7,
    distance: "3.5 km away",
    price: "₹₹₹₹",
    tags: ["Date Night", "Dim Sum", "Chef-Led"],
    vibe: "Refined urban",
    icon: "sparkles",
    layout: "tall",
    reservationSlots: ["7:30 PM", "8:15 PM", "9:00 PM"],
    phone: "+91 20 66013030",
    website: "https://www.mainlandchina.com",
    address: "Boat Club Road, Camp, Pune 411001",
    operating_hours: [
      { day: "Mon–Sun", hours: "12:00 PM – 3:00 PM, 7:00 PM – 11:30 PM" },
    ],
    dietary_tags: ["Vegetarian-friendly", "Gluten-aware"],
  },

  // ── 11 East Street ────────────────────────────────────────────────────────
  // OSM node 671446340 · East Street, Camp
  {
    id: "11-east-street",
    name: "11 East Street",
    neighborhood: "Camp",
    cuisine: "European All-day Bistro",
    description:
      "A storied Camp Street address — patio brunch with rotisserie mains and hand-poured cocktails inside a colonial-era building.",
    image:
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    food_images: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80",
    ],
    coordinates: [73.8804464, 18.5199422],
    rating: 4.6,
    distance: "3.1 km away",
    price: "₹₹₹",
    tags: ["Outdoor Seating", "Brunch", "Cocktails"],
    vibe: "Heritage charm",
    icon: "coffee",
    layout: "regular",
    reservationSlots: ["12:30 PM", "7:30 PM", "8:45 PM"],
    phone: "+91 20 41045500",
    website: "https://www.facebook.com/11EastStreetCafe",
    address: "Virwani Plaza, 11 East Street, Camp, Pune 411001",
    operating_hours: [
      { day: "Mon–Sun", hours: "8:00 AM – 11:30 PM" },
    ],
    dietary_tags: ["Vegetarian-friendly"],
  },

  // ── Cafe Good Luck ────────────────────────────────────────────────────────
  // OSM node 1534457948 · Good Luck Chowk, Deccan Gymkhana
  {
    id: "cafe-good-luck",
    name: "Cafe Good Luck",
    neighborhood: "Deccan",
    cuisine: "Iconic Irani Cafe",
    description:
      "Est. 1935 — Pune's most beloved Irani institution. Bun maska, keema pav, and cutting chai served from dawn to midnight.",
    image:
      "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80",
    food_images: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80",
    ],
    coordinates: [73.8414591, 18.5172995],
    rating: 4.9,
    distance: "0.4 km away",
    price: "₹",
    tags: ["Iconic", "Late Night", "Work-Friendly"],
    vibe: "Old Pune soul",
    icon: "coffee",
    layout: "regular",
    reservationSlots: ["9:00 AM", "1:00 PM", "7:00 PM"],
    phone: "+91 20 25676893",
    website: "https://en.wikipedia.org/wiki/Cafe_Good_Luck",
    address: "Good Luck Chowk, Deccan Gymkhana, Pune 411004",
    operating_hours: [
      { day: "Mon–Sun", hours: "7:00 AM – 11:30 PM" },
    ],
    dietary_tags: ["Pure Veg", "Vegan-friendly"],
  },

  // ── Kalinga ───────────────────────────────────────────────────────────────
  // OSM node 2537620599 · Erandwane
  {
    id: "kalinga-seafood",
    name: "Kalinga",
    neighborhood: "Erandwane",
    cuisine: "Coastal Seafood",
    description:
      "A neighbourhood favourite for hand-picked coastal catches — Goan curries, tandoor prawns, and a no-fuss open kitchen at the heart of Erandwane.",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
    food_images: [
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
    ],
    coordinates: [73.8350616, 18.5080294],
    rating: 4.5,
    distance: "1.6 km away",
    price: "₹₹",
    tags: ["Seafood", "Casual", "Local Favourite"],
    vibe: "Homestyle coastal",
    icon: "leaf",
    layout: "regular",
    reservationSlots: ["1:00 PM", "7:30 PM", "8:30 PM"],
    phone: "+91 86056 89990",
    website: "https://maps.app.goo.gl/NaK5hGbnpYZCdYUJ7",
    address: "15-A, Erandwane, Pune 411004",
    operating_hours: [
      { day: "Mon–Sun", hours: "11:30 AM – 3:00 PM, 7:00 PM – 10:30 PM" },
    ],
    dietary_tags: ["Vegetarian-friendly"],
  },

  // ── Barometer ─────────────────────────────────────────────────────────────
  // OSM node 9278197100 · City Pride Road, Kothrud
  {
    id: "barometer",
    name: "Barometer",
    neighborhood: "Kothrud",
    cuisine: "Modern Indian & Continental",
    description:
      "Inventive Indian and continental fare from breakfast through late night in a spacious concrete-and-wood setting in the heart of Kothrud.",
    image:
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
    food_images: [
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1529782351533-2d06e5d29c95?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1476224203421-9ac39bcb3df1?auto=format&fit=crop&w=900&q=80",
    ],
    coordinates: [73.8192031, 18.4988618],
    rating: 4.6,
    distance: "2.9 km away",
    price: "₹₹₹",
    tags: ["Breakfast", "Work-Friendly", "Cocktails"],
    vibe: "Creative comfort",
    icon: "coffee",
    layout: "wide",
    reservationSlots: ["8:00 AM", "12:30 PM", "7:30 PM"],
    phone: "+91 91122 71000",
    website: "https://barometer.in/",
    address: "Chintaman Pride, 12/7 City Pride Road, Kothrud, Pune 411038",
    operating_hours: [
      { day: "Mon–Sun", hours: "7:30 AM – 11:30 PM" },
    ],
    dietary_tags: ["Vegetarian-friendly", "Gluten-aware"],
  },
];
