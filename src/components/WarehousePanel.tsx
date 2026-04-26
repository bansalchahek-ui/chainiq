import React, { useState } from 'react';
import { WAREHOUSE, MOCK_SHIPMENTS, DEAD_WEIGHT_BLOCKER } from '../constants/mockData';

type Props = {
  addAlert: (msg: string, icon: string, impact?: number) => void;
  onSlottingExecuted: (val: boolean) => void;
};

type Step = 'IDLE' | 'CALCULATING' | 'FINANCIAL' | 'APPROVAL' | 'ANIMATING_DOCK' | 'UPDATING_DEEP' | 'READY' | 'COMPLETE';

export const WarehousePanel: React.FC<Props> = ({ addAlert, onSlottingExecuted }) => {
  const [step, setStep] = useState<Step>('IDLE');
  const [progressMsg, setProgressMsg] = useState('');
  const [financials, setFinancials] = useState<{ revenue: number; cost: number; net: number } | null>(null);

  const incomingShipment = MOCK_SHIPMENTS.find(s => s.id === 'S001')!;
  const dwellHours = 6.5;
  const revenueSaved = incomingShipment.costPerHourDelay * dwellHours;
  const displacementCost = 150;
  const netBenefit = revenueSaved - displacementCost;

  const handleExecute = () => {
    setStep('CALCULATING');
    setProgressMsg('🔄 Calculating displacement value...');
    
    setTimeout(() => {
      setStep('FINANCIAL');
      setFinancials({ revenue: revenueSaved, cost: displacementCost, net: netBenefit });
      setProgressMsg('');
    }, 800);

    setTimeout(() => {
      setStep('APPROVAL');
      setProgressMsg('✅ Net benefit positive — Auto-approved\nInitiating displacement order...');
    }, 1600);

    setTimeout(() => {
      setStep('ANIMATING_DOCK');
    }, 2400);

    setTimeout(() => {
      setStep('UPDATING_DEEP');
    }, 3000);

    setTimeout(() => {
      setStep('READY');
    }, 3200);

    setTimeout(() => {
      setStep('COMPLETE');
      onSlottingExecuted(true);
      addAlert(`⚡ Strategic Slotting executed — DOCK-1 cleared for S001 · S099 displaced to DEEP-7 · $${netBenefit.toLocaleString()} saved · Auto-approved`, "⚡", netBenefit);
    }, 3500);
  };

  const handleReset = () => {
    setStep('IDLE');
    setFinancials(null);
    setProgressMsg('');
    onSlottingExecuted(false);
  };

  const isDisplaced = ['ANIMATING_DOCK', 'UPDATING_DEEP', 'READY', 'COMPLETE'].includes(step);

  return (
    <div style={{ background: '#1a1d26', borderRadius: '12px', border: '1px solid #2a2d3a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      <div style={{ padding: '20px', borderBottom: '1px solid #2a2d3a', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '16px', margin: 0, color: '#fff', fontWeight: 600 }}>Warehouse Status</h2>
          <div className="tooltip-trigger" style={{ cursor: 'help', position: 'relative' }}>
            <span style={{ fontSize: '14px', color: '#a0a3b1' }}>ℹ</span>
            <div className="tooltip-content" style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', width: '240px', padding: '12px', background: '#22263a', border: '1px solid #00d4aa', borderRadius: '8px', fontSize: '11px', color: '#e0e0e0', zIndex: 10, marginBottom: '8px', lineHeight: 1.5, pointerEvents: 'none', opacity: 0, transition: 'opacity 0.2s' }}>
              The system detected a high-priority Star shipment approaching a blocked dock. By displacing the low-value Dead Weight item to deep storage, it prevented a cascade delay for 2,100 customers waiting for Wireless Earbuds.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#a0a3b1' }}>
            <span>{WAREHOUSE.id}</span>
            <span>{WAREHOUSE.capacityPct}% Capacity</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#0f1117', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${WAREHOUSE.capacityPct}%`, height: '100%', background: '#00d4aa' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '11px', color: '#a0a3b1', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Loading Docks</h3>
          
          <div style={{ 
            background: '#22263a', padding: '16px', borderRadius: '8px', 
            borderLeft: `4px solid ${isDisplaced ? '#00d4aa' : '#ff4757'}`,
            boxShadow: step === 'ANIMATING_DOCK' ? '0 0 15px rgba(0,212,170,0.4)' : 'none',
            transition: 'all 0.4s ease',
            display: 'flex', flexDirection: 'column', gap: '8px' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>DOCK-1</span>
              <span style={{ color: isDisplaced ? '#00d4aa' : '#ff4757', fontWeight: 600, transition: 'color 0.4s ease' }}>
                {isDisplaced ? '🟢 CLEARED' : `🔴 BOTTLENECK ${dwellHours}h`}
              </span>
            </div>
            
            {isDisplaced ? (
              <div style={{ fontSize: '13px', color: '#a0a3b1', animation: 'fadeIn 0.4s ease' }}>
                {step === 'READY' || step === 'COMPLETE' ? (
                  <span style={{ color: '#00d4aa', fontWeight: 600 }}>Ready for S001 Wireless Earbuds arrival</span>
                ) : (
                  <span>S099 displaced to DEEP-7</span>
                )}
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#00d4aa', background: 'rgba(0,212,170,0.1)', padding: '8px 12px', borderRadius: '4px', border: '1px solid rgba(0,212,170,0.2)' }}>
                   ✅ Strategic Slotting complete — ${netBenefit.toLocaleString()} saved
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: '13px', color: '#a0a3b1' }}>{DEAD_WEIGHT_BLOCKER.id} {DEAD_WEIGHT_BLOCKER.product} — Paperwork pending</div>
                <div style={{ fontSize: '11px', color: '#ffa502', fontStyle: 'italic', background: 'rgba(255,165,2,0.1)', padding: '6px 10px', borderRadius: '4px' }}>
                  ⚠ S001 Wireless Earbuds (STAR) arriving in 36h — dock conflict detected
                </div>
              </>
            )}
          </div>

          {step === 'IDLE' && (
            <button 
              onClick={handleExecute}
              style={{ width: '100%', padding: '12px', background: '#ff4757', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = '#ff5e6c'}
              onMouseOut={e => e.currentTarget.style.background = '#ff4757'}
            >
              <span style={{ fontSize: '14px' }}>⚡ Execute Strategic Slotting</span>
              <span style={{ fontSize: '10px', fontWeight: 400, opacity: 0.9 }}>Displace S099 → DEEP-7 to clear dock for incoming Star shipment</span>
            </button>
          )}

          {step !== 'IDLE' && step !== 'COMPLETE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              {progressMsg && <div style={{ fontSize: '13px', color: '#00d4aa', fontStyle: 'italic', whiteSpace: 'pre-line' }}>{progressMsg}</div>}
              {financials && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#a0a3b1' }}>Revenue at risk (S001 delay):</span>
                    <span style={{ color: '#00d4aa', fontWeight: 'bold' }}>${financials.revenue.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#a0a3b1' }}>Displacement ops cost:</span>
                    <span style={{ color: '#ff4757', fontWeight: 'bold' }}>${financials.cost.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '1px', background: '#2a2d3a', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#fff', fontWeight: 600 }}>Net benefit:</span>
                    <span style={{ color: '#00d4aa', fontWeight: 'bold' }}>${financials.net.toLocaleString()} ✅</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ background: '#22263a', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #00d4aa' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>DOCK-2</span>
              <span style={{ color: '#00d4aa', fontWeight: 600 }}>🟢 Available</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '11px', color: '#a0a3b1', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Deep Storage</h3>
          
          <div style={{ 
            background: '#22263a', padding: '16px', borderRadius: '8px', 
            borderLeft: `4px solid ${step === 'UPDATING_DEEP' || step === 'READY' || step === 'COMPLETE' ? '#ffa502' : '#00d4aa'}`,
            transition: 'all 0.4s ease'
          }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>DEEP-7</span>
              {step === 'UPDATING_DEEP' || step === 'READY' || step === 'COMPLETE' ? (
                <span style={{ color: '#ffa502', fontWeight: 600 }}>📦 S099 Novelty Mugs</span>
              ) : (
                <span style={{ color: '#00d4aa', fontWeight: 600 }}>🟢 Available (Reserved for S099)</span>
              )}
            </div>
            {(step === 'UPDATING_DEEP' || step === 'READY' || step === 'COMPLETE') && (
              <div style={{ fontSize: '11px', color: '#a0a3b1', marginTop: '4px' }}>Moved from DOCK-1</div>
            )}
          </div>

          <div style={{ background: '#22263a', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #00d4aa' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>DEEP-8</span>
              <span style={{ color: '#00d4aa', fontWeight: 600 }}>🟢 Available</span>
            </div>
          </div>
        </div>

        {step === 'COMPLETE' && (
          <button 
            onClick={handleReset}
            style={{ alignSelf: 'center', background: 'transparent', border: 'none', color: '#a0a3b1', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ↺ Reset Demo
          </button>
        )}

      </div>
      <style>{`
        .tooltip-trigger:hover .tooltip-content {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
