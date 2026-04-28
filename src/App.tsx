import React, { useState, useEffect } from 'react';
import { MOCK_SHIPMENTS, Shipment, PRODUCTS, ProductPortfolio, WAREHOUSE } from './constants/mockData';
import { EnrouteTracker } from './components/EnrouteTracker';
import { MapPanel } from './components/MapPanel';
import { SupplierRanker } from './components/SupplierRanker';
import { ProductMatrix } from './components/ProductMatrix';
import { DecisionEngineExpanded } from './components/DecisionEngineExpanded';
import { EmailComposer, EmailComposerData } from './components/EmailComposer';
import { fetchAllWeatherForShipment, ShipmentWeather } from './utils/weatherForecast';
import { calculateRisk, getStatusFromScore, SignalScores } from './utils/riskEngine';
import { runDecisionPipeline, DecisionResult } from './utils/decisionEngine';
import DataIntegration from './components/DataIntegration.tsx';

type ActiveView = 'map' | 'supplier' | 'product' | 'decision' | 'integration' | null;

type Alert = {
  id: string;
  time: string;
  message: string;
  impact?: number;
  icon: string;
  decision?: DecisionResult;
  timestamp: number;
};

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [aiRecommendedSupplier, setAiRecommendedSupplier] = useState<string | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>(MOCK_SHIPMENTS);
  const [products, setProducts] = useState<ProductPortfolio>(PRODUCTS);
  const [weatherData, setWeatherData] = useState<Record<string, ShipmentWeather>>({});
  const [scoresData, setScoresData] = useState<Record<string, SignalScores>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [timeStr, setTimeStr] = useState("");

  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [emailComposerData, setEmailComposerData] = useState<EmailComposerData | null>(null);
  const [emailComposerType, setEmailComposerType] = useState<'cancel' | 'reroute' | 'newOrder'>('cancel');
  
  const [isSlottingExecuted, setIsSlottingExecuted] = useState(false);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch weather on mount
  useEffect(() => {
    const fetchWeather = async () => {
      const wMap: Record<string, ShipmentWeather> = {};
      for (const s of shipments) {
        wMap[s.id] = await fetchAllWeatherForShipment(s);
      }
      setWeatherData(wMap);
    };
    fetchWeather();
  }, []); // eslint-disable-line

  const addAlert = (message: string, icon: string, impact?: number, decision?: DecisionResult) => {
    setAlerts(prev => {
      // Deduplicate: check if same message within last 5 seconds
      const now = Date.now();
      const isDuplicate = prev.some(a => a.message === message && (now - a.timestamp) < 5000);
      if (isDuplicate) return prev;
      
      return [{
        id: Math.random().toString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timestamp: now,
        message, icon, impact, decision
      }, ...prev];
    });
  };

  const evaluateShipments = (currentShipments: Shipment[], weatherMap: Record<string, ShipmentWeather>) => {
    const sMap: Record<string, SignalScores> = {};
    const newShipments = currentShipments.map(s => {
      if (!weatherMap[s.id]) return s;
      const w = weatherMap[s.id];
      const scores = calculateRisk(s, w.dest.condition, w.route.condition, w.origin.condition);
      sMap[s.id] = scores;

      if (s.status !== 'REROUTED') {
         return { ...s, status: getStatusFromScore(scores.total) };
      }
      return s;
    });

    setScoresData(sMap);
    setShipments(newShipments);
    return newShipments;
  };

  // 30s cycle
  useEffect(() => {
    if (Object.keys(weatherData).length === 0) return;
    evaluateShipments(shipments, weatherData);

    const interval = setInterval(() => {
      setShipments(prev => {
        const updated = prev.map(s => {
           if (s.status === 'REROUTED') return s;
           let newDelay = s.delayHours + (Math.random() * 0.4 - 0.2);
           if (newDelay < 0) newDelay = 0;
           let newPct = s.progressPct + 0.5;
           if (newPct > 100) newPct = 100;
           return { ...s, delayHours: newDelay, progressPct: newPct };
        });
        evaluateShipments(updated, weatherData);
        return updated;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [weatherData]); // eslint-disable-line

  const handleTriggerDisruption = () => {
    setShipments(prev => {
      const s = prev.find(x => x.id === 'S002');
      if (s) {
        const next = prev.map(x => x.id === 'S002' ? { ...x, delayHours: 5.5 } : x);
        if (weatherData[s.id]) {
           const newW = { ...weatherData };
           newW[s.id] = { ...newW[s.id], dest: { ...newW[s.id].dest, condition: 'storm' } };
           setWeatherData(newW);
           const finalShips = evaluateShipments(next, newW);
           const decisions = runDecisionPipeline(finalShips.find(x => x.id === 'S002')!, WAREHOUSE, finalShips);
           addAlert("S002 critical delay detected. Triggering cascade.", "🔴");
           decisions.forEach(d => {
             addAlert(`Cascade: ${d.action.toUpperCase()} - ${d.usp.replace(/_/g, ' ').toUpperCase()}`, d.approved ? "🟢" : "🟠", d.netSaving || d.financialImpact, d);
           });
           return finalShips;
        }
        return next;
      }
      return prev;
    });
  };

  const handleReroute = (id: string, customMsg?: string, saving?: number) => {
    setShipments(prev => prev.map(s => {
      if (s.id === id) {
        addAlert(`${s.id} auto-rerouted. ${customMsg ? customMsg : ''}`, "🔵", saving || 0);
        return { ...s, status: 'REROUTED', delayHours: Math.max(0, s.delayHours - 2) };
      }
      return s;
    }));
  };

  const handlePillClick = (id: string) => {
    setSelectedShipmentId(id);
    setActiveView('map');
  };

  const handleOpenEmailComposer = (data: EmailComposerData, type: 'cancel' | 'reroute' | 'newOrder') => {
    setEmailComposerData(data);
    setEmailComposerType(type);
    setEmailComposerOpen(true);
  };

  // OVERVIEW CARDS
  const renderOverviewMode = () => {
    const activeCount = shipments.length;
    const disruptedCount = shipments.filter(s => s.status === 'DISRUPTED').length;
    const atRiskCount = shipments.filter(s => s.status === 'AT_RISK').length;
    const onTimeCount = shipments.filter(s => s.status === 'ON_TIME' || s.status === 'REROUTED').length;

    const totalDelayCost = shipments.reduce((sum, s) => sum + (s.delayHours * s.costPerHourDelay), 0);
    const totalExpeditePremium = shipments.reduce((sum, s) => sum + (s.expediteRouteCost - s.baseRouteCost), 0);
    const netWiggleRoom = totalDelayCost - totalExpeditePremium;

    const autoApprovedCount = shipments.filter(s => {
      const net = (s.delayHours * s.costPerHourDelay) - (s.expediteRouteCost - s.baseRouteCost);
      return net > 0 && (s.quadrant === 'star' || s.quadrant === 'hidden_gem');
    }).length;

    const manualReviewCount = shipments.filter(s => {
      const net = (s.delayHours * s.costPerHourDelay) - (s.expediteRouteCost - s.baseRouteCost);
      return net > 0 && (s.quadrant !== 'star' && s.quadrant !== 'hidden_gem');
    }).length;

    return (
      <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Card 1: Map */}
        <div className="overview-card" style={{ background: '#1a1d26', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🗺</span>
            <span style={{ fontSize: '15px', fontWeight: 500 }}>Shipment Map</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#00d4aa' }}>{activeCount} Active</div>
            <div style={{ fontSize: '13px', color: '#a0a3b1', marginTop: '8px' }}>{disruptedCount} disrupted · {atRiskCount} at risk · {onTimeCount} on time</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              {shipments.slice(0,5).map(s => (
                <div key={s.id} style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.status === 'DISRUPTED' ? '#ff4757' : s.status === 'AT_RISK' ? '#ffa502' : '#00d4aa' }} title={s.id} />
              ))}
            </div>
          </div>
          <button onClick={() => setActiveView('map')} style={{ position: 'absolute', bottom: '24px', right: '24px', background: 'transparent', border: 'none', color: '#00d4aa', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Expand →</button>
        </div>

        {/* Card 2: Supplier */}
        <div className="overview-card" style={{ background: '#1a1d26', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🏭</span>
            <span style={{ fontSize: '15px', fontWeight: 500 }}>Supplier Ranker</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#00d4aa', textAlign: 'center', lineHeight: 1.2 }}>VietFast<br/>Logistics</div>
            <div style={{ fontSize: '13px', color: '#a0a3b1', marginTop: '8px' }}>5 suppliers ranked · Last updated just now</div>
            <div style={{ fontSize: '12px', color: '#fff', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
              <span>1. VietFast Logistics 🇻🇳</span>
              <span style={{ color: '#a0a3b1' }}>2. EuroElite GmbH 🇩🇪</span>
            </div>
          </div>
          <button onClick={() => setActiveView('supplier')} style={{ position: 'absolute', bottom: '24px', right: '24px', background: 'transparent', border: 'none', color: '#00d4aa', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Expand →</button>
        </div>

        {/* Card 3: Product */}
        <div className="overview-card" style={{ background: '#1a1d26', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📦</span>
            <span style={{ fontSize: '15px', fontWeight: 500 }}>Product Portfolio</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#00d4aa', textAlign: 'center', lineHeight: 1.2 }}>{products.stars.length} Stars<br/>{products.hiddenGems.length} Hidden Gems</div>
            <div style={{ fontSize: '13px', color: '#a0a3b1', marginTop: '8px' }}>{(products.stars.length + products.hiddenGems.length + products.volumeDrivers.length + products.deadWeight.length)} SKUs classified · 2 quadrants at supply risk</div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              <span style={{ color: '#00d4aa', fontSize: '12px' }}>● Stars</span>
              <span style={{ color: '#7c5cbf', fontSize: '12px' }}>● Hidden</span>
              <span style={{ color: '#378add', fontSize: '12px' }}>● Volume</span>
              <span style={{ color: '#ff4757', fontSize: '12px' }}>● Dead</span>
            </div>
          </div>
          <button onClick={() => setActiveView('product')} style={{ position: 'absolute', bottom: '24px', right: '24px', background: 'transparent', border: 'none', color: '#00d4aa', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Expand →</button>
        </div>

        {/* Card 4: Decision */}
        <div className="overview-card" style={{ background: '#1a1d26', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <span style={{ fontSize: '15px', fontWeight: 500 }}>Decision Engine</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: netWiggleRoom > 0 ? '#00d4aa' : '#ff4757' }}>Net Wiggle Room: ${netWiggleRoom.toLocaleString()}</div>
            <div style={{ fontSize: '13px', color: '#a0a3b1', marginTop: '8px' }}>{autoApprovedCount} auto-approved · {manualReviewCount} manual review</div>
            <div style={{ fontSize: '12px', color: '#fff', marginTop: '16px' }}>Strategic Slotting: {isSlottingExecuted ? "$2,288 saved" : "$0 saved"}</div>
          </div>
          <button onClick={() => setActiveView('decision')} style={{ position: 'absolute', bottom: '24px', right: '24px', background: 'transparent', border: 'none', color: '#00d4aa', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Expand →</button>
        </div>

        {/* Card 5: Data Integration */}
        <div className="overview-card" style={{ background: '#1a1d26', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🔌</span>
            <span style={{ fontSize: '15px', fontWeight: 500 }}>Data Integration</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#00d4aa', textAlign: 'center' }}>Active</div>
            <div style={{ fontSize: '13px', color: '#a0a3b1', marginTop: '8px' }}>Manual Entry & Bill Capture ready</div>
            <div style={{ fontSize: '12px', color: '#fff', marginTop: '16px', display: 'flex', gap: '8px' }}>
              <span style={{ background: 'rgba(0, 212, 170, 0.1)', color: '#00d4aa', padding: '2px 8px', borderRadius: '4px' }}>JSON</span>
              <span style={{ background: 'rgba(0, 212, 170, 0.1)', color: '#00d4aa', padding: '2px 8px', borderRadius: '4px' }}>CSV</span>
              <span style={{ background: 'rgba(0, 212, 170, 0.1)', color: '#00d4aa', padding: '2px 8px', borderRadius: '4px' }}>API</span>
            </div>
          </div>
          <button onClick={() => setActiveView('integration')} style={{ position: 'absolute', bottom: '24px', right: '24px', background: 'transparent', border: 'none', color: '#00d4aa', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Connect →</button>
        </div>

      </div>
    );
  };

  const renderExpandedView = () => {
    let title = "";
    let content = null;

    if (activeView === 'map') {
      title = "Shipment Map";
      content = <MapPanel shipments={shipments} weatherData={weatherData} scoresData={scoresData} selectedShipmentId={selectedShipmentId} onSelectShipment={setSelectedShipmentId} onTriggerDisruption={handleTriggerDisruption} onReroute={handleReroute} />;
    } else if (activeView === 'supplier') {
      title = "Supplier Ranker";
      content = <SupplierRanker aiRecommendedSupplier={aiRecommendedSupplier} setAiRecommendedSupplier={setAiRecommendedSupplier} onOpenEmailComposer={handleOpenEmailComposer} shipments={shipments} scoresData={scoresData} />;
    } else if (activeView === 'product') {
      title = "Product Portfolio";
      content = <ProductMatrix products={products} activeShipments={shipments} scoresData={scoresData} onReroute={handleReroute} addAlert={addAlert} setAiRecommendedSupplier={setAiRecommendedSupplier} />;
    } else if (activeView === 'decision') {
      title = "Decision Engine";
      content = <DecisionEngineExpanded alerts={alerts} shipments={shipments} addAlert={addAlert} onSlottingExecuted={setIsSlottingExecuted} />;
    } else if (activeView === 'integration') {
      title = "Data Integration Center";
      content = <DataIntegration products={products} setProducts={setProducts} shipments={shipments} weatherData={weatherData} evaluateShipments={evaluateShipments} addAlert={addAlert} />;
    }

    return (
      <div className="smooth-transition" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f1117' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #2a2d3a' }}>
          <button 
            onClick={() => { setActiveView(null); setSelectedShipmentId(null); }}
            style={{ background: 'transparent', border: 'none', color: '#a0a3b1', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>←</span> Back to Overview
          </button>
          <div style={{ marginLeft: 'auto', fontSize: '16px', fontWeight: 600, color: '#fff' }}>{title}</div>
        </div>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {content}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header style={{ height: '56px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', background: '#0f1117', borderBottom: '1px solid #2a2d3a', zIndex: 10 }}>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#00d4aa' }}>⛓ ChainIQ</div>
        <div className="header-clock">{timeStr}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#a0a3b1' }}>Smart Supply Chain</span>
          <span style={{ background: '#ff4757', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
            {shipments.filter(s => s.status === 'AT_RISK' || s.status === 'DISRUPTED').length} Active Alerts
          </span>
        </div>
      </header>

      {/* Enroute Tracker Strip */}
      <div style={{ height: '120px', flexShrink: 0, padding: '16px 24px', overflowX: 'auto', display: 'flex', gap: '16px', borderBottom: '1px solid #2a2d3a', background: '#0f1117' }}>
        {shipments.map(s => (
          <EnrouteTracker 
            key={s.id} 
            shipment={s} 
            weather={weatherData[s.id]} 
            scores={scoresData[s.id]}
            onClick={() => handlePillClick(s.id)}
          />
        ))}
      </div>

      {/* Main Content Area */}
      {activeView ? renderExpandedView() : renderOverviewMode()}

      <EmailComposer 
        isOpen={emailComposerOpen} 
        onClose={() => setEmailComposerOpen(false)} 
        data={emailComposerData}
        initialType={emailComposerType}
      />
    </div>
  );
};
