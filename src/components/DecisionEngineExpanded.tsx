import React, { useState } from 'react';
import { WarehousePanel } from './WarehousePanel';
import { DecisionCard } from './DecisionCard';

import { Shipment } from '../constants/mockData';

type Alert = {
  id: string;
  time: string;
  message: string;
  impact?: number;
  icon: string;
  decision?: any; 
};

type Props = {
  alerts: Alert[];
  shipments: Shipment[];
  addAlert: (msg: string, icon: string, impact?: number) => void;
  onSlottingExecuted: (val: boolean) => void;
};

export const DecisionEngineExpanded: React.FC<Props> = ({ alerts, shipments, addAlert, onSlottingExecuted }) => {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const activeDelayCost = shipments.reduce((sum, s) => sum + (s.delayHours * s.costPerHourDelay), 0);
  const totalExpeditePremium = shipments.reduce((sum, s) => sum + (s.expediteRouteCost - s.baseRouteCost), 0);

  const getDecision = (s: Shipment) => {
    const net = (s.delayHours * s.costPerHourDelay) - (s.expediteRouteCost - s.baseRouteCost);
    if (net > 0) {
      if (s.quadrant === 'star' || s.quadrant === 'hidden_gem') return { label: "✅ Auto-Approved", color: "#00d4aa", bg: "rgba(0, 212, 170, 0.05)" };
      return { label: "⚠ Manual Review", color: "#ffa502", bg: "rgba(255, 165, 2, 0.05)" };
    }
    return { label: "❌ Not Justified", color: "#ff4757", bg: "rgba(255, 71, 87, 0.05)" };
  };

  const autoApprovedShipments = shipments.filter(s => {
    const net = (s.delayHours * s.costPerHourDelay) - (s.expediteRouteCost - s.baseRouteCost);
    return net > 0 && (s.quadrant === 'star' || s.quadrant === 'hidden_gem');
  });

  const recoverableSavings = autoApprovedShipments.reduce((sum, s) => {
    const net = (s.delayHours * s.costPerHourDelay) - (s.expediteRouteCost - s.baseRouteCost);
    return sum + net;
  }, 0);

  const manualReviewCount = shipments.filter(s => {
    const net = (s.delayHours * s.costPerHourDelay) - (s.expediteRouteCost - s.baseRouteCost);
    return net > 0 && (s.quadrant !== 'star' && s.quadrant !== 'hidden_gem');
  }).length;

  return (
    <div className="scrollable-panel decision-layout">
      
      {/* Left 60%: Budget & Alert Feed */}
      <div className="decision-left">
        
        {/* Budget Command Center */}
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: 600 }}>💰 Budget Command Center</h2>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ background: '#1a1d26', border: '0.5px solid #2a2d3a', borderRadius: '8px', padding: '16px', textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Active Delay Cost</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#ff4757', transition: 'all 0.4s ease' }}>${activeDelayCost.toLocaleString()}</div>
            </div>
            <div style={{ background: '#1a1d26', border: '0.5px solid #2a2d3a', borderRadius: '8px', padding: '16px', textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Expedite Budget Available</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#ffa502', transition: 'all 0.4s ease' }}>${totalExpeditePremium.toLocaleString()}</div>
            </div>
            <div style={{ background: '#1a1d26', border: '0.5px solid #2a2d3a', borderRadius: '8px', padding: '16px', textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Recoverable Savings</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#00d4aa', transition: 'all 0.4s ease' }}>${recoverableSavings.toLocaleString()}</div>
            </div>
          </div>

          {/* Per-Shipment Budget Table */}
          <div style={{ background: '#1a1d26', border: '0.5px solid #2a2d3a', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>Shipment</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>Product</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>Delay Cost</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>Premium</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>Net</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: '11px', color: '#a0a3b1', textTransform: 'uppercase' }}>Decision</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map(s => {
                  const delayCost = s.delayHours * s.costPerHourDelay;
                  const premium = s.expediteRouteCost - s.baseRouteCost;
                  const net = delayCost - premium;
                  const decision = getDecision(s);
                  return (
                    <tr key={s.id} style={{ background: decision.bg, borderBottom: '1px solid rgba(42, 45, 58, 0.5)', transition: 'all 0.4s ease' }}>
                      <td style={{ padding: '8px 12px', fontSize: '13px', color: '#fff' }}>{s.id}</td>
                      <td style={{ padding: '8px 12px', fontSize: '13px', color: '#a0a3b1' }}>{s.product}</td>
                      <td style={{ padding: '8px 12px', fontSize: '15px', fontWeight: 600, color: '#ff4757', textAlign: 'right' }}>${delayCost.toLocaleString()}</td>
                      <td style={{ padding: '8px 12px', fontSize: '15px', fontWeight: 600, color: '#ffa502', textAlign: 'right' }}>${premium.toLocaleString()}</td>
                      <td style={{ padding: '8px 12px', fontSize: '15px', fontWeight: 600, color: net > 0 ? '#00d4aa' : '#ff4757', textAlign: 'right' }}>${net.toLocaleString()}</td>
                      <td style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: decision.color, textAlign: 'center' }}>{decision.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '12px', fontSize: '11px', color: '#a0a3b1', borderTop: '1px solid #2a2d3a', background: 'rgba(255,255,255,0.02)' }}>
              System identified ${recoverableSavings.toLocaleString()} in recoverable savings across {autoApprovedShipments.length} auto-approved expedites · {manualReviewCount} require manual review
            </div>
          </div>
        </div>

        <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#fff', fontWeight: 600 }}>System Activity Log</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alerts.map(alert => (
            <div key={alert.id} style={{ background: '#1a1d26', border: '1px solid #2a2d3a', borderRadius: '8px', overflow: 'hidden' }}>
              <div 
                style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: alert.decision ? 'pointer' : 'default' }}
                onClick={() => alert.decision && setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
              >
                <span style={{ fontSize: '13px', color: '#666', fontFamily: 'monospace' }}>{alert.time}</span>
                <span style={{ fontSize: '16px' }}>{alert.icon}</span>
                <span style={{ fontSize: '14px', color: '#fff', flex: 1 }}>{alert.message}</span>
                
                {alert.impact && (
                  <span style={{ background: 'rgba(0,212,170,0.15)', color: '#00d4aa', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>
                    +${alert.impact.toLocaleString()}
                  </span>
                )}
                
                {alert.decision && (
                  <span style={{ color: '#a0a3b1', fontSize: '12px', marginLeft: '8px' }}>
                    {expandedAlert === alert.id ? '▲' : '▼'}
                  </span>
                )}
              </div>
              
              {expandedAlert === alert.id && alert.decision && (
                <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #2a2d3a', marginTop: '4px', paddingTop: '16px' }}>
                   <DecisionCard decision={alert.decision} />
                </div>
              )}
            </div>
          ))}
          {alerts.length === 0 && (
             <div style={{ color: '#a0a3b1', fontStyle: 'italic', padding: '24px', textAlign: 'center', background: '#1a1d26', borderRadius: '8px', border: '1px dashed #2a2d3a' }}>
               No recent system activity recorded.
             </div>
          )}
        </div>
      </div>

      {/* Right 40%: Warehouse Panel */}
      <div className="decision-right">
         <WarehousePanel addAlert={addAlert} onSlottingExecuted={onSlottingExecuted} />
      </div>

    </div>
  );
};
