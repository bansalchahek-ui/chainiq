import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Shipment, SUPPLIERS, GEOPOLITICAL_DATA, WAREHOUSE } from '../constants/mockData';
import { runDecisionPipeline } from '../utils/decisionEngine';
import { DecisionCard } from './DecisionCard';
import { RiskBreakdown } from './RiskBreakdown';
import { explainRisk } from '../utils/geminiClient';
import { interpolateCoords, ShipmentWeather } from '../utils/weatherForecast';
import { SignalScores } from '../utils/riskEngine';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});


type Props = {
  shipments: Shipment[];
  weatherData: Record<string, ShipmentWeather>;
  scoresData: Record<string, SignalScores>;
  selectedShipmentId: string | null;
  onSelectShipment: (id: string | null) => void;
  onTriggerDisruption: () => void;
  onReroute: (id: string, customMsg?: string, saving?: number) => void;
};

const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); transition: background-color 0.5s ease;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
};

export const MapPanel: React.FC<Props> = ({ shipments, weatherData, scoresData, selectedShipmentId, onSelectShipment, onTriggerDisruption, onReroute }) => {
  const [explainText, setExplainText] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const explainRef = useRef<HTMLDivElement>(null);

  const selectedShipment = shipments.find(s => s.id === selectedShipmentId) || null;

  useEffect(() => {
    setExplainText("");
  }, [selectedShipmentId]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ON_TIME': return '#00d4aa';
      case 'AT_RISK': return '#ffa502';
      case 'DISRUPTED': return '#ff4757';
      case 'REROUTED': return '#378add';
      default: return '#a0a3b1';
    }
  };

  const isBadWeather = (cond: string) => cond.includes('rain') || cond.includes('snow') || cond.includes('storm') || cond.includes('sandstorm');

  const handleExplain = async () => {
    if (!selectedShipment) return;
    const weather = weatherData[selectedShipment.id];
    const scores = scoresData[selectedShipment.id];
    if (!weather || !scores) return;

    setIsExplaining(true);
    setExplainText("");
    

    const mockDecisions = runDecisionPipeline(selectedShipment, WAREHOUSE, shipments);
    const supplier = SUPPLIERS[selectedShipment.supplierKey];

    const etaDays = Math.max(1, Math.ceil(selectedShipment.etaHours / 24));
    const routeDays = Math.floor(etaDays / 2);

    const fullText = await explainRisk(
      selectedShipment, scores, weather.dest.condition, weather.route.condition, weather.origin.condition,
      GEOPOLITICAL_DATA[supplier.country]?.reason || "N/A", supplier.country, supplier,
      weather.dest.forecastDate, routeDays, mockDecisions
    );

    const words = fullText.split(' ');
    let currentIdx = 0;
    
    // Smooth 40ms typing animation
    const typeInterval = setInterval(() => {
      if (currentIdx < words.length) {
        setExplainText((prev) => prev + (prev ? ' ' : '') + words[currentIdx]);
        currentIdx++;
        if (explainRef.current) explainRef.current.scrollTop = explainRef.current.scrollHeight;
      } else {
        clearInterval(typeInterval);
        setIsExplaining(false);
      }
    }, 40);
  };

  const getAlternateRoute = (id: string) => {
    if (id === 'S001') return { msg: "Via NH-48 bypassing Indore Hub — avoids storm corridor", imp: "+6h", save: 2950 };
    if (id === 'S002') return { msg: "Via Singapore hub instead of Colombo — avoids Bay of Bengal storm", imp: "+8h", save: 1400 };
    if (id === 'S003') return { msg: "Sea freight via Kochi port instead of air via Hyderabad — avoids sandstorm window", imp: "+12h", save: 890 };
    if (id === 'S004') return { msg: "Air freight via Chennai International — avoids sea route storm", imp: "-24h", save: 780 };
    if (id === 'S005') return { msg: "Via Istanbul hub instead of Tehran — lower geopolitical risk", imp: "-8h", save: 3200 };
    return { msg: "Standard alternate route available", imp: "0h", save: 500 };
  };

  const getTopTwoSignals = (scores: SignalScores) => {
    const list = [
      { name: "Weather at destination", val: scores.weatherDest },
      { name: "Weather on route", val: scores.weatherRoute },
      { name: "Weather at origin", val: scores.weatherOrigin },
      { name: "Delay", val: scores.delay },
      { name: "Geopolitical risk", val: scores.geopolitical },
      { name: "Tariff exposure", val: scores.tariff },
      { name: "Supplier reliability", val: scores.reliability },
      { name: "Financial risk", val: scores.financial },
      { name: "Political instability", val: scores.politics }
    ];
    return list.sort((a, b) => b.val - a.val).slice(0, 2);
  };

  const isRiskIncreasing = (s: Shipment) => s.delayHours > 3 || s.status === 'DISRUPTED';

  return (
    <div className="map-expanded-layout">
      
      {/* 65% Map */}
      <div className="map-left">
        <MapContainer center={[20, 80]} zoom={4} style={{ height: '100%', width: '100%', background: '#0f1117' }} zoomControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {shipments.map(s => {
            const coords = interpolateCoords(s.coords.origin, s.coords.destination, s.progressPct);
            return (
              <Marker 
                key={s.id} 
                position={[coords.lat, coords.lon]} 
                icon={createColoredIcon(getStatusColor(s.status))}
                eventHandlers={{ click: () => onSelectShipment(s.id) }}
              />
            );
          })}
          {selectedShipment && (
             <RecenterMap lat={interpolateCoords(selectedShipment.coords.origin, selectedShipment.coords.destination, selectedShipment.progressPct).lat} lng={interpolateCoords(selectedShipment.coords.origin, selectedShipment.coords.destination, selectedShipment.progressPct).lon} />
          )}
        </MapContainer>

        <button 
          onClick={onTriggerDisruption}
          style={{
            position: 'absolute', top: '16px', right: '16px', zIndex: 1000,
            background: '#ff4757', color: '#fff', border: 'none', padding: '8px 16px',
            borderRadius: '4px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,71,87,0.3)',
            transition: 'transform 0.1s'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          🔴 Trigger Disruption (S002)
        </button>
      </div>

      {/* 35% Sidebar */}
      <div className="map-right">
        
        {/* Shipment Selector list (Top) */}
        <div style={{ padding: '16px', borderBottom: '1px solid #2a2d3a', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', flexShrink: 0 }}>
           <h3 style={{ margin: 0, fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>Select Shipment</h3>
           {shipments.map(s => (
             <div 
               key={s.id}
               onClick={() => onSelectShipment(s.id)}
               style={{ 
                 padding: '8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                 background: selectedShipmentId === s.id ? '#22263a' : 'transparent',
                 border: `1px solid ${selectedShipmentId === s.id ? '#00d4aa' : 'transparent'}`,
                 transition: 'all 0.2s'
               }}
             >
               <span style={{ fontSize: '13px', color: '#fff' }}>{s.id}</span>
               <span style={{ fontSize: '11px', color: getStatusColor(s.status), fontWeight: 600 }}>{s.status?.replace('_', ' ')}</span>
             </div>
           ))}
        </div>

        {/* Selected Shipment Drawer */}
        <div className="scrollable-panel" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!selectedShipment && (
            <div style={{ color: '#a0a3b1', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>Select a shipment from the map or list to view details.</div>
          )}

          {selectedShipment && scoresData[selectedShipment.id] && weatherData[selectedShipment.id] && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{selectedShipment.product}</div>
                  <div style={{ fontSize: '12px', color: '#a0a3b1' }}>{selectedShipment.origin} → {selectedShipment.destination}</div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: getStatusColor(selectedShipment.status), fontFamily: 'monospace' }}>
                  {scoresData[selectedShipment.id].total}
                </div>
              </div>

              {/* 🔮 Predicted Disruption Risk */}
              {scoresData[selectedShipment.id].total >= 35 && (
                <div style={{ background: '#2a0f0f', borderLeft: '3px solid #ff4757', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', color: '#fff', fontWeight: 600 }}>🔮 Predicted Risk in 24h</h4>
                    <span style={{ fontSize: '11px', color: isRiskIncreasing(selectedShipment) ? '#ff4757' : '#a0a3b1', fontWeight: 600 }}>
                      {isRiskIncreasing(selectedShipment) ? '↑ Increasing' : '→ Stable'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#a0a3b1', fontStyle: 'italic' }}>
                    Predicted {Math.floor(selectedShipment.etaHours)}h before arrival at {selectedShipment.destination.split(',')[0]}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    {getTopTwoSignals(scoresData[selectedShipment.id]).map(sig => (
                      <div key={sig.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#fff' }}>
                        <span>• {sig.name}</span>
                        <span style={{ color: '#ff4757', fontWeight: 600 }}>{sig.val}/100</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weather Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📍</span> <span style={{ color: '#a0a3b1' }}>Origin: {weatherData[selectedShipment.id].origin.condition}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🛣</span> <span style={{ color: '#a0a3b1' }}>Route: {weatherData[selectedShipment.id].route.condition}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📦</span> 
                  <span style={{ 
                    color: isBadWeather(weatherData[selectedShipment.id].dest.condition) ? (weatherData[selectedShipment.id].dest.condition.includes('heavy') || weatherData[selectedShipment.id].dest.condition.includes('storm') ? '#ff4757' : '#ffa502') : '#a0a3b1',
                    fontWeight: isBadWeather(weatherData[selectedShipment.id].dest.condition) ? 600 : 400
                  }}>
                    Delivery: {weatherData[selectedShipment.id].dest.condition} {isBadWeather(weatherData[selectedShipment.id].dest.condition) && '⚠'}
                  </span>
                </div>
              </div>

              {/* 8-bar Risk Breakdown Chart */}
              <div style={{ background: '#22263a', padding: '12px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>Risk Breakdown</h3>
                <RiskBreakdown scores={scoresData[selectedShipment.id]} />
              </div>

              {/* Decisions block */}
              <div>
                <h3 style={{ fontSize: '11px', color: '#a0a3b1', margin: '0 0 12px 0', textTransform: 'uppercase' }}>System Decisions</h3>
                {runDecisionPipeline(selectedShipment, WAREHOUSE, shipments).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {runDecisionPipeline(selectedShipment, WAREHOUSE, shipments).map((d, i) => (
                      <DecisionCard key={i} decision={d} />
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>No active interventions needed.</div>
                )}
              </div>

              {/* Alternate Route Suggestion (if risk >= 55) */}
              {scoresData[selectedShipment.id].total >= 55 && (
                <div style={{ border: '1px solid #00d4aa', background: 'rgba(0, 212, 170, 0.05)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', color: '#00d4aa', fontWeight: 600 }}>🛣 Recommended Alternate Route</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#fff', lineHeight: 1.5 }}>
                    {getAlternateRoute(selectedShipment.id).msg} <br/>
                    <span style={{ color: '#a0a3b1' }}>· ETA impact: {getAlternateRoute(selectedShipment.id).imp}</span><br/>
                    <span style={{ color: '#00d4aa', fontWeight: 600 }}>· Saves: ${getAlternateRoute(selectedShipment.id).save.toLocaleString()}</span>
                  </p>

                  <div style={{ background: '#0f1117', padding: '12px', borderRadius: '6px', borderLeft: '2px solid #378add', fontSize: '11px', color: '#a0a3b1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>💰 Cost of Delay: ${(selectedShipment.costPerHourDelay * selectedShipment.delayHours).toLocaleString()} vs Expedite Premium: ${(selectedShipment.expediteRouteCost - selectedShipment.baseRouteCost).toLocaleString()}</div>
                    <div style={{ color: '#00d4aa', fontWeight: 600 }}>Net saving if rerouted: ${getAlternateRoute(selectedShipment.id).save.toLocaleString()} — Auto-approved ✓</div>
                  </div>

                  <button 
                    onClick={() => onReroute(selectedShipment.id, getAlternateRoute(selectedShipment.id).msg, getAlternateRoute(selectedShipment.id).save)}
                    disabled={selectedShipment.status === 'REROUTED'}
                    style={{ 
                      background: selectedShipment.status === 'REROUTED' ? '#22263a' : '#00d4aa', 
                      color: selectedShipment.status === 'REROUTED' ? '#00d4aa' : '#0f1117', 
                      border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 600, 
                      cursor: selectedShipment.status === 'REROUTED' ? 'default' : 'pointer', transition: 'all 0.2s' 
                    }}
                  >
                    {selectedShipment.status === 'REROUTED' ? '✓ Route Accepted' : '✓ Accept Route'}
                  </button>
                </div>
              )}

              {/* AI Explain Block */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                <button 
                  onClick={handleExplain}
                  disabled={isExplaining}
                  style={{
                    background: 'transparent', border: '1px solid #00d4aa', color: '#00d4aa',
                    padding: '12px', borderRadius: '4px', cursor: isExplaining ? 'not-allowed' : 'pointer',
                    fontWeight: 600, transition: 'all 0.2s', opacity: isExplaining ? 0.5 : 1
                  }}
                >
                  ✨ Explain with AI
                </button>
                {(explainText || isExplaining) && (
                  <div ref={explainRef} style={{
                    background: '#0f1117', padding: '16px', borderRadius: '8px', fontSize: '13px',
                    color: '#fff', lineHeight: 1.6, border: '1px solid #2a2d3a', maxHeight: '200px', overflowY: 'auto'
                  }}>
                    {explainText}
                    {isExplaining && <span style={{ display: 'inline-block', width: '4px', height: '14px', background: '#00d4aa', animation: 'blink 1s step-end infinite', marginLeft: '4px', verticalAlign: 'middle' }} />}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
};
