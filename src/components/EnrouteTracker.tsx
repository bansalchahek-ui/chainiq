import React from 'react';
import { Shipment } from '../constants/mockData';
import { ShipmentWeather } from '../utils/weatherForecast';
import { SignalScores } from '../utils/riskEngine';

type Props = {
  shipment: Shipment;
  weather: ShipmentWeather | null;
  scores: SignalScores | null;
  onClick: () => void;
};

export const EnrouteTracker: React.FC<Props> = ({ shipment, weather, scores, onClick }) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ON_TIME': return '#00d4aa';
      case 'AT_RISK': return '#ffa502';
      case 'DISRUPTED': return '#ff4757';
      case 'REROUTED': return '#378add';
      default: return '#a0a3b1';
    }
  };

  const statusColor = getStatusColor(shipment.status);

  const isBadWeather = (cond?: string) => cond && (cond.includes('rain') || cond.includes('snow') || cond.includes('storm') || cond.includes('sandstorm'));
  
  const destWeather = weather?.dest.condition || 'cloudy';
  const badWeatherColor = destWeather.includes('heavy') || destWeather.includes('storm') || destWeather.includes('snow') || destWeather.includes('sandstorm') ? '#ff4757' : '#ffa502';

  const truncatedName = shipment.product.length > 14 ? shipment.product.substring(0, 14) + '...' : shipment.product;

  return (
    <div 
      className="smooth-transition enroute-pill"
      style={{
        background: '#1a1d26',
        border: '1px solid #2a2d3a',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flexShrink: 0,
        position: 'relative',
        paddingBottom: '16px' // give room for bottom progress bar
      }}
      onClick={onClick}
      onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = statusColor; }}
      onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#2a2d3a'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
          {shipment.id} <span style={{ color: '#a0a3b1', fontWeight: 400 }}>{truncatedName}</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            background: statusColor, color: '#0f1117', fontWeight: 700, fontSize: '11px',
            padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace'
          }}>
            {scores ? scores.total : '--'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
        <span style={{ color: statusColor, fontWeight: 600, letterSpacing: '0.04em' }}>
          {shipment.status?.replace('_', ' ')}
        </span>
        
        {weather && (
          <span style={{ 
            color: isBadWeather(destWeather) ? badWeatherColor : '#a0a3b1',
            fontWeight: isBadWeather(destWeather) ? 600 : 400,
            background: isBadWeather(destWeather) ? `${badWeatherColor}15` : 'transparent',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            📦 {destWeather} {isBadWeather(destWeather) && '⚠'}
          </span>
        )}
      </div>

      {/* 3px Bottom Progress Bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', background: '#2a2d3a', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        <div style={{ 
          width: `${shipment.progressPct}%`, 
          height: '100%', 
          background: statusColor,
          transition: 'width 1s ease, background 0.4s ease'
        }} />
      </div>
    </div>
  );
};
