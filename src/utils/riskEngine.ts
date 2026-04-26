import { GEOPOLITICAL_DATA, SUPPLIERS, Shipment } from '../constants/mockData';

export const weatherScore = (condition: string): number => {
  switch (condition.toLowerCase()) {
    case 'clear': return 0;
    case 'cloudy': return 10;
    case 'rain': return 40;
    case 'heavy rain': return 70;
    case 'snow': return 80;
    case 'sandstorm': return 75;
    case 'storm': return 90;
    default: return 10;
  }
};

export const delayScore = (hours: number): number => {
  if (hours <= 0) return 0;
  if (hours < 1) return 15;
  if (hours <= 2) return 35;
  if (hours <= 4) return 55;
  if (hours <= 6) return 75;
  return 95;
};

export const geopoliticalScore = (country: string): number => {
  return GEOPOLITICAL_DATA[country]?.riskLevel || 50;
};

export const tariffScore = (pct: number): number => {
  if (pct <= 0) return 0;
  if (pct < 5) return 15;
  if (pct <= 10) return 35;
  if (pct <= 15) return 55;
  if (pct <= 20) return 70;
  return 90;
};

export const reliabilityScore = (score: number): number => {
  return 100 - score;
};

export const financialScore = (rating: string): number => {
  switch (rating) {
    case 'AAA': return 0;
    case 'AA': return 10;
    case 'A': return 20;
    case 'BBB': return 35;
    case 'BB': return 55;
    case 'B': return 75;
    case 'CCC': return 90;
    default: return 50;
  }
};

export const politicsScore = (stability: string): number => {
  switch (stability) {
    case 'stable': return 0;
    case 'moderate': return 30;
    case 'unstable': return 65;
    case 'critical': return 90;
    default: return 30;
  }
};

export const getSupplierRiskPillScore = (supplier: any): number => {
  const fScore = financialScore(supplier.financialRating);
  const pScore = politicsScore(supplier.politicsStability);
  const geoScore = geopoliticalScore(supplier.country);
  
  // simple average or scaled sum (weighting similar to overall risk)
  // Let's do a weighted score out of 100 based on the 3 signals.
  // In riskEngine: geopolitical=15%, financial=5%, politics=5% (total 25% weights)
  // Relative weights: geo=60%, fin=20%, pol=20%
  const total = (geoScore * 0.6) + (fScore * 0.2) + (pScore * 0.2);
  return Math.round(total);
};

export type SignalScores = {
  weatherDest: number;
  weatherRoute: number;
  weatherOrigin: number;
  delay: number;
  geopolitical: number;
  tariff: number;
  reliability: number;
  financial: number;
  politics: number;
  total: number;
};

export const calculateRisk = (
  shipment: Shipment,
  weatherDest: string,
  weatherRoute: string,
  weatherOrigin: string
): SignalScores => {
  const supplier = SUPPLIERS[shipment.supplierKey];
  const originCountry = supplier.country;

  const wDest = weatherScore(weatherDest);
  const wRoute = weatherScore(weatherRoute);
  const wOrigin = weatherScore(weatherOrigin);
  const dScore = delayScore(shipment.delayHours);
  const gScore = geopoliticalScore(originCountry);
  const tScore = tariffScore(supplier.tariffPct);
  const rScore = reliabilityScore(supplier.reliability);
  const fScore = financialScore(supplier.financialRating);
  const pScore = politicsScore(supplier.politicsStability);

  const risk = (
    wDest * 0.20 +
    wRoute * 0.10 +
    wOrigin * 0.05 +
    dScore * 0.20 +
    gScore * 0.15 +
    tScore * 0.10 +
    rScore * 0.10 +
    fScore * 0.05 +
    pScore * 0.05
  );

  return {
    weatherDest: wDest,
    weatherRoute: wRoute,
    weatherOrigin: wOrigin,
    delay: dScore,
    geopolitical: gScore,
    tariff: tScore,
    reliability: rScore,
    financial: fScore,
    politics: pScore,
    total: Math.round(risk)
  };
};

export const getStatusFromScore = (score: number): string => {
  if (score < 35) return 'ON_TIME';
  if (score < 55) return 'AT_RISK';
  return 'DISRUPTED';
};
