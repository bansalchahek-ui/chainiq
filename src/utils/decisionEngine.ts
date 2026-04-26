import { Shipment, GEOPOLITICAL_DATA } from '../constants/mockData';

export type DecisionResult = {
  usp: string;
  action: string;
  approved: boolean;
  urgency?: string;
  confidence?: number;
  financialImpact?: number;
  costOfDelay?: number;
  expeditePremium?: number;
  netSaving?: number;
  displacedShipment?: string | null;
  targetSlot?: string;
};

export const predictiveDecoupling = (shipment: Shipment, gdeltScore: number): DecisionResult | null => {
  const inWindow = shipment.etaHours >= 24 && shipment.etaHours <= 48;
  if (!inWindow || gdeltScore <= 75) return null;

  const autoApprove = shipment.quadrant === "star" || shipment.quadrant === "hidden_gem";
  // mock articleCount and tone based on gdeltScore to calculate confidence
  const articleCount = gdeltScore * 1.5;
  const tone = gdeltScore > 80 ? 0.8 : 0.5;
  const confidence = Math.min(100, Math.round(gdeltScore * 0.5 + (articleCount / 50) * 30 + tone * 20));
  const urgency = gdeltScore >= 90 ? "critical" : gdeltScore >= 80 ? "high" : "medium";

  return {
    usp: "predictive_decoupling",
    action: "reroute",
    approved: autoApprove,
    urgency,
    confidence
  };
};

export const strategicSlotting = (incoming: Shipment, warehouse: any, allShipments: Shipment[]): DecisionResult | null => {
  if (incoming.quadrant !== "star" && incoming.quadrant !== "hidden_gem") return null;
  if (warehouse.capacityPct > 50) return null;

  const blockedDock = warehouse.loadingDocks.find((d: any) => {
    if (d.paperworkStatus !== "bottleneck" || d.dwellHours < 4) return false;
    const occ = allShipments.find(s => s.id === d.occupiedBy);
    if (!occ) {
      // In mock, S099 is the dead weight blocker
      if (d.occupiedBy === "S099") return true;
      return false;
    }
    return occ.quadrant === "dead_weight" || occ.quadrant === "volume_driver";
  });

  if (!blockedDock) return null;

  const deepSlot = warehouse.deepStorage.find((s: any) => !s.occupiedBy);
  if (!deepSlot) return null;

  const displacementOpsCost = 150;
  const revenueSaved = incoming.costPerHourDelay * blockedDock.dwellHours;
  const netBenefit = revenueSaved - displacementOpsCost;

  return {
    usp: "strategic_slotting",
    action: "displace",
    approved: netBenefit > 0,
    financialImpact: netBenefit,
    displacedShipment: blockedDock.occupiedBy,
    targetSlot: deepSlot.slotId
  };
};

export const budgetArbitrage = (shipment: Shipment, projectedDelayHours: number): DecisionResult => {
  const costOfDelay = projectedDelayHours * shipment.costPerHourDelay;
  const expeditePremium = shipment.expediteRouteCost - shipment.baseRouteCost;
  const netSaving = costOfDelay - expeditePremium;

  const financiallyJustified = netSaving > 0;
  const quadrantEligible = shipment.quadrant === "star" || shipment.quadrant === "hidden_gem";

  let action = "hold";
  let approved = false;

  if (financiallyJustified && quadrantEligible) {
    action = "expedite_approved";
    approved = true;
  } else if (financiallyJustified && !quadrantEligible) {
    action = "expedite_approved";
    approved = false; // manual
  } else {
    action = "hold";
    approved = false;
  }

  return {
    usp: "budget_arbitrage",
    action,
    approved,
    costOfDelay,
    expeditePremium,
    netSaving
  };
};

export const runDecisionPipeline = (shipment: Shipment, warehouse: any, allShipments: Shipment[]): DecisionResult[] => {
  const results: DecisionResult[] = [];
  
  // Since originCountry isn't directly on shipment, we look it up or mock
  // but we know S001 is from India, S002 from China, S003 from UAE... 
  // Wait, supplier is attached. Let's assume we map origin country from mock
  // Or just pass originCountry as shipment.origin.
  let gdeltScore = 50;
  if (shipment.origin.includes('Mumbai')) gdeltScore = GEOPOLITICAL_DATA["India"]?.riskLevel || 35;
  if (shipment.origin.includes('Shanghai')) gdeltScore = GEOPOLITICAL_DATA["China"]?.riskLevel || 65;
  if (shipment.origin.includes('Ho Chi Minh')) gdeltScore = GEOPOLITICAL_DATA["Vietnam"]?.riskLevel || 20;
  if (shipment.origin.includes('Frankfurt')) gdeltScore = GEOPOLITICAL_DATA["Germany"]?.riskLevel || 8;
  if (shipment.origin.includes('Dubai')) gdeltScore = 30;

  // DEMO Override: If disruption triggered, gdelt might be higher or delay is higher
  if (shipment.id === "S002" && shipment.delayHours >= 5) {
      gdeltScore = 85; // force high risk
  }

  const decoupling = predictiveDecoupling(shipment, gdeltScore);
  if (decoupling) {
    results.push(decoupling);
    const projectedDelay = shipment.delayHours + shipment.etaHours * 0.15;
    const arbitrage = budgetArbitrage(shipment, projectedDelay);
    results.push(arbitrage);
    if (!arbitrage.approved) {
      decoupling.action = "hold";
    }
  }

  const slotting = strategicSlotting(shipment, warehouse, allShipments);
  if (slotting) {
    results.push(slotting);
  }

  return results;
};
