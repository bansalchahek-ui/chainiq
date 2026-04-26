import { Shipment, Coords } from '../constants/mockData';

export type WeatherData = {
  condition: string;
  precipMm: number;
  windspeedKmh: number;
  forecastDate: string;
};

export const interpolateCoords = (origin: Coords, dest: Coords, progressPct: number): Coords => {
  const pct = Math.min(Math.max(progressPct, 0), 100) / 100;
  return {
    lat: origin.lat + (dest.lat - origin.lat) * pct,
    lon: origin.lon + (dest.lon - origin.lon) * pct
  };
};

export const getWMOString = (code: number): string => {
  if (code <= 1) return "clear";
  if (code <= 3) return "cloudy";
  if (code >= 51 && code <= 57) return "rain";
  if (code >= 61 && code <= 67) return "heavy rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 85 && code <= 86) return "snow";
  if (code >= 95 && code <= 99) return "storm";
  return "cloudy";
};

async function fetchForecastWeather(lat: number, lon: number, daysFromNow: number): Promise<WeatherData> {
  try {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    const dateStr = date.toISOString().split('T')[0];

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,precipitation_sum,windspeed_10m_max&forecast_days=16&timezone=auto`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    
    const index = data.daily.time.findIndex((t: string) => t === dateStr) || 0;
    const wcode = data.daily.weathercode[index] ?? 2;
    const precip = data.daily.precipitation_sum[index] ?? 0;
    const wind = data.daily.windspeed_10m_max[index] ?? 0;

    let condition = getWMOString(wcode);
    
    // Additional bumps
    if (precip > 20 && condition !== 'storm') {
       if (condition === 'clear' || condition === 'cloudy') condition = 'rain';
       else if (condition === 'rain') condition = 'heavy rain';
       else if (condition === 'heavy rain') condition = 'storm';
    }
    if (wind > 60 && condition !== 'storm') {
       if (condition === 'clear' || condition === 'cloudy') condition = 'cloudy'; // or worse
       // simplify: just worsen
       if (condition === 'heavy rain') condition = 'storm';
       else condition = 'storm'; // just bump it highly if wind > 60
    }

    return { condition, precipMm: precip, windspeedKmh: wind, forecastDate: dateStr };
  } catch (err) {
    // Fallback if failed
    return { condition: "cloudy", precipMm: 0, windspeedKmh: 10, forecastDate: new Date().toISOString().split('T')[0] };
  }
}

export type ShipmentWeather = {
  origin: WeatherData;
  route: WeatherData;
  dest: WeatherData;
};

export const fetchAllWeatherForShipment = async (shipment: Shipment): Promise<ShipmentWeather> => {
  const etaDays = Math.max(1, Math.ceil(shipment.etaHours / 24));
  const routeDays = Math.floor(etaDays / 2);
  
  const currentCoords = interpolateCoords(shipment.coords.origin, shipment.coords.destination, shipment.progressPct);

  const [originW, routeW, destW] = await Promise.all([
    fetchForecastWeather(shipment.coords.origin.lat, shipment.coords.origin.lon, 0),
    fetchForecastWeather(currentCoords.lat, currentCoords.lon, routeDays),
    fetchForecastWeather(shipment.coords.destination.lat, shipment.coords.destination.lon, etaDays)
  ]);

  return {
    origin: originW,
    route: routeW,
    dest: destW
  };
};
