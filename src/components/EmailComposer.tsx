import React, { useState, useEffect } from 'react';
import { composeEmail } from '../utils/geminiClient';
import { Shipment } from '../constants/mockData';

export type EmailComposerData = {
  supplier: any;
  shipment: Shipment | null;
  alternateSupplier: any | null;
  alternateRoute: string | null;
  financialImpact: string | null;
  etaImpact: string | null;
  top2RiskSignals?: string;
  riskScore?: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  data: EmailComposerData | null;
  initialType: 'cancel' | 'reroute' | 'newOrder';
};

export const EmailComposer: React.FC<Props> = ({ isOpen, onClose, data, initialType }) => {
  const [emailType, setEmailType] = useState(initialType);
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState('📋 Copy');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setEmailType(initialType);
    setGeneratedEmail(null);
    setIsEditing(false);
  }, [initialType, data]);

  if (!data) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedEmail(null);
    setIsEditing(false);

    const productNames = data.shipment ? [data.shipment.product] : (data.supplier.products || []);
    
    const res = await composeEmail(
      emailType,
      data.supplier.name,
      data.supplier.country,
      productNames,
      data.shipment?.id || "N/A",
      data.riskScore || 0,
      data.shipment?.delayHours || 0,
      data.top2RiskSignals || "N/A",
      data.alternateRoute || undefined,
      data.financialImpact || undefined,
      data.shipment?.unitsInShipment || undefined,
      data.supplier.costPerUnit || undefined,
      data.supplier.etaDays || undefined
    );

    setGeneratedEmail(res);
    setIsGenerating(false);
  };

  const handleCopy = () => {
    if (!generatedEmail) return;
    const text = `Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`;
    navigator.clipboard.writeText(text);
    setCopyStatus('✓ Copied!');
    setTimeout(() => setCopyStatus('📋 Copy'), 2000);
  };

  const handleGmail = () => {
    if (!generatedEmail) return;
    const url = `https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(generatedEmail.subject)}&body=${encodeURIComponent(generatedEmail.body)}`;
    window.open(url, '_blank');
  };

  return (
    <>
      {isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={onClose} />
      )}
      <div 
        className="smooth-transition"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: window.innerWidth < 600 ? '100%' : '480px',
          background: '#1a1d26', borderLeft: '2px solid #00d4aa',
          zIndex: 1001, display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ background: '#22263a', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>✉ AI Email Composer</h2>
            <div style={{ fontSize: '12px', color: '#a0a3b1', marginTop: '2px' }}>{data.supplier.flag} {data.supplier.name} · {data.supplier.country}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#a0a3b1', fontSize: '24px', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setEmailType('cancel')}
              style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ff4757', background: emailType === 'cancel' ? '#ff4757' : 'transparent', color: emailType === 'cancel' ? '#0f1117' : '#ff4757', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              🚫 Cancel Order
            </button>
            <button 
              onClick={() => setEmailType('reroute')}
              style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ffa502', background: emailType === 'reroute' ? '#ffa502' : 'transparent', color: emailType === 'reroute' ? '#0f1117' : '#ffa502', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              🔄 Request Reroute
            </button>
            <button 
              onClick={() => setEmailType('newOrder')}
              style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #00d4aa', background: emailType === 'newOrder' ? '#00d4aa' : 'transparent', color: emailType === 'newOrder' ? '#0f1117' : '#00d4aa', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              📦 Place New Order
            </button>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid #2a2d3a' }}>
            <button 
              onClick={() => setIsContextExpanded(!isContextExpanded)}
              style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none', color: '#a0a3b1', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
            >
              Context Panel {isContextExpanded ? '▲' : '▼'}
            </button>
            {isContextExpanded && (
              <div style={{ padding: '0 12px 12px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: '#888' }}>
                <div>Supplier: <span style={{ color: '#ccc' }}>{data.supplier.name}</span></div>
                <div>ID: <span style={{ color: '#ccc' }}>{data.shipment?.id || 'N/A'}</span></div>
                <div>Risk Score: <span style={{ color: '#ccc' }}>{data.riskScore || 'N/A'}</span></div>
                <div>Delay: <span style={{ color: '#ccc' }}>{data.shipment?.delayHours.toFixed(1) || 0}h</span></div>
                <div style={{ gridColumn: 'span 2' }}>Signals: <span style={{ color: '#ccc' }}>{data.top2RiskSignals || 'N/A'}</span></div>
              </div>
            )}
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{ width: '100%', padding: '14px', borderRadius: '4px', border: 'none', background: '#00d4aa', color: '#0f1117', fontSize: '14px', fontWeight: 700, cursor: isGenerating ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
          >
            {isGenerating ? '✨ Thinking...' : '✨ Generate Email with Gemini'}
          </button>

          {isGenerating && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="skeleton" style={{ height: '24px', width: '60%' }} />
              <div className="skeleton" style={{ height: '200px' }} />
            </div>
          )}

          {generatedEmail && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.5s ease' }}>
              <div style={{ background: '#0f1117', border: `1px solid ${isEditing ? '#00d4aa' : '#2a2d3a'}`, borderRadius: '6px', padding: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', borderBottom: '1px solid #2a2d3a', paddingBottom: '8px', marginBottom: '12px' }}>
                  {generatedEmail.subject}
                </div>
                <div 
                  contentEditable={isEditing}
                  onBlur={(e) => setGeneratedEmail({ ...generatedEmail, body: e.currentTarget.innerText })}
                  style={{ fontSize: '13px', lineHeight: 1.8, color: '#e0e0e0', whiteSpace: 'pre-wrap', outline: 'none' }}
                >
                  {generatedEmail.body}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <button 
                  onClick={handleCopy}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #2a2d3a', background: '#22263a', color: '#fff', fontSize: '11px', cursor: 'pointer' }}
                >
                  {copyStatus}
                </button>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #2a2d3a', background: isEditing ? '#00d4aa' : '#22263a', color: isEditing ? '#0f1117' : '#fff', fontSize: '11px', cursor: 'pointer' }}
                >
                  {isEditing ? '✓ Done' : '✏ Edit'}
                </button>
                <button 
                  onClick={handleGenerate}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #2a2d3a', background: '#22263a', color: '#fff', fontSize: '11px', cursor: 'pointer' }}
                >
                  🔄 Regenerate
                </button>
                <button 
                  onClick={handleGmail}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #2a2d3a', background: '#22263a', color: '#fff', fontSize: '11px', cursor: 'pointer' }}
                >
                  📤 Gmail
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};
