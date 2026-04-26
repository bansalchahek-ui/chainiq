import { GEMINI_KEY } from '../config';
import { Shipment } from '../constants/mockData';
import { SignalScores } from './riskEngine';

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=`;

console.log('Gemini key length:', GEMINI_KEY.length);

export const callGemini = async (prompt: string): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${API_URL}${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error('Gemini API Error');
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error(error);
    return "Error generating response. Please try again.";
  }
};

export const explainRisk = async (
  shipment: Shipment,
  signals: SignalScores,
  destCond: string,
  routeCond: string,
  originCond: string,
  gdeltReason: string,
  country: string,
  supplier: any,
  forecastDate: string,
  midDay: number,
  decisions: any[]
): Promise<string> => {
  const prompt = `
  You are ChainIQ, an intelligent supply chain assistant.
  A supply chain manager needs to understand what just happened.

  SHIPMENT: ${shipment.id} | ${shipment.product} | ${shipment.quadrant} | ${shipment.origin}→${shipment.destination}
  RISK SCORE: ${signals.total}/100
  DELAY: ${shipment.delayHours}h

  SIGNAL BREAKDOWN:
  - Weather at destination (${forecastDate}): ${destCond} → score ${signals.weatherDest}
  - Weather en route (Day ${midDay}): ${routeCond} → score ${signals.weatherRoute}
  - Weather at origin (today): ${originCond} → score ${signals.weatherOrigin}
  - Delay hours (${shipment.delayHours}h): score ${signals.delay}
  - Geopolitical risk (${country}): ${gdeltReason} → score ${signals.geopolitical}
  - Tariff on route (${supplier.tariffPct}%): score ${signals.tariff}
  - Supplier reliability (${supplier.reliability}/100): score ${signals.reliability}
  - Financial rating (${supplier.financialRating}): score ${signals.financial}
  - Political stability (${supplier.politicsStability}): score ${signals.politics}

  SYSTEM DECISIONS: ${JSON.stringify(decisions)}

  Write a plain-English explanation in exactly 5 sentences:
  1. What is happening right now?
  2. What is the business risk if we do nothing?
  3. What did the system do, and why?
  4. What is the financial impact in dollars?
  5. What should the manager do next?

  Rules: No jargon. No bullet points. No headers.
  Use the shipment ID, product name, and dollar amounts.
  Sound confident — the system has this under control.
  Return only the 5 sentences, nothing else.
  `;

  const raw = await callGemini(prompt);
  if (raw.includes("Error generating response")) {
    return `${shipment.id} is at risk due to ${destCond.includes('rain') ? 'heavy rain' : destCond} forecast at ${shipment.destination.split(',')[0]} on arrival date and a ${shipment.delayHours.toFixed(1)}h delay. Auto-reroute recommended.`;
  }
  return raw;
};

export const rankSuppliers = async (suppliers: any[], preference: string): Promise<any[]> => {
  const prompt = `
  You are a supply chain AI ranking suppliers for an e-commerce retailer
  optimising for ${preference} (cost | speed | quality).

  SUPPLIERS:
  ${suppliers.map((s: any) => `
    ${s.name} (${s.country}):
    Tariff: ${s.tariffPct}% | ETA: ${s.etaDays} days |
    Quality: ${s.qualityScore}/100 | Cost: $${s.costPerUnit}/unit |
    Reliability: ${s.reliability}/100 | Financial: ${s.financialRating} |
    Politics: ${s.politicsStability}
    News: ${s.news}
  `).join('\n')}

  Return a JSON array ranked 1–5. Each item:
  { "rank": number, "name": "string", "score": number, "one_line_reason": "string" }
  Return ONLY valid JSON. No markdown. No backticks. No explanation.
  `;

  const raw = await callGemini(prompt);
  try {
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse gemini JSON', raw);
    const pref = preference.toLowerCase();
    const sorted = [...suppliers].sort((a, b) => {
      if (pref.includes('cost')) return a.costPerUnit - b.costPerUnit;
      if (pref.includes('speed')) return a.etaDays - b.etaDays;
      return b.qualityScore - a.qualityScore;
    });
    return sorted.map((s, i) => ({
      rank: i + 1,
      name: s.name,
      score: 95 - (i * 5),
      one_line_reason: "Fallback strategy generated locally."
    }));
  }
};

export const productStrategy = async (products: any): Promise<any> => {
  const prompt = `
  You are a retail supply chain strategist.
  Given these product quadrants for an e-commerce business,
  give one specific actionable recommendation per quadrant.

  Stars: ${products.stars.map((p:any)=>p.name).join(', ')}
  Hidden Gems: ${products.hiddenGems.map((p:any)=>p.name).join(', ')}
  Volume Drivers: ${products.volumeDrivers.map((p:any)=>p.name).join(', ')}
  Dead Weight: ${products.deadWeight.map((p:any)=>p.name).join(', ')}

  Return ONLY this JSON, no markdown, no backticks:
  {
    "stars": "one actionable sentence",
    "hidden_gems": "one actionable sentence",
    "volume_drivers": "one actionable sentence",
    "dead_weight": "one actionable sentence"
  }
  `;

  const raw = await callGemini(prompt);
  try {
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    // Map snake_case to camelCase if needed, as ProductMatrix uses camelCase
    return {
      stars: parsed.stars || "Prioritise stock levels and expedite delayed Electronics shipments immediately.",
      hiddenGems: parsed.hidden_gems || parsed.hiddenGems || "Increase marketing spend to grow demand for high-margin products.",
      volumeDrivers: parsed.volume_drivers || parsed.volumeDrivers || "Negotiate bulk supplier discounts to improve margins.",
      deadWeight: parsed.dead_weight || parsed.deadWeight || "Consider discontinuing or bundling with star products to clear stock."
    };
  } catch (err) {
    console.error('Failed to parse gemini JSON', raw);
    return {
      stars: "Prioritise stock levels and expedite delayed Electronics shipments immediately.",
      hiddenGems: "Increase marketing spend to grow demand for high-margin products.",
      volumeDrivers: "Negotiate bulk supplier discounts to improve margins.",
      deadWeight: "Consider discontinuing or bundling with star products to clear stock."
    };
  }
};

export const productSpecificStrategy = async (
  name: string, category: string, quadrant: string, profit: number, unitsSold: number,
  shipmentId: string, shipmentStatus: string, riskScore: number, delayHours: number,
  origin: string, destination: string, top2Signals: string,
  supplierName: string, supplierCountry: string, flag: string,
  reliability: number, financialRating: string, politicsStability: string,
  tariffPct: number, etaDays: number, costPerUnit: number, supplierNews: string,
  otherSuppliers: any[], hardcodedAlternateRoute: string
): Promise<any> => {
  const prompt = `
  You are a supply chain strategist for a retail 
  e-commerce business. Provide a deeply tailored 
  strategy for this specific product.

  PRODUCT DETAILS:
    Name: ${name}
    Category: ${category}
    Quadrant: ${quadrant} 
    Profit per unit: $${profit}
    Units sold (30 days): ${unitsSold}
    Total monthly revenue: $${profit * unitsSold}

  CURRENT SUPPLY CHAIN STATUS:
    Active shipment: ${shipmentId} — ${shipmentStatus}
    Current risk score: ${riskScore}/100
    Delay: ${delayHours}h
    Route: ${origin} → ${destination}
    Top risk signals: ${top2Signals}

  CURRENT SUPPLIER:
    Name: ${supplierName}, ${supplierCountry} ${flag}
    Reliability: ${reliability}/100
    Financial rating: ${financialRating}
    Political stability: ${politicsStability}
    Tariff on route: ${tariffPct}%
    Lead time: ${etaDays} days
    Cost per unit: $${costPerUnit}
    Current news: ${supplierNews}

  ALTERNATIVE SUPPLIERS AVAILABLE:
  ${otherSuppliers.map(s => `
    - ${s.name} (${s.country}): 
      Tariff ${s.tariffPct}%, ETA ${s.etaDays}d, 
      Cost $${s.costPerUnit}/unit, 
      Reliability ${s.reliability}/100,
      Financial: ${s.financialRating},
      Politics: ${s.politicsStability}
  `).join('')}

  ALTERNATE ROUTES AVAILABLE:
  ${hardcodedAlternateRoute}

  Provide exactly this JSON structure — be SPECIFIC 
  to this product, this supplier, and these numbers:

  {
    "immediate": {
      "title": "specific action title",
      "detail": "specific 2-sentence action mentioning the actual delay hours and risk score"
    },
    "shortTerm": {
      "title": "specific optimization title", 
      "detail": "specific 2-sentence optimization"
    },
    "longTerm": {
      "title": "strategic move title",
      "detail": "specific 2-sentence strategy"
    },
    "supplierRecommendation": {
      "action": "keep" | "switch" | "dual-source",
      "recommendedSupplier": "supplier name or null",
      "reason": "2-sentence explanation using actual tariff %, cost/unit, and reliability numbers from the data above",
      "saving": "estimated annual saving or benefit"
    },
    "routeRecommendation": {
      "action": "keep" | "reroute",
      "suggestedRoute": "specific route description or null if keeping",
      "reason": "1-sentence reason using actual risk signals",
      "etaImpact": "+Xh or -Xh",
      "financialImpact": "$X,XXX saved or cost"
    }
  }

  Rules:
  - Use actual numbers from the data — never say "significant" or "substantial", say "$1,240" or "14 days"
  - If current supplier is reliable and low risk, recommend keeping them
  - If risk score > 55, strongly recommend reroute
  - If supplier has unstable politics or BB rating, recommend switching with specific alternative
  - Return ONLY valid JSON, no markdown, no backticks
  `;

  const raw = await callGemini(prompt);
  try {
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return {
      immediate: { title: "Expedite Inventory Check", detail: `Immediately verify stock levels for ${name} across all regional hubs.` },
      shortTerm: { title: "Reroute Shipments", detail: `Divert existing shipments of ${category} around current disruptions.` },
      longTerm: { title: "Supplier Diversification", detail: `Reduce reliance on ${supplierCountry} by onboarding a secondary supplier.` },
      supplierRecommendation: { action: "keep", recommendedSupplier: null, reason: "Fallback logic executed.", saving: "$0" },
      routeRecommendation: { action: "keep", suggestedRoute: null, reason: "Fallback logic executed.", etaImpact: "0h", financialImpact: "$0" }
    };
  }
};

export const findAlternativeSupplier = async (
  name: string, country: string, reasons: string, products: string, cost: number, eta: number, otherSuppliers: any[]
): Promise<any> => {
  const prompt = `
  A supply chain manager needs an alternative to this 
  supplier due to risk factors.
  
  Current supplier: ${name}, ${country}
  Risk reasons: ${reasons}
  Products supplied: ${products}
  Current cost/unit: $${cost}
  Current ETA: ${eta} days
  
  From this list of available suppliers, recommend 
  the best alternative and explain why in 2 sentences:
  ${JSON.stringify(otherSuppliers)}
  
  Return JSON: 
  { 
    "recommended": "supplier name",
    "reason": "two sentence explanation",
    "tradeoff": "one sentence on what you give up"
  }
  Return only valid JSON, no markdown.
  `;

  const raw = await callGemini(prompt);
  try {
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    const bestAlt = otherSuppliers.sort((a,b)=> b.reliability - a.reliability)[0];
    return {
      recommended: bestAlt.name,
      reason: `Automatically selected ${bestAlt.name} based on having the highest available reliability score. AI generation was unavailable.`,
      tradeoff: `Cost may increase to $${bestAlt.costPerUnit} per unit.`
    };
  }
};

export const composeEmail = async (
  type: 'cancel' | 'reroute' | 'newOrder',
  supplierName: string,
  supplierCountry: string,
  productNames: string[],
  shipmentId: string,
  riskScore: number,
  delayHours: number,
  top2RiskSignals: string,
  alternateRoute?: string,
  financialImpact?: string,
  unitsInShipment?: number,
  costPerUnit?: number,
  etaDays?: number
): Promise<{ subject: string; body: string }> => {
  let prompt = "";
  if (type === 'cancel') {
    prompt = `You are a professional supply chain manager writing a formal business email.
