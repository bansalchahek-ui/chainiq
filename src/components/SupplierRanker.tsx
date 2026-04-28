import React, { useState, useEffect } from 'react';
import { SUPPLIERS, GEOPOLITICAL_DATA } from '../constants/mockData';
import { getSupplierRiskPillScore } from '../utils/riskEngine';
import { rankSuppliers, findAlternativeSupplier } from '../utils/geminiClient';

import { EmailComposerData } from './EmailComposer';
import { Shipment } from '../constants/mockData';
import { SignalScores } from '../utils/riskEngine';

export interface Supplier {
  name: string;
  country: string;
  flag: string;
  tariffPct: number;
  etaDays: number;
  qualityScore: number;
  costPerUnit: number;
  reliability: number;
  financialRating: string;
  politicsStability: string;
  news: string;
  products: string[];
}

interface RankedSupplier {
  rank: number;
  name: string;
  score: number;
  one_line_reason: string;
}

interface AltSupplier {
  recommended: string;
  reason: string;
  tradeoff: string;
}

type Props = {
  aiRecommendedSupplier?: string | null;
  setAiRecommendedSupplier?: (s: string | null) => void;
  onOpenEmailComposer?: (data: EmailComposerData, type: 'cancel' | 'reroute' | 'newOrder') => void;
  shipments?: Shipment[];
  scoresData?: Record<string, SignalScores>;
};

