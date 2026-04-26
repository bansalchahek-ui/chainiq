import React from 'react';
import { DecisionResult } from '../utils/decisionEngine';

export const DecisionCard: React.FC<{ decision: DecisionResult }> = ({ decision }) => {
  const getLabelColor = (action: string) => {
    switch(action) {
      case 'reroute': return '#378add';
      case 'displace': return '#7c5cbf';
      case 'expedite_approved': return '#00d4aa';
      case 'hold': return '#ffa502';
      default: return '#a0a3b1';
    }
  };

  const uspName = decision.usp.replace(/_/g, ' ').toUpperCase();
  const actionLabel = decision.action.toUpperCase();

  return (
    <div className="decision-card" style={{
      background: '#22263a',
      border: '1px solid #2a2d3a',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#a0a3b1', letterSpacing: '0.04em' }}>{uspName}</span>
        <span style={{ 
          fontSize: '10px', 
          padding: '2px 6px', 
          borderRadius: '4px', 
          background: decision.approved ? 'rgba(0, 212, 170, 0.15)' : 'rgba(255, 165, 2, 0.15)',
          color: decision.approved ? '#00d4aa' : '#ffa502',
          fontWeight: 600
        }}>
          {decision.approved ? 'AUTO-APPROVED' : 'MANUAL REVIEW'}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>Action:</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: getLabelColor(decision.action) }}>{actionLabel}</span>
        </div>
        {decision.urgency && (
          <span style={{
            fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
            background: decision.urgency === 'critical' ? 'rgba(255, 71, 87, 0.15)' : 'rgba(255, 165, 2, 0.15)',
            color: decision.urgency === 'critical' ? '#ff4757' : '#ffa502'
          }}>
            {decision.urgency.toUpperCase()}
          </span>
        )}
      </div>

      {(decision.financialImpact !== undefined || decision.netSaving !== undefined) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #2a2d3a', paddingTop: '8px', marginTop: '4px' }}>
          <span style={{ fontSize: '12px', color: '#a0a3b1' }}>Financial Impact</span>
          <span style={{ fontSize: '12px', color: '#00d4aa', fontWeight: 600 }}>
            +${decision.financialImpact || decision.netSaving}
          </span>
        </div>
      )}
    </div>
  );
};
