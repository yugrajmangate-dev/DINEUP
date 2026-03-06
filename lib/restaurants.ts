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

export const restaurants: Restaurant[] = [
  {
    id: "terra-bloom",
    name: "Terra Bloom",
    neighborhood: "Koregaon Park",
    cuisine: "Seasonal Vegetarian",
    description:
      "A softly lit rooftop for charcoal-kissed vegetables, fermented small plates, and zero-proof tasting pairings.",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    food_images: [
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80",
    ],
    coordinates: [73.9026, 18.5362],
    rating: 4.9,
    distance: "1.4 km away",
    price: "₹₹₹",
    tags: ["Vegetarian-Friendly", "Chef's Counter", "Golden Hour"],
    vibe: "Slow dining",
    icon: "leaf",
    layout: "wide",
    reservationSlots: ["7:15 PM", "8:00 PM", "9:10 PM"],
    phone: "+91 20 6748 2211",
    website: "https://dineup.example/terra-bloom",
    address: "Lane 5, Koregaon Park, Pune 411001",
    operating_hours: [
      { day: "Mon–Thu", hours: "12:00 PM – 11:00 PM" },
      { day: "Fri–Sun", hours: "12:00 PM – 11:45 PM" },
    ],
    dietary_tags: ["Pure Veg", "Vegan-friendly"],
  },
  {
    id: "cinder-house",
    name: "Cinder House",
    neighborhood: "Kalyani Nagar",
    cuisine: "Fire-led Modern Indian",
    description:
      "Dry-aged signatures, embered breads, and a moody dining room that feels equal parts supper club and gallery.",
    image:
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
    food_images: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=900&q=80",
    ],
    coordinates: [73.9051, 18.5498],
    rating: 4.8,
    distance: "2.6 km away",
    price: "₹₹₹₹",
    tags: ["Date Night", "Tasting Menu", "Sommelier Picks"],
    vibe: "Cinematic",
    icon: "sparkles",
    layout: "tall",
    reservationSlots: ["7:30 PM", "8:45 PM"],
    phone: "+91 20 6731 4470",
    website: "https://dineup.example/cinder-house",
    address: "North Main Road, Kalyani Nagar, Pune 411006",
    operating_hours: [
      { day: "Tue–Thu", hours: "6:00 PM – 11:30 PM" },
      { day: "Fri–Sun", hours: "6:00 PM – 12:15 AM" },
    ],
    dietary_tags: ["Vegetarian-friendly", "Gluten-aware"],
  },
  {
    id: "moss-cafe",
    name: "Moss Cafe",
    neighborhood: "Baner",
    cuisine: "All-day Cafe",
    description:
      "A daylight-filled cafe with matcha clouds, laminated pastries, and smart plug-in corners for long brunches.",
    image:
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    food_images: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80",
    ],
    coordinates: [73.7885, 18.5598],
    rating: 4.7,
    distance: "6.9 km away",
    price: "₹₹",
    tags: ["Cafe", "Work-Friendly", "Single-Origin"],
    vibe: "Sunlit calm",
    icon: "coffee",
    layout: "regular",
    reservationSlots: ["4:30 PM", "5:15 PM", "6:00 PM"],
    phone: "+91 20 6912 0835",
    website: "https://dineup.example/moss-cafe",
    address: "Baner Pashan Link Road, Baner, Pune 411045",
    operating_hours: [
      { day: "Daily", hours: "8:00 AM – 10:30 PM" },
      { day: "Kitchen", hours: "8:00 AM – 9:45 PM" },
    ],
    dietary_tags: ["Vegan-friendly", "Vegetarian-friendly"],
  },
  {
    id: "sora-izakaya",
    name: "Sora Izakaya",
    neighborhood: "Shivaji Nagar",
    cuisine: "Japanese Small Plates",
    description:
      "An intimate izakaya with hand rolls, smoky robata skewers, and a low-fi soundtrack under sculpted light.",
    image:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
    food_images: [
      "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1482003297000-b7663a1673f1?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
    ],
    coordinates: [73.8517, 18.5318],
    rating: 4.9,
    distance: "2.1 km away",
    price: "₹₹₹",
    tags: ["Late Seating", "Robata", "Chef-Led"],
    vibe: "After-dark energy",
    icon: "sparkles",
    layout: "regular",
    reservationSlots: ["8:20 PM", "9:00 PM", "10:10 PM"],
    phone: "+91 20 6903 7718",
    website: "https://dineup.example/sora-izakaya",
    address: "JM Road, Shivaji Nagar, Pune 411005",
    operating_hours: [
      { day: "Wed–Thu", hours: "6:00 PM – 11:30 PM" },
      { day: "Fri–Sun", hours: "6:00 PM – 12:30 AM" },
    ],
    dietary_tags: ["Vegetarian-friendly"],
  },
  {
    id: "olive-court",
    name: "Olive Court",
    neighborhood: "Deccan Gymkhana",
    cuisine: "Mediterranean",
    description:
      "Whitewashed arches, herb-led plates, and an open courtyard designed for lingering over shared mezze.",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
    food_images: [
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1529782351533-2d06e5d29c95?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80",
    ],
    coordinates: [73.8396, 18.5169],
    rating: 4.6,
    distance: "3.0 km away",
    price: "₹₹₹",
    tags: ["Outdoor Seating", "Vegetarian-Friendly", "Rosé Hour"],
    vibe: "Airy social",
    icon: "leaf",
    layout: "wide",
    reservationSlots: ["6:50 PM", "7:40 PM", "8:25 PM"],
    phone: "+91 20 6755 1026",
    website: "https://dineup.example/olive-court",
    address: "Bhandarkar Road, Deccan Gymkhana, Pune 411004",
    operating_hours: [
      { day: "Daily", hours: "12:00 PM – 11:15 PM" },
      { day: "Brunch", hours: "Sat–Sun 10:00 AM – 3:00 PM" },
    ],
    dietary_tags: ["Vegan-friendly", "Vegetarian-friendly"],
  },
  {
    id: "atlas-room",
    name: "Atlas Room",
    neighborhood: "Viman Nagar",
    cuisine: "Experimental Global",
    description:
      "A reservation-only room with immersive plating, tactile tableware, and a soundtrack choreographed to each course.",
    image:
      "https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=1200&q=80",
    food_images: [
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1476224203421-9ac39bcb3df1?auto=format&fit=crop&w=900&q=80",
    ],
    coordinates: [73.9163, 18.5672],
    rating: 5.0,
    distance: "5.2 km away",
    price: "₹₹₹₹",
    tags: ["Reservation Only", "Immersive", "Limited Seats"],
    vibe: "Collectible dining",
    icon: "sparkles",
    layout: "tall",
    reservationSlots: ["7:00 PM", "8:30 PM"],
    phone: "+91 20 6788 5001",
    website: "https://dineup.example/atlas-room",
    address: "Town Centre, Viman Nagar, Pune 411014",
    operating_hours: [
      { day: "Thu–Fri", hours: "7:00 PM – 11:00 PM" },
      { day: "Sat–Sun", hours: "1:00 PM – 11:30 PM" },
    ],
    dietary_tags: ["Vegetarian-friendly", "Gluten-aware"],
  },
];
