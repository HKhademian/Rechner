import { useState } from 'preact/hooks';
import { saveScenario, deductions } from '../store/calculatorStore';

export default function ScenarioSaver() {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const handleSave = () => {
    if (!title.trim()) return;
    // Save current deductions snapshot
    saveScenario(title.trim(), desc.trim(), deductions.value);
    setTitle('');
    setDesc('');
  };

  return (
    <div style="background: rgba(0,0,0,0.15); padding: 15px; border-radius: 8px; margin-top: 20px;">
      <h3 style="margin: 0 0 10px 0; font-size: 1.1rem; color: #f8fafc;">💾 Save Scenario to Compare</h3>
      <p style="font-size: 0.85rem; color: #94a3b8; margin: 0 0 15px 0;">
        Snapshot your current inputs to compare them side-by-side in the table below.
      </p>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <input 
          type="text" 
          placeholder="Scenario Title (e.g. 'Munich Offer')" 
          value={title} 
          onInput={(e) => setTitle(e.target.value)} 
          style="padding: 10px; border-radius: 6px; border: 1px solid var(--card-border); background: rgba(255,255,255,0.05); color: #fff;"
        />
        <input 
          type="text" 
          placeholder="Short Description (optional)" 
          value={desc} 
          onInput={(e) => setDesc(e.target.value)} 
          style="padding: 10px; border-radius: 6px; border: 1px solid var(--card-border); background: rgba(255,255,255,0.05); color: #fff;"
        />
        <button 
          onClick={handleSave} 
          disabled={!title.trim()}
          style={`padding: 10px; border-radius: 6px; border: none; font-weight: bold; cursor: ${title.trim() ? 'pointer' : 'not-allowed'}; transition: 0.2s; background: ${title.trim() ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; color: ${title.trim() ? '#fff' : '#94a3b8'};`}
        >
          Save to Comparison Table
        </button>
      </div>
    </div>
  );
}
