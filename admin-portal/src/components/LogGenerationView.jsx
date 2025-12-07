import React, { useState } from 'react';
import { FilePlus, Database, Loader2, CheckCircle, AlertCircle, ShieldAlert, Zap } from 'lucide-react';
import { Card, SectionHeader, StatusBadge, HyperparameterInput } from './SharedComponents';

const LogGenerationView = () => {
  // Config State
  const [totalSamples, setTotalSamples] = useState(5000);
  
  // Specific Attack Percentages
  const [fdiPercent, setFdiPercent] = useState(10);
  const [dosPercent, setDosPercent] = useState(0);

  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  // Calculated Values
  const fdiCount = Math.round(totalSamples * (fdiPercent / 100));
  const dosCount = Math.round(totalSamples * (dosPercent / 100));
  const normalCount = Math.max(0, totalSamples - (fdiCount + dosCount));
  const normalPercent = Math.max(0, 100 - (fdiPercent + dosPercent));

  // --- HANDLERS WITH CLAMPING LOGIC ---

  // 1. Handle FDI Changes (Slider & Input)
  const updateFdi = (newVal, isCount = false) => {
    let newPercent = isCount ? (newVal / totalSamples) * 100 : newVal;
    
    // Constraint: Cannot exceed what is left after DoS is accounted for
    const maxAllowed = 100 - dosPercent;
    
    // Clamp the value
    let validPercent = Math.min(Math.max(0, newPercent), maxAllowed);
    
    // If it was a count input, ensure we don't exceed totalSamples
    if (isCount && newVal > totalSamples) validPercent = (totalSamples / totalSamples) * 100;

    setFdiPercent(validPercent);
  };

  // 2. Handle DoS Changes (Slider & Input)
  const updateDos = (newVal, isCount = false) => {
    let newPercent = isCount ? (newVal / totalSamples) * 100 : newVal;
    
    // Constraint: Cannot exceed what is left after FDI is accounted for
    const maxAllowed = 100 - fdiPercent;
    
    // Clamp the value
    let validPercent = Math.min(Math.max(0, newPercent), maxAllowed);

    if (isCount && newVal > totalSamples) validPercent = (totalSamples / totalSamples) * 100;

    setDosPercent(validPercent);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setLastResult(null);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            total_samples: parseInt(totalSamples),
            fdi_percent: parseFloat(fdiPercent),
            dos_percent: parseFloat(dosPercent)
        })
      });

      if (!response.ok) throw new Error("Generation failed");
      const data = await response.json();
      setLastResult(data.details);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 p-6 min-h-full">
      {/* --- Controls Column --- */}
      <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
        <Card className="flex-1 flex flex-col relative">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 absolute top-0 left-0" />
          
          <div className="p-6 flex-1 space-y-8">
            <SectionHeader icon={FilePlus} title="Data Generation Config" />
            
            {/* 1. Total Samples */}
            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                <HyperparameterInput 
                    label="Total Logs (Master Limit)" 
                    value={totalSamples} 
                    onChange={setTotalSamples} 
                    min={100} max={50000} step={100} 
                />
            </div>

            {/* 2. Visual Distribution Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <span>Distribution Preview</span>
                    <span>{normalPercent.toFixed(1)}% Normal</span>
                </div>
                <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex">
                    <div style={{ width: `${fdiPercent}%` }} className="bg-orange-500 h-full transition-all duration-300" />
                    <div style={{ width: `${dosPercent}%` }} className="bg-red-600 h-full transition-all duration-300" />
                    <div className="bg-emerald-600/50 h-full flex-1 transition-all duration-300" />
                </div>
            </div>

            {/* 3. Attack Specific Controls */}
            <div className="space-y-4">
                
                {/* FDI Control */}
                <div className={`p-4 rounded-xl border transition-all ${fdiPercent > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-slate-800/30 border-slate-800'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <ShieldAlert size={18} className={fdiPercent > 0 ? "text-orange-400" : "text-slate-500"} />
                            <span className="font-semibold text-slate-200">FDI Injection</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={fdiCount}
                                onChange={(e) => updateFdi(Number(e.target.value), true)}
                                className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-sm font-mono text-orange-400 focus:outline-none focus:border-orange-500 transition-colors"
                            />
                            <span className="text-xs text-slate-500">Logs</span>
                        </div>
                    </div>
                    
                    <input 
                        type="range" min="0" max="100" step="0.1"
                        value={fdiPercent}
                        onChange={(e) => updateFdi(Number(e.target.value), false)}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="text-right mt-1 text-xs text-slate-400">{fdiPercent.toFixed(1)}% of Total</div>
                </div>

                {/* DoS Control */}
                <div className={`p-4 rounded-xl border transition-all ${dosPercent > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/30 border-slate-800'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Zap size={18} className={dosPercent > 0 ? "text-red-400" : "text-slate-500"} />
                            <span className="font-semibold text-slate-200">DoS Overload</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={dosCount}
                                onChange={(e) => updateDos(Number(e.target.value), true)}
                                className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-sm font-mono text-red-400 focus:outline-none focus:border-red-500 transition-colors"
                            />
                            <span className="text-xs text-slate-500">Logs</span>
                        </div>
                    </div>

                    <input 
                        type="range" min="0" max="100" step="0.1"
                        value={dosPercent}
                        onChange={(e) => updateDos(Number(e.target.value), false)}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                    />
                    <div className="text-right mt-1 text-xs text-slate-400">{dosPercent.toFixed(1)}% of Total</div>
                </div>

            </div>
          </div>

          <div className="p-6 border-t border-slate-800 bg-slate-900/50">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-300
                ${isGenerating
                  ? 'bg-emerald-600/20 text-emerald-400 cursor-wait'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                }`}
            >
              {isGenerating ? <><Loader2 className="animate-spin" size={20} /> Generating...</> : <><Database size={20} /> Generate Dataset</>}
            </button>
          </div>
        </Card>
      </div>

      {/* --- Output Column --- */}
      <div className="col-span-12 lg:col-span-7">
        <Card className="h-full flex items-center justify-center relative min-h-[400px]">
          {!lastResult && !isGenerating && !error && (
            <div className="text-center p-8">
              <Database size={64} className="text-slate-700 mx-auto mb-4" />
              <p className="text-xl font-medium text-slate-400">Ready to Generate</p>
              <p className="text-slate-600 mt-2">Adjust attack parameters to create custom scenarios.</p>
            </div>
          )}
          {isGenerating && (
             <div className="text-center z-10">
              <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-lg text-emerald-400 font-medium animate-pulse">Simulating Grid Activity...</p>
            </div>
          )}
          {error && (
            <div className="text-center p-8">
                <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-400">Error</h2>
                <p className="text-slate-400 mt-2">{error}</p>
            </div>
          )}
          {lastResult && (
            <div className="w-full max-w-lg p-6 animate-in fade-in zoom-in duration-300">
              <div className="text-center mb-8">
                <CheckCircle size={64} className="text-emerald-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white">Generation Complete</h2>
              </div>
              <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                   <span className="text-slate-400 text-sm">Filename</span>
                   <span className="text-emerald-400 font-mono text-sm">{lastResult.filename}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-slate-400 text-sm">Total Samples</span>
                   <StatusBadge label="Rows" value={lastResult.total_samples.toLocaleString()} />
                </div>
                
                <div className="pt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-emerald-900/20 p-2 rounded border border-emerald-900/50">
                        <div className="text-xs text-emerald-400 mb-1">Normal</div>
                        <div className="font-mono font-bold">{lastResult.breakdown.normal}</div>
                    </div>
                    <div className="bg-orange-900/20 p-2 rounded border border-orange-900/50">
                        <div className="text-xs text-orange-400 mb-1">FDI</div>
                        <div className="font-mono font-bold">{lastResult.breakdown.fdi}</div>
                    </div>
                    <div className="bg-red-900/20 p-2 rounded border border-red-900/50">
                        <div className="text-xs text-red-400 mb-1">DoS</div>
                        <div className="font-mono font-bold">{lastResult.breakdown.dos}</div>
                    </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
export default LogGenerationView;