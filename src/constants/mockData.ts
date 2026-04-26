export type Coords = { lat: number; lon: number };

export type Shipment = {
  id: string;
  product: string;
  category: string;
  quadrant: string;
  origin: string;
  destination: string;
  currentNode: string;
  etaHours: number;
  delayHours: number;
  progressPct: number;
  currentLeg: string;
  baseRouteCost: number;
  expediteRouteCost: number;
  revenuePerUnit: number;
  unitsInShipment: number;
  costPerHourDelay: number;
  supplierKey: string;
  arrivalDate: Date;
  coords: {
    origin: Coords;
    destination: Coords;
  };
  status?: string;
  riskScore?: number;
};

const today = new Date();
const addDays = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d;
};

export const MOCK_SHIPMENTS: Shipment[] = [
  {
    id: "S001", product: "Wireless Earbuds", category: "Electronics",
    quadrant: "star", origin: "Mumbai", destination: "Delhi",
    currentNode: "Indore Hub", etaHours: 36, delayHours: 4.2,
    progressPct: 34, currentLeg: "Hub → Transit",
    baseRouteCost: 1200, expediteRouteCost: 1850,
    revenuePerUnit: 45, unitsInShipment: 500, costPerHourDelay: 375,
    supplierKey: "supplierA", arrivalDate: addDays(2),
    coords: {
      origin:      { lat: 19.0760, lon: 72.8777 },
      destination: { lat: 28.6139, lon: 77.2090 }
    }
  },
  {
    id: "S002", product: "Apparel Collection", category: "Apparel",
    quadrant: "volume_driver", origin: "Shanghai", destination: "Mumbai",
    currentNode: "Colombo Transit", etaHours: 120, delayHours: 0,
    progressPct: 61, currentLeg: "Transit → Destination",
    baseRouteCost: 3200, expediteRouteCost: 4800,
    revenuePerUnit: 12, unitsInShipment: 1200, costPerHourDelay: 120,
    supplierKey: "supplierB", arrivalDate: addDays(5),
    coords: {
      origin:      { lat: 31.2304, lon: 121.4737 },
      destination: { lat: 19.0760, lon: 72.8777  }
    }
  },
  {
    id: "S003", product: "Home Goods Bundle", category: "Home",
    quadrant: "hidden_gem", origin: "Dubai", destination: "Bangalore",
    currentNode: "Hyderabad Hub", etaHours: 28, delayHours: 1.8,
    progressPct: 18, currentLeg: "Origin → Hub",
    baseRouteCost: 900, expediteRouteCost: 1400,
    revenuePerUnit: 38, unitsInShipment: 300, costPerHourDelay: 190,
    supplierKey: "supplierC", arrivalDate: addDays(3),
    coords: {
      origin:      { lat: 25.2048, lon: 55.2708 },
      destination: { lat: 12.9716, lon: 77.5946 }
    }
  },
  {
    id: "S004", product: "Footwear Range", category: "Footwear",
    quadrant: "volume_driver", origin: "Ho Chi Minh", destination: "Chennai",
    currentNode: "Chennai Port", etaHours: 8, delayHours: 0,
    progressPct: 78, currentLeg: "Transit → Destination",
    baseRouteCost: 1800, expediteRouteCost: 2600,
    revenuePerUnit: 18, unitsInShipment: 800, costPerHourDelay: 140,
    supplierKey: "supplierD", arrivalDate: addDays(1),
    coords: {
      origin:      { lat: 10.8231, lon: 106.6297 },
      destination: { lat: 13.0827, lon: 80.2707  }
    }
  },
  {
    id: "S005", product: "Premium Headphones", category: "Electronics",
    quadrant: "hidden_gem", origin: "Frankfurt", destination: "Delhi",
    currentNode: "Tehran Transit", etaHours: 96, delayHours: 6.1,
    progressPct: 9, currentLeg: "Origin → Hub",
    baseRouteCost: 5200, expediteRouteCost: 7800,
    revenuePerUnit: 95, unitsInShipment: 200, costPerHourDelay: 475,
    supplierKey: "supplierE", arrivalDate: addDays(4),
    coords: {
      origin:      { lat: 50.1109, lon: 8.6821  },
      destination: { lat: 28.6139, lon: 77.2090 }
    }
  }
];