Write a cancellation email with these details:
  To: ${supplierName}, ${supplierCountry}
  Product: ${productNames.join(', ')}
  Shipment ID: ${shipmentId}
  Reason: Supply chain disruption detected
  Risk Score: ${riskScore}/100
  Current delay: ${delayHours}h
  Disruption cause: ${top2RiskSignals}
Email must: Be professional, clearly state cancellation, reference ID, mention reason, request confirmation, offer to resume later, include placeholder [YOUR NAME] and [YOUR COMPANY].
Return JSON: {"subject": "...", "body": "..."} Return only valid JSON, no markdown, no backticks.`;
  } else if (type === 'reroute') {
    prompt = `You are a professional logistics coordinator writing a formal reroute request email.
Write a rerouting request email with these details:
  To: ${supplierName} / Logistics Provider
  Shipment ID: ${shipmentId}
  Product: ${productNames.join(', ')}
  Reason: ${top2RiskSignals}
  Risk Score: ${riskScore}/100
  Current delay: ${delayHours}h
  Suggested alternate route: ${alternateRoute || 'N/A'}
  Estimated saving: ${financialImpact || 'N/A'}
Email must: Be urgent but professional, clearly state new route, provide justification, request confirmation within 4h, include fallback, include placeholder [YOUR NAME] and [YOUR COMPANY].
Return JSON: {"subject": "...", "body": "..."} Return only valid JSON, no markdown, no backticks.`;
  } else {
    prompt = `You are a professional procurement manager writing a new supplier onboarding and order placement email.
