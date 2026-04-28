import React, { useState } from 'react';
import { Product, ProductPortfolio } from '../constants/mockData';
import { toast } from 'react-hot-toast';

type Props = {
  setProducts: React.Dispatch<React.SetStateAction<ProductPortfolio>>;
  addAlert: (message: string, icon: string, impact?: number) => void;
};

export const DataIntegration: React.FC<Props> = ({ setProducts, addAlert }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    supplierName: '',
    profit: '',
    unitsSold: ''
  });

  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.profit || !formData.unitsSold) return;

    const profitNum = parseFloat(formData.profit);
    const unitsSoldNum = parseInt(formData.unitsSold);

    const newProduct: Product = {
      name: formData.name,
      category: formData.category || 'General',
      profit: profitNum,
      unitsSold: unitsSoldNum
    };

    // Simple quadrant logic
    let targetKey: keyof ProductPortfolio = 'stars';
    if (profitNum > 20 && unitsSoldNum > 1000) targetKey = 'stars';
    else if (profitNum > 20 && unitsSoldNum <= 1000) targetKey = 'hiddenGems';
    else if (profitNum <= 20 && unitsSoldNum > 1000) targetKey = 'volumeDrivers';
    else targetKey = 'deadWeight';

    setProducts(prev => ({
      ...prev,
      [targetKey]: [...prev[targetKey], newProduct]
    }));

    addAlert(`New product "${newProduct.name}" added to ${targetKey} quadrant.`, '📦', 0);
    setFormData({ name: '', category: '', supplierName: '', profit: '', unitsSold: '' });
  };

  const handleBillCapture = () => {
    setLoading(true);
    const toastId = toast.loading("Processing Digital Invoice...");

    setTimeout(() => {
      setProducts(prev => {
        // Find "Wireless Earbuds" and increment unitsSold by +450, ensure it's a Star
        const next = { ...prev };
        let found = false;
        
        // Remove from any quadrant first
        for (const key in next) {
          const k = key as keyof ProductPortfolio;
          const idx = next[k].findIndex(p => p.name === 'Wireless Earbuds');
          if (idx !== -1) {
            const product = next[k].splice(idx, 1)[0];
            product.unitsSold += 450;
            product.quadrantId = 'Stars'; // Ensure it's marked as Star
            next.stars.push(product);
            found = true;
            break;
          }
        }
        
        if (!found) {
          // If not found, add as new star
          next.stars.push({ name: 'Wireless Earbuds', profit: 18, unitsSold: 450, category: 'Electronics', quadrantId: 'Stars' });
        }
        
        return next;
      });

      toast.dismiss(toastId);
      toast.success("Bill Recorded: +450 Units added to Wireless Earbuds");
      addAlert("✅ Bill Processed: +450 Wireless Earbuds recorded. Portfolio updated.", "📑", 0);
      
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="scrollable-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '40px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#fff' }}>Data Integration Center</h1>
          <p style={{ margin: '8px 0 0 0', color: '#a0a3b1', fontSize: '14px' }}>Connect your e-commerce platform and logistics data in real-time.</p>
        </div>
        <button 
          onClick={handleBillCapture}
          disabled={loading}
          style={{ 
            background: loading ? '#22263a' : 'linear-gradient(135deg, #00d4aa 0%, #00a181 100%)', 
            color: '#0f1117', 
            border: 'none', 
            padding: '12px 24px', 
            borderRadius: '8px', 
            fontWeight: 700, 
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(0, 212, 170, 0.2)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseOut={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <span>{loading ? '⏳ Parsing Bill...' : '📄 Digital Bill Capture'}</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        
        {/* Manual Entry Form */}
        <div style={{ background: '#1a1d26', border: '1px solid #2a2d3a', borderRadius: '16px', padding: '24px' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#00d4aa' }}>⌨</span> Manual Product Entry
          </h2>
          <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#a0a3b1', textTransform: 'uppercase', fontWeight: 600 }}>Product Name</label>
              <input 
                type="text" name="name" value={formData.name} onChange={handleInputChange} 
                placeholder="e.g. Smart Watch v2"
                style={{ background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: '6px', padding: '10px', color: '#fff', outline: 'none' }} 
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: '#a0a3b1', textTransform: 'uppercase', fontWeight: 600 }}>Category</label>
                <select 
                  name="category" value={formData.category} onChange={handleInputChange}
                  style={{ background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: '6px', padding: '10px', color: '#fff', outline: 'none' }}
                >
                  <option value="">Select Category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Apparel">Apparel</option>
                  <option value="Home">Home</option>
                  <option value="Footwear">Footwear</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: '#a0a3b1', textTransform: 'uppercase', fontWeight: 600 }}>Supplier Name</label>
                <input 
                  type="text" name="supplierName" value={formData.supplierName} onChange={handleInputChange}
                  placeholder="e.g. AsiaTech"
                  style={{ background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: '6px', padding: '10px', color: '#fff', outline: 'none' }} 
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: '#a0a3b1', textTransform: 'uppercase', fontWeight: 600 }}>Profit per Unit ($)</label>
                <input 
                  type="number" name="profit" value={formData.profit} onChange={handleInputChange}
                  placeholder="25.00"
                  style={{ background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: '6px', padding: '10px', color: '#fff', outline: 'none' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: '#a0a3b1', textTransform: 'uppercase', fontWeight: 600 }}>Units Sold (30d)</label>
                <input 
                  type="number" name="unitsSold" value={formData.unitsSold} onChange={handleInputChange}
                  placeholder="1200"
                  style={{ background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: '6px', padding: '10px', color: '#fff', outline: 'none' }} 
                />
              </div>
            </div>
            <button 
              type="submit"
              style={{ marginTop: '8px', background: 'transparent', border: '1px solid #00d4aa', color: '#00d4aa', padding: '12px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#00d4aa'; e.currentTarget.style.color = '#0f1117'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#00d4aa'; }}
            >
              Add Product to Matrix
            </button>
          </form>
        </div>

        {/* Integration Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#1a1d26', border: '1px solid #2a2d3a', borderRadius: '16px', padding: '24px', flex: 1 }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#00d4aa' }}>📊</span> Connection Status
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#0f1117', borderRadius: '8px', border: '1px solid #2a2d3a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00d4aa' }}></div>
                  <span style={{ color: '#fff', fontSize: '14px' }}>Shopify Storefront API</span>
                </div>
                <span style={{ color: '#a0a3b1', fontSize: '12px' }}>Connected</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#0f1117', borderRadius: '8px', border: '1px solid #2a2d3a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00d4aa' }}></div>
                  <span style={{ color: '#fff', fontSize: '14px' }}>ERP / Inventory Bridge</span>
                </div>
                <span style={{ color: '#a0a3b1', fontSize: '12px' }}>Connected</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#0f1117', borderRadius: '8px', border: '1px solid #2a2d3a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffa502' }}></div>
                  <span style={{ color: '#fff', fontSize: '14px' }}>Custom Bill Capture</span>
                </div>
                <span style={{ color: '#a0a3b1', fontSize: '12px' }}>Awaiting Sync</span>
              </div>
            </div>
          </div>
          
          <div style={{ background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.05) 0%, rgba(55, 138, 221, 0.05) 100%)', border: '1px dashed #2a2d3a', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px' }}>☁</div>
            <div style={{ color: '#fff', fontWeight: 600 }}>Sync External Data Source</div>
            <div style={{ color: '#a0a3b1', fontSize: '12px' }}>Drag and drop your JSON/CSV logistics reports here to auto-populate the engine.</div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default DataIntegration;