export const SupplierRanker: React.FC<Props> = ({ aiRecommendedSupplier, setAiRecommendedSupplier, onOpenEmailComposer, shipments = [], scoresData = {} }) => {
  const [activeTab, setActiveTab] = useState('💰 Cost');
  const [loading, setLoading] = useState(false);
  const [rankedData, setRankedData] = useState<RankedSupplier[]>([]);

  const suppliersList = Object.values(SUPPLIERS) as Supplier[];

  const [altSuppliers, setAltSuppliers] = useState<Record<string, AltSupplier>>({});
  const [loadingAlt, setLoadingAlt] = useState<string | null>(null);

  const getSupplierAlerts = (s: Supplier) => {
    const alerts = [];
    if (s.financialRating?.includes('B') && s.financialRating !== 'BBB') alerts.push(`Financial rating ${s.financialRating} — elevated default risk`);
    if (s.politicsStability === 'unstable') alerts.push(`Political instability in ${s.country}`);
    if (GEOPOLITICAL_DATA[s.country]?.riskLevel > 60) alerts.push(`Geopolitical risk level ${GEOPOLITICAL_DATA[s.country].riskLevel}/100`);
    if (s.reliability < 75) alerts.push(`Low reliability score (${s.reliability}/100)`);
    return alerts;
  };

  const flaggedSuppliers = suppliersList.map(s => ({ ...s, alerts: getSupplierAlerts(s) })).filter(s => s.alerts.length > 0);

  const handleFindAlt = async (s: Supplier & { alerts: string[] }) => {
    setLoadingAlt(s.name);
    const others = suppliersList.filter(x => x.name !== s.name);
    const res = await findAlternativeSupplier(s.name, s.country, s.alerts.join(', '), s.products?.join(', ') || '', s.costPerUnit, s.etaDays, others);
    setAltSuppliers(prev => ({ ...prev, [s.name]: res }));
    setLoadingAlt(null);
  };

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true);
      const pref = activeTab.split(' ')[1].toLowerCase();
      const res = await rankSuppliers(suppliersList, pref);
      if (res && res.length > 0) {
        setRankedData(res);
      } else {
        setRankedData(suppliersList.map((s, i) => ({
          rank: i + 1, name: s.name, score: 90 - i * 5, one_line_reason: "Fallback strategy generated locally."
        })));
      }
      setLoading(false);
    };
    fetchRanking();
  }, [activeTab]);

  return (
    <div className="scrollable-panel" style={{ width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {flaggedSuppliers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <h2 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: 600 }}>⚠ Proactive Supplier Alerts</h2>
          {flaggedSuppliers.map(s => (
            <div key={s.name} style={{ background: '#2a0f0f', borderLeft: '3px solid #ff4757', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{s.flag} {s.name}</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#ff4757', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {s.alerts.map((a: string, i: number) => <li key={i}>{a}</li>)}
              </ul>
              
              {!altSuppliers[s.name] ? (
                <button
                  onClick={() => handleFindAlt(s)}
                  disabled={loadingAlt === s.name}
                  style={{ background: '#00d4aa', color: '#0f1117', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 600, cursor: loadingAlt === s.name ? 'not-allowed' : 'pointer', alignSelf: 'flex-start', fontSize: '13px', transition: 'all 0.2s' }}
                >
                  {loadingAlt === s.name ? 'Analyzing...' : '🔄 Find Alternative'}
                </button>
              ) : (
                <div style={{ background: '#1a1d26', borderLeft: '3px solid #00d4aa', padding: '12px', borderRadius: '4px', marginTop: '8px' }}>
                  <div style={{ color: '#00d4aa', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Recommended: {altSuppliers[s.name].recommended}</div>
                  <div style={{ color: '#fff', fontSize: '13px', marginBottom: '4px' }}>{altSuppliers[s.name].reason}</div>
                  <div style={{ color: '#ffa502', fontStyle: 'italic', fontSize: '12px' }}>{altSuppliers[s.name].tradeoff}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        {['💰 Cost', '⚡ Speed', '🏆 Quality'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? '#0f1117' : 'transparent',
              border: `1px solid ${activeTab === tab ? '#00d4aa' : '#2a2d3a'}`,
              color: activeTab === tab ? '#00d4aa' : '#a0a3b1',
              padding: '8px 24px',
              borderRadius: '24px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        {loading ? (
          <>
            <div className="skeleton" style={{ height: '140px', borderRadius: '12px' }} />
            <div className="skeleton" style={{ height: '140px', borderRadius: '12px' }} />
            <div className="skeleton" style={{ height: '140px', borderRadius: '12px' }} />
          </>
        ) : (
          rankedData.map((item) => {
            const supplierData = suppliersList.find(s => s.name === item.name);
            if (!supplierData) return null;
            
            const riskPillScore = getSupplierRiskPillScore(supplierData);
            const riskColor = riskPillScore < 35 ? '#00d4aa' : riskPillScore < 55 ? '#ffa502' : '#ff4757';
            const isAiRecommended = aiRecommendedSupplier === supplierData.name;

            return (
              <div key={item.name} style={{ background: '#1a1d26', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', boxShadow: isAiRecommended ? '0 0 0 2px #00d4aa' : 'none' }}>
                <div style={{ position: 'absolute', top: '-12px', left: '-12px', width: '32px', height: '32px', borderRadius: '50%', background: item.rank === 1 ? '#ffd700' : item.rank === 2 ? '#c0c0c0' : item.rank === 3 ? '#cd7f32' : '#2a2d3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: '#000', fontWeight: 'bold', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
                  {item.rank}
                </div>
                
                {isAiRecommended && (
                  <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0, 212, 170, 0.1)', color: '#00d4aa', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #00d4aa' }}>
                    ⭐ AI Recommended
                    <button onClick={() => setAiRecommendedSupplier?.(null)} style={{ background: 'transparent', border: 'none', color: '#00d4aa', cursor: 'pointer', fontSize: '12px', padding: 0 }}>×</button>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>{supplierData.flag} {item.name}</span>
                    <span style={{ fontSize: '11px', color: '#a0a3b1', background: '#0f1117', padding: '2px 8px', borderRadius: '4px' }}>{supplierData.financialRating}</span>
                    <span style={{ fontSize: '11px', color: '#a0a3b1', background: '#0f1117', padding: '2px 8px', borderRadius: '4px' }}>{supplierData.politicsStability}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>Live Risk</span>
                    <div style={{ padding: '4px 10px', borderRadius: '12px', background: `${riskColor}20`, border: `1px solid ${riskColor}`, color: riskColor, fontSize: '12px', fontWeight: 600 }}>
                      {riskPillScore}/100
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', paddingLeft: '16px', marginBottom: '4px' }}>
                  <button
                    onClick={() => {
                      const productName = supplierData.products?.[0] || "general supplies";
                      const targetRegion = supplierData.country === 'China' ? "Vietnam" : "India";
                      const url = `https://www.google.com/search?q=reliable+suppliers+of+${encodeURIComponent(productName)}+in+${encodeURIComponent(targetRegion)}+with+low+tariffs`;
                      window.open(url, '_blank');
                    }}
                    style={{ background: 'rgba(55, 138, 221, 0.1)', border: '1px solid #378add', color: '#378add', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    🔍 Search Market for Alternatives
                  </button>
                  <button
                    onClick={() => {
                      const destinationCity = "Delhi";
                      const url = `https://www.google.com/maps/search/logistics+and+warehousing+near+${encodeURIComponent(destinationCity)}`;
                      window.open(url, '_blank');
                    }}
                    style={{ background: 'rgba(255, 165, 2, 0.1)', border: '1px solid #ffa502', color: '#ffa502', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    📍 Find Nearby Distributors
                  </button>
                </div>

                <div style={{ width: '100%', height: '6px', background: '#0f1117', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${item.score}%`, height: '100%', background: 'linear-gradient(90deg, #00d4aa, #378add)' }} />
                </div>

                <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#00d4aa', margin: '4px 0', lineHeight: 1.5 }}>
                  "{item.one_line_reason}"
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', borderTop: '1px solid #2a2d3a', paddingTop: '12px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>Tariff</span>
                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>{supplierData.tariffPct}%</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>ETA</span>
                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>{supplierData.etaDays} days</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>Cost/Unit</span>
                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>${supplierData.costPerUnit.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>Reliability</span>
                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>{supplierData.reliability}/100</span>
                  </div>
                </div>

                <div style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase', marginRight: '4px' }}>Products Supplied:</span>
                  {supplierData.products?.map((p: string) => (
                    <span key={p} style={{ background: 'rgba(0,212,170,0.1)', color: '#00d4aa', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{p}</span>
                  ))}
                </div>

                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #2a2d3a', display: 'flex', gap: '8px' }}>
                  {(() => {
                    const sKey = Object.keys(SUPPLIERS).find(k => SUPPLIERS[k].name === item.name);
                    const shipment = shipments.find(s => s.supplierKey === sKey) || null;
                    const scores = shipment ? scoresData[shipment.id] : null;
                    
                    const handleOpen = (type: 'cancel' | 'reroute' | 'newOrder') => {
                      if (!onOpenEmailComposer) return;
                      
                      const emailData: EmailComposerData = {
                        supplier: supplierData,
                        shipment: shipment,
                        alternateSupplier: rankedData.find(r => r.name !== item.name) ? suppliersList.find(s => s.name === (rankedData.find(r => r.name !== item.name)?.name || '')) || null : null,
                        alternateRoute: "Reroute via Alternate Hub",
                        financialImpact: shipment ? `$${(shipment.delayHours * shipment.costPerHourDelay).toLocaleString()}` : "N/A",
                        etaImpact: "-2h",
                        top2RiskSignals: scores ? "Weather disruption and transit delays" : "N/A",
                        riskScore: scores?.total || 0
                      };
                      onOpenEmailComposer(emailData, type);
                    };

                    return (
                      <>
                        <button 
                          onClick={() => handleOpen('cancel')}
                          style={{ background: 'transparent', border: '1px solid #ff4757', color: '#ff4757', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          🚫 Cancel Order
                        </button>
                        <button 
                          onClick={() => handleOpen('reroute')}
                          style={{ background: 'transparent', border: '1px solid #ffa502', color: '#ffa502', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          🔄 Request Reroute
                        </button>
                        <button 
                          onClick={() => handleOpen('newOrder')}
                          style={{ background: 'transparent', border: '1px solid #00d4aa', color: '#00d4aa', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          📦 New Order
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
