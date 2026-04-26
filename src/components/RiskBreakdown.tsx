import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SignalScores } from '../utils/riskEngine';

type Props = {
  scores: SignalScores;
};

export const RiskBreakdown: React.FC<Props> = ({ scores }) => {
  const getColor = (val: number) => val > 60 ? '#ff4757' : val > 30 ? '#ffa502' : '#00d4aa';
  
  const data = [
    { name: 'W. Dest', score: scores.weatherDest, fill: getColor(scores.weatherDest) },
    { name: 'W. Route', score: scores.weatherRoute, fill: getColor(scores.weatherRoute) },
    { name: 'W. Origin', score: scores.weatherOrigin, fill: getColor(scores.weatherOrigin) },
    { name: 'Delay', score: scores.delay, fill: getColor(scores.delay) },
    { name: 'Geo', score: scores.geopolitical, fill: getColor(scores.geopolitical) },
    { name: 'Tariff', score: scores.tariff, fill: getColor(scores.tariff) },
    { name: 'Reliab.', score: scores.reliability, fill: getColor(scores.reliability) },
    { name: 'Fin+Pol', score: (scores.financial + scores.politics) / 2, fill: getColor((scores.financial + scores.politics) / 2) }
  ];

  return (
    <div className="risk-breakdown-container" style={{ width: '100%', height: 120 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: '#a0a3b1', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            cursor={{ fill: '#22263a' }}
            contentStyle={{ backgroundColor: '#1a1d26', borderColor: '#2a2d3a', color: '#fff', fontSize: 12 }}
          />
          <Bar dataKey="score" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
