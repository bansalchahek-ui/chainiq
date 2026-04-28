import React, { useState } from 'react';
import { Shipment, SUPPLIERS, ProductPortfolio, Product } from '../constants/mockData';
import { productStrategy, productSpecificStrategy } from '../utils/geminiClient';
import { SignalScores } from '../utils/riskEngine';
type Props = {
  activeShipments: Shipment[];
  scoresData: Record<string, SignalScores>;
  onReroute: (id: string, customMsg?: string, saving?: number) => void;
  addAlert: (message: string, icon: string, impact?: number, decision?: any) => void;
  setAiRecommendedSupplier: (s: string | null) => void;
  products: ProductPortfolio;
};

export const ProductMatrix: React.FC<Props> = ({ products, activeShipments, scoresData, onReroute, addAlert, setAiRecommendedSupplier }) => {
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState<Record<string, string> | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<(Product & { quadrantId: string }) | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productStrategyRes, setProductStrategyRes] = useState<any | null>(null);

  const handleGetStrategy = async () => {
    setLoading(true);
    const result = await productStrategy(products);
    setStrategies(result);
    setLoading(false);
  };

  const hasDisruption = (category: string) => {
    return activeShipments.some(s => s.category === category && (s.status === 'DISRUPTED' || s.status === 'AT_RISK'));
  };

  const getShipmentForCategory = (category: string) => {
    return activeShipments.find(s => s.category === category);
  };

  const getSupplierForProduct = (productName: string) => {
    return Object.values(SUPPLIERS).find(s => 
      s.products?.some((p: string) => p.toLowerCase() === productName.toLowerCase())
    );
  };

  const handleProductClick = (product: any, quadrantId: string) => {
    setSelectedProduct({ ...product, quadrantId });
    setProductStrategyRes(null);
  };

  const getTopTwoSignalsStr = (scores: SignalScores | undefined) => {
    if (!scores) return "N/A";
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
    const top2 = list.sort((a, b) => b.val - a.val).slice(0, 2);
    return top2.map(s => `${s.name}: ${s.val}/100`).join(', ');
  };

  const getAlternateRouteStr = (id: string) => {
    if (id === 'S001') return "Via NH-48 bypassing Indore Hub — avoids storm corridor · ETA impact: +6h · Saves: $2,950";
    if (id === 'S002') return "Via Singapore hub instead of Colombo — avoids Bay of Bengal storm · ETA impact: +8h · Saves: $1,400";
    if (id === 'S003') return "Sea freight via Kochi port instead of air via Hyderabad — avoids sandstorm window · ETA impact: +12h · Saves: $890";
    if (id === 'S004') return "Air freight via Chennai International — avoids sea route storm · ETA impact: -24h · Saves: $780";
    if (id === 'S005') return "Via Istanbul hub instead of Tehran — lower geopolitical risk · ETA impact: -8h · Saves: $3,200";
    return "Standard alternate route available";
  };

  const handleGenerateProductStrategy = async () => {
    if (!selectedProduct) return;
    setProductLoading(true);
    const supplier = getSupplierForProduct(selectedProduct.name);
    const shipment = getShipmentForCategory(selectedProduct.category);
    
    const shipmentStatus = shipment ? `${shipment.status?.replace('_', ' ')}` : 'No active shipment';
    const supplierName = supplier?.name || 'Unknown';
    const supplierCountry = supplier?.country || 'Unknown';
    const reliability = supplier?.reliability || 0;
    const financial = supplier?.financialRating || 'N/A';
    
    let top2Signals = 'None';
    let riskScore = 0;
    let delayHours = 0;
    let origin = 'Unknown';
    let destination = 'Unknown';
    let shipmentId = 'None';
    let altRouteStr = 'None';
    
    if (shipment) {
      top2Signals = getTopTwoSignalsStr(scoresData[shipment.id]);
      riskScore = scoresData[shipment.id]?.total || 0;
      delayHours = shipment.delayHours;
      origin = shipment.origin;
      destination = shipment.destination;
      shipmentId = shipment.id;
      altRouteStr = getAlternateRouteStr(shipment.id);
    }

    const otherSuppliers = Object.values(SUPPLIERS).filter(s => s.name !== supplierName);

    const res = await productSpecificStrategy(
      selectedProduct.name, selectedProduct.category, selectedProduct.quadrantId, 
      selectedProduct.profit, selectedProduct.unitsSold, shipmentId, shipmentStatus, riskScore, delayHours,
      origin, destination, top2Signals,
      supplierName, supplierCountry, supplier?.flag || '', reliability, financial, supplier?.politicsStability || 'unknown',
      supplier?.tariffPct || 0, supplier?.etaDays || 0, supplier?.costPerUnit || 0, supplier?.news || 'none',
      otherSuppliers, altRouteStr
    );
    setProductStrategyRes(res);
    setProductLoading(false);
  };

  const handleApplySupplierChange = (recSupplier: string) => {
    setAiRecommendedSupplier(recSupplier);
    addAlert(`AI recommends switching ${selectedProduct?.name} supplier to ${recSupplier} — est. saving ${productStrategyRes.supplierRecommendation.saving}`, '🔄', 0);
  };

  const handleAcceptRoute = () => {
    if (!selectedProduct) return;
    const s = getShipmentForCategory(selectedProduct.category);
    if (!s) return;
    onReroute(s.id, productStrategyRes.routeRecommendation.suggestedRoute, parseInt(productStrategyRes.routeRecommendation.financialImpact.replace(/[^0-9]/g, '')) || 0);
    addAlert(`Route changed for ${selectedProduct.name} shipment — saving ${productStrategyRes.routeRecommendation.financialImpact}`, '🛣', 0);
  };

  const renderQuadrant = (title: string, emoji: string, id: keyof ProductPortfolio, bgColor: string, borderColor: string) => {
    const productsInQuad = products[id];
    const isDisrupted = productsInQuad.some((p: Product) => hasDisruption(p.category));

    return (
      <div style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{emoji} {title}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isDisrupted && (
              <span style={{ fontSize: '11px', background: 'rgba(255, 165, 2, 0.2)', color: '#ffa502', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                ⚠ Supply risk
              </span>
            )}
            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#a0a3b1', padding: '4px 8px', borderRadius: '12px' }}>
              {productsInQuad.length} SKUs
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {productsInQuad.map((p: Product) => {
             const prodDisrupted = hasDisruption(p.category);
             return (
              <div 
                key={p.name} 
                onClick={() => handleProductClick(p, title)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#a0a3b1', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                onMouseOut={(e) => e.currentTarget.style.color = '#a0a3b1'}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   {p.name}
                   {prodDisrupted && <span style={{ color: '#ffa502', fontSize: '12px' }}>⚠</span>}
                </span>
                <span style={{ color: '#fff' }}>${p.profit} <span style={{ color: '#666', margin: '0 4px' }}>|</span> {p.unitsSold}u</span>
              </div>
            );
          })}
        </div>

        {strategies && strategies[id] && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#0f1117', borderLeft: `3px solid ${borderColor}`, borderRadius: '4px', fontSize: '12px', color: '#00d4aa', fontStyle: 'italic', lineHeight: 1.5 }}>
            "{strategies[id]}"
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="scrollable-panel" style={{ width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', overflowX: 'hidden' }}>
      
      <div className="product-grid">
        {renderQuadrant('Stars', '⭐', 'stars', '#1a3a2a', '#00d4aa')}
        {renderQuadrant('Hidden Gems', '💎', 'hiddenGems', '#2a1a3a', '#7c5cbf')}
        {renderQuadrant('Volume Drivers', '📦', 'volumeDrivers', '#1a2a3a', '#378add')}
        {renderQuadrant('Dead Weight', '💀', 'deadWeight', '#2a1a1a', '#ff4757')}

        <div style={{ position: 'absolute', left: '-20px', top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: '11px', color: '#666', letterSpacing: '0.05em', fontWeight: 600 }}>
          PROFIT / UNIT ↑
        </div>
        <div style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', color: '#666', letterSpacing: '0.05em', fontWeight: 600 }}>
          UNITS SOLD →
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '16px auto 0 auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={handleGetStrategy}
          disabled={loading}
          style={{
            background: loading ? 'transparent' : '#00d4aa',
            color: loading ? '#00d4aa' : '#0f1117',
            border: '1px solid #00d4aa',
            padding: '12px 32px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {loading ? 'Analyzing Portfolio...' : '✨ Generate AI Portfolio Strategy'}
        </button>
      </div>

      {/* Slide-in Product Drawer Overlay */}
      {selectedProduct && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setSelectedProduct(null)} />
          <div className="smooth-transition" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '400px', background: '#1a1d26', borderLeft: '2px solid #00d4aa', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.5)' }}>
            
            <button onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#a0a3b1', fontSize: '18px', cursor: 'pointer' }}>×</button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#00d4aa', textTransform: 'uppercase', fontWeight: 600 }}>{selectedProduct.quadrantId}</span>
              <h2 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>{selectedProduct.name}</h2>
              <div style={{ fontSize: '13px', color: '#a0a3b1' }}>Profit: ${selectedProduct.profit} | Units: {selectedProduct.unitsSold} | Cat: {selectedProduct.category}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>Supply Chain Status</h3>
              {(() => {
                const s = getShipmentForCategory(selectedProduct.category);
                if (!s) return <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>No active shipment</div>;
                const isRisk = s.status === 'DISRUPTED' || s.status === 'AT_RISK';
                return (
                  <div style={{ background: '#22263a', padding: '12px', borderRadius: '6px', borderLeft: `3px solid ${isRisk ? '#ff4757' : '#00d4aa'}` }}>
                    <div style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>{s.id} — {s.status?.replace('_', ' ')}</div>
                    <div style={{ fontSize: '12px', color: '#a0a3b1', marginTop: '4px' }}>{s.delayHours > 0 ? `${s.delayHours}h delay` : 'On schedule'}</div>
                    {scoresData[s.id] && <div style={{ fontSize: '12px', color: '#ffa502', marginTop: '4px' }}>Risk Score: {scoresData[s.id].total}</div>}
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>Supplier Info</h3>
              {(() => {
                const sup = getSupplierForProduct(selectedProduct.name);
                if (!sup) return <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>Supplier data unavailable</div>;
                return (
                  <div style={{ background: '#22263a', padding: '12px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>{sup.flag} {sup.name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '12px', color: '#a0a3b1' }}>
                      <span>Reliability: {sup.reliability}/100</span>
                      <span>Fin: {sup.financialRating}</span>
                      <span>Pol: {sup.politicsStability}</span>
                      <span>Tariff: {sup.tariffPct}%</span>
                      <span>ETA: {sup.etaDays}d</span>
                      <span>Cost: ${sup.costPerUnit}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#ffa502', fontStyle: 'italic', marginTop: '4px' }}>{sup.news}</div>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>💰 Budget Wiggle Room</h3>
              {(() => {
                const s = getShipmentForCategory(selectedProduct.category);
                if (!s) return <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>No active shipment — budget analysis unavailable</div>;
                
                const costOfDelay = s.delayHours * s.costPerHourDelay;
                const expeditePremium = s.expediteRouteCost - s.baseRouteCost;
                const netSaving = costOfDelay - expeditePremium;
                const isPositive = netSaving > 0;
                
                let decision = { label: "❌ Not Justified — Hold current route", color: "#ff4757" };
                if (isPositive) {
                  if (selectedProduct.quadrantId === 'Stars' || selectedProduct.quadrantId === 'Hidden Gems') {
                    decision = { label: "✅ Auto-Approved — Expedite justified", color: "#00d4aa" };
                  } else {
                    decision = { label: "⚠ Manual Review Required", color: "#ffa502" };
                  }
                }

                return (
                  <div style={{ background: '#1a1d26', border: '0.5px solid #2a2d3a', borderLeft: `3px solid ${decision.color}`, borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#a0a3b1', letterSpacing: '0.04em' }}>
                      <span>Cost of Delay</span>
                      <span style={{ color: '#ff4757', fontWeight: 600, fontSize: '15px' }}>${costOfDelay.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#a0a3b1', letterSpacing: '0.04em' }}>
                      <span>Expedite Premium</span>
                      <span style={{ color: '#ffa502', fontWeight: 600, fontSize: '15px' }}>${expeditePremium.toLocaleString()}</span>
                    </div>
                    <div style={{ height: '1px', background: '#2a2d3a', margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#a0a3b1', letterSpacing: '0.04em' }}>
                      <span>Net Wiggle Room</span>
                      <span style={{ color: isPositive ? '#00d4aa' : '#ff4757', fontWeight: 600, fontSize: '15px' }}>${netSaving.toLocaleString()}</span>
                    </div>
                    <div style={{ marginTop: '4px', padding: '6px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', fontSize: '11px', fontWeight: 600, color: decision.color }}>
                      {decision.label}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>🌐 Live Market Bridge</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    const targetRegion = "Southeast Asia";
                    const url = `https://www.google.com/search?q=reliable+suppliers+of+${encodeURIComponent(selectedProduct.name)}+in+${encodeURIComponent(targetRegion)}+with+low+tariffs`;
                    window.open(url, '_blank');
                  }}
                  style={{ flex: 1, background: '#0f1117', border: '1px solid #378add', color: '#378add', padding: '10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  🔍 Search Market
                </button>
                <button
                  onClick={() => {
                    const s = getShipmentForCategory(selectedProduct.category);
                    const city = s ? s.destination.split(',')[0] : "Delhi";
                    const url = `https://www.google.com/maps/search/logistics+and+warehousing+near+${encodeURIComponent(city)}`;
                    window.open(url, '_blank');
                  }}
                  style={{ flex: 1, background: '#0f1117', border: '1px solid #ffa502', color: '#ffa502', padding: '10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  📍 Find Nearby
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerateProductStrategy}
              disabled={productLoading}
              style={{
                background: productLoading ? 'transparent' : '#00d4aa',
                color: productLoading ? '#00d4aa' : '#0f1117',
                border: '1px solid #00d4aa', padding: '12px', borderRadius: '4px',
                fontSize: '13px', fontWeight: 600, cursor: productLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', marginTop: '8px'
              }}
            >
              {productLoading ? 'Generating...' : `✨ Generate Strategy for ${selectedProduct.name}`}
            </button>

            {productLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton" style={{ height: '60px', borderRadius: '6px' }} />
                <div className="skeleton" style={{ height: '60px', borderRadius: '6px' }} />
                <div className="skeleton" style={{ height: '100px', borderRadius: '6px' }} />
              </div>
            )}

            {productStrategyRes && !productLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ background: '#1a1d26', borderLeft: '3px solid #ff4757', padding: '12px', borderRadius: '4px', border: '1px solid #2a2d3a' }}>
                    <div style={{ fontSize: '13px', color: '#fff', fontWeight: 600, marginBottom: '4px' }}>{productStrategyRes.immediate?.title}</div>
                    <div style={{ fontSize: '12px', color: '#a0a3b1' }}>{productStrategyRes.immediate?.detail}</div>
                  </div>
                  <div style={{ background: '#1a1d26', borderLeft: '3px solid #ffa502', padding: '12px', borderRadius: '4px', border: '1px solid #2a2d3a' }}>
                    <div style={{ fontSize: '13px', color: '#fff', fontWeight: 600, marginBottom: '4px' }}>{productStrategyRes.shortTerm?.title}</div>
                    <div style={{ fontSize: '12px', color: '#a0a3b1' }}>{productStrategyRes.shortTerm?.detail}</div>
                  </div>
                  <div style={{ background: '#1a1d26', borderLeft: '3px solid #00d4aa', padding: '12px', borderRadius: '4px', border: '1px solid #2a2d3a' }}>
                    <div style={{ fontSize: '13px', color: '#fff', fontWeight: 600, marginBottom: '4px' }}>{productStrategyRes.longTerm?.title}</div>
                    <div style={{ fontSize: '12px', color: '#a0a3b1' }}>{productStrategyRes.longTerm?.detail}</div>
                  </div>
                </div>

                {productStrategyRes.supplierRecommendation && (
                  <div style={{ background: '#1a1d26', borderLeft: `3px solid ${productStrategyRes.supplierRecommendation.action === 'keep' ? '#00d4aa' : productStrategyRes.supplierRecommendation.action === 'switch' ? '#ff4757' : '#ffa502'}`, padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #2a2d3a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>🏭 Supplier Decision</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: productStrategyRes.supplierRecommendation.action === 'keep' ? '#00d4aa' : productStrategyRes.supplierRecommendation.action === 'switch' ? '#ff4757' : '#ffa502', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}>
                        {productStrategyRes.supplierRecommendation.action === 'keep' ? 'Keep Current Supplier' : productStrategyRes.supplierRecommendation.action === 'switch' ? 'Switch Supplier' : 'Dual Source'}
                      </span>
                    </div>
                    {productStrategyRes.supplierRecommendation.action !== 'keep' && productStrategyRes.supplierRecommendation.recommendedSupplier && (
                      <div style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>Rec: {productStrategyRes.supplierRecommendation.recommendedSupplier}</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#a0a3b1', lineHeight: 1.5 }}>{productStrategyRes.supplierRecommendation.reason}</div>
                    <div style={{ fontSize: '13px', color: '#00d4aa', fontWeight: 600 }}>Est. Saving: {productStrategyRes.supplierRecommendation.saving}</div>
                    {productStrategyRes.supplierRecommendation.action !== 'keep' && (
                      <button 
                        onClick={() => handleApplySupplierChange(productStrategyRes.supplierRecommendation.recommendedSupplier)}
                        style={{ background: '#00d4aa', color: '#0f1117', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '12px', alignSelf: 'flex-start', marginTop: '4px' }}
                      >
                        ✓ Apply Change
                      </button>
                    )}
                  </div>
                )}

                {productStrategyRes.routeRecommendation && (
                  <div style={{ background: '#1a1d26', borderLeft: `3px solid ${productStrategyRes.routeRecommendation.action === 'keep' ? '#00d4aa' : '#ff4757'}`, padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #2a2d3a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>🛣 Route Decision</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: productStrategyRes.routeRecommendation.action === 'keep' ? '#00d4aa' : '#ff4757', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}>
                        {productStrategyRes.routeRecommendation.action === 'keep' ? 'Current Route Optimal' : 'Reroute Recommended'}
                      </span>
                    </div>
                    {productStrategyRes.routeRecommendation.action !== 'keep' && (
                      <div style={{ fontSize: '13px', color: '#fff' }}>{productStrategyRes.routeRecommendation.suggestedRoute}</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#a0a3b1', lineHeight: 1.5 }}>{productStrategyRes.routeRecommendation.reason}</div>
                    <div style={{ fontSize: '13px', color: '#00d4aa', fontWeight: 600 }}>ETA: {productStrategyRes.routeRecommendation.etaImpact} | {productStrategyRes.routeRecommendation.financialImpact}</div>
                    {productStrategyRes.routeRecommendation.action !== 'keep' && (
                      <button 
                        onClick={handleAcceptRoute}
                        disabled={getShipmentForCategory(selectedProduct.category)?.status === 'REROUTED'}
                        style={{ background: getShipmentForCategory(selectedProduct.category)?.status === 'REROUTED' ? '#22263a' : '#00d4aa', color: getShipmentForCategory(selectedProduct.category)?.status === 'REROUTED' ? '#00d4aa' : '#0f1117', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 600, cursor: getShipmentForCategory(selectedProduct.category)?.status === 'REROUTED' ? 'default' : 'pointer', fontSize: '12px', alignSelf: 'flex-start', marginTop: '4px' }}
                      >
                        {getShipmentForCategory(selectedProduct.category)?.status === 'REROUTED' ? '✓ Route Accepted' : '✓ Accept Route'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