export const SUPPLIERS: Record<string, any> = {
  supplierA: {
    name: "AsiaTech Manufacturing", country: "China", flag: "🇨🇳",
    tariffPct: 18, etaDays: 14, qualityScore: 92, costPerUnit: 4.20,
    reliability: 78, financialRating: "BBB", politicsStability: "moderate",
    news: "US-China tariff escalation continues. 15% additional levy proposed on electronics.",
    products: ["Wireless Earbuds", "Phone Chargers", "Smart Watches"]
  },
  supplierB: {
    name: "VietFast Logistics", country: "Vietnam", flag: "🇻🇳",
    tariffPct: 6, etaDays: 18, qualityScore: 87, costPerUnit: 3.10,
    reliability: 91, financialRating: "A", politicsStability: "stable",
    news: "Stable trade environment. New EU-Vietnam FTA fully in effect.",
    products: ["Running Shoes", "Backpacks", "Reusable Bags"]
  },
  supplierC: {
    name: "IndiaFirst Supply Co", country: "India", flag: "🇮🇳",
    tariffPct: 0, etaDays: 7, qualityScore: 89, costPerUnit: 3.80,
    reliability: 85, financialRating: "A", politicsStability: "stable",
    news: "Port congestion at JNPT Mumbai reported. Clearance delays of 12-18h.",
    products: ["Yoga Mats", "Home Goods Bundle", "Hair Ties"]
  },
  supplierD: {
    name: "DhakaGoods Ltd", country: "Bangladesh", flag: "🇧🇩",
    tariffPct: 3, etaDays: 21, qualityScore: 81, costPerUnit: 2.60,
    reliability: 70, financialRating: "BB", politicsStability: "unstable",
    news: "Political instability ongoing. Factory strikes affecting 3 major textile hubs.",
    products: ["Basic T-Shirts", "Cotton Socks", "Silk Scarves"]
  },
  supplierE: {
    name: "EuroElite GmbH", country: "Germany", flag: "🇩🇪",
    tariffPct: 12, etaDays: 10, qualityScore: 97, costPerUnit: 8.90,
    reliability: 96, financialRating: "AAA", politicsStability: "stable",
    news: "Stable economic conditions. No active trade disruptions reported.",
    products: ["Premium Headphones", "Leather Wallets", "Sunglasses"]
  }
};

export const suppliers = Object.values(SUPPLIERS);

export const GEOPOLITICAL_DATA: Record<string, {riskLevel: number, reason: string}> = {
  "China":      { riskLevel: 65, reason: "Trade war escalation, tariff uncertainty" },
  "Vietnam":    { riskLevel: 20, reason: "Stable FTA environment" },
  "India":      { riskLevel: 35, reason: "Port congestion, clearance delays" },
  "Bangladesh": { riskLevel: 72, reason: "Political instability, factory strikes" },
  "Germany":    { riskLevel: 8,  reason: "Stable, no active disruptions" }
};

export const WAREHOUSE = {
  id: "WH-Delhi-01", capacityPct: 48,
  loadingDocks: [
    { slotId: "DOCK-1", occupiedBy: "S099", dwellHours: 6.5, paperworkStatus: "bottleneck" },
    { slotId: "DOCK-2", occupiedBy: null, dwellHours: 0, paperworkStatus: "clear" }
  ],
  deepStorage: [
    { slotId: "DEEP-7", occupiedBy: null },
    { slotId: "DEEP-8", occupiedBy: null }
  ]
};

export const DEAD_WEIGHT_BLOCKER = {
  id: "S099", product: "Novelty Mugs", quadrant: "dead_weight",
  costPerHourDelay: 10, revenuePerUnit: 6, unitsInShipment: 200
};

export const PRODUCTS = {
  stars: [
    { name:"Wireless Earbuds",  profit:18, unitsSold:2100, category:"Electronics" },
    { name:"Running Shoes",     profit:22, unitsSold:1850, category:"Footwear"    },
    { name:"Phone Cases",       profit:8,  unitsSold:2400, category:"Accessories" },
    { name:"Yoga Mats",         profit:15, unitsSold:1600, category:"Sports"      },
    { name:"Backpacks",         profit:24, unitsSold:1400, category:"Bags"        },
    { name:"Sunglasses",        profit:19, unitsSold:1750, category:"Accessories" }
  ],
  hiddenGems: [
    { name:"Premium Headphones", profit:45, unitsSold:180, category:"Electronics" },
    { name:"Leather Wallets",    profit:28, unitsSold:210, category:"Accessories" },
    { name:"Silk Scarves",       profit:35, unitsSold:160, category:"Apparel"     },
    { name:"Smart Watches",      profit:42, unitsSold:140, category:"Electronics" }
  ],
  volumeDrivers: [
    { name:"Basic T-Shirts",   profit:3,  unitsSold:2200, category:"Apparel"     },
    { name:"Cotton Socks",     profit:2,  unitsSold:2800, category:"Apparel"     },
    { name:"Hair Ties",        profit:1.5,unitsSold:3100, category:"Accessories" },
    { name:"Phone Chargers",   profit:5,  unitsSold:1900, category:"Electronics" },
    { name:"Reusable Bags",    profit:4,  unitsSold:2100, category:"Bags"        }
  ],
  deadWeight: [
    { name:"Novelty Mugs",    profit:6,  unitsSold:95,  category:"Gifting" },
    { name:"Desk Calendars",  profit:4,  unitsSold:88,  category:"Stationery" },
    { name:"Keychains",       profit:2,  unitsSold:110, category:"Accessories" },
    { name:"Fridge Magnets",  profit:1.8,unitsSold:75,  category:"Gifting" },
    { name:"Wrist Bands",     profit:3,  unitsSold:92,  category:"Accessories" }
  ]
};