Write a new order placement email with these details:
  To: ${supplierName}, ${supplierCountry}
  Products needed: ${productNames.join(', ')}
  Required quantity: ${unitsInShipment || 1000} units
  Target delivery: within ${etaDays || 14} days
  Budget: $${costPerUnit || 5.00}/unit target
Email must: Introduce company, state products/quantities, mention timeline, ask for confirmation, request sample/cert, mention why selected, include placeholder [YOUR NAME] and [YOUR COMPANY].
Return JSON: {"subject": "...", "body": "..."} Return only valid JSON, no markdown, no backticks.`;
  }

  try {
    const response = await fetch(`${API_URL}${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      console.error('Gemini status:', response.status, await response.text());
      throw new Error('Gemini API error');
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (error) {
    console.error('Email generation failed, using fallback', error);
    if (type === 'cancel') {
      return {
        subject: `Order Cancellation Request — Shipment ${shipmentId}`,
        body: `Dear ${supplierName},\n\nWe regret to inform you that due to a supply chain disruption (Risk Score: ${riskScore}/100, Delay: ${delayHours}h), we must cancel shipment ${shipmentId} for ${productNames.join(', ')}.\n\nPlease confirm cancellation at your earliest convenience.\n\nBest regards,\n[YOUR NAME]\n[YOUR COMPANY]`
      };
    } else if (type === 'reroute') {
      return {
        subject: `Urgent Reroute Request — Shipment ${shipmentId}`,
        body: `Dear ${supplierName},\n\nDue to detected disruptions on the current route (Risk: ${riskScore}/100), we urgently request rerouting shipment ${shipmentId} via ${alternateRoute || 'N/A'}.\n\nThis change is estimated to save ${financialImpact || 'N/A'}.\n\nPlease confirm within 4 hours.\n\nBest regards,\n[YOUR NAME]\n[YOUR COMPANY]`
      };
    } else {
      return {
        subject: `New Order Request — ${productNames.join(', ')}`,
        body: `Dear ${supplierName},\n\nWe would like to place a new order for ${unitsInShipment || 1000} units of ${productNames.join(', ')} at $${costPerUnit || 5.00}/unit.\n\nRequired delivery within ${etaDays || 14} days.\n\nPlease confirm availability and pricing.\n\nBest regards,\n[YOUR NAME]\n[YOUR COMPANY]`
      };
    }
  }
};
