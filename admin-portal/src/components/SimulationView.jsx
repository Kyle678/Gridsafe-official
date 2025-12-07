import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, FastForward, Activity, Wifi, Cpu, Database } from 'lucide-react';
import { Card, SectionHeader } from './SharedComponents';

const ML_API = 'http://localhost:5000/api';

const SimulationView = () => {
  // --- Resources ---
  const [models, setModels] = useState([]);
  const [datasets, setDatasets] = useState([]);
  
  // --- Config ---
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [ledIp, setLedIp] = useState('192.168.1.101'); 
  const [targetSection, setTargetSection] = useState('downtown');
  
  // --- Simulation State ---
  const [simulationData, setSimulationData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [logs, setLogs] = useState([]); 
  const [stats, setStats] = useState({ safe: 0, attacks: 0 });

  // 1. Fetch Resources
  useEffect(() => {
    fetch(`${ML_API}/models`).then(r => r.json()).then(d => setModels(d.models || []));
    fetch(`${ML_API}/datasets`).then(r => r.json()).then(d => {
        const sets = (d.datasets || []).map(f => ({ id: f, name: f }));
        setDatasets(sets);
    });
  }, []);

  // 2. Load Simulation
  const loadSimulation = async () => {
    if (!selectedModel || !selectedDataset) return;
    stopSimulation(); // Reset everything
    
    try {
      const res = await fetch(`${ML_API}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model_path: selectedModel.id,
            dataset: selectedDataset.id,
            label_col: "label" 
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
          setSimulationData(data.data);
          alert(`Ready! Loaded ${data.data.length} logs.`);
      }
    } catch (err) {
        console.error("Load Error:", err);
        alert("Failed to load simulation data. Check backend console.");
    }
  };

  // 3. The "Game Loop" - Handles the Timer
  useEffect(() => {
    let timer;
    if (isPlaying && simulationData.length > 0) {
        timer = setTimeout(() => {
            setCurrentIndex(prev => {
                // Stop if we reach the end
                if (prev >= simulationData.length - 1) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, 1000); // 1 Second per log
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, simulationData.length]);

  // 4. The "Renderer" - Handles Side Effects (Logs/LEDs)
  useEffect(() => {
    // Only run if we have data and we are actually playing (or manually stepping)
    if (simulationData.length === 0) return;
    
    const row = simulationData[currentIndex];
    if (!row) return;

    // A. Detect Attack
    const isAttack = row.predicted !== 0;

    // B. Trigger LED (Fire and Forget)
    const color = isAttack ? { r: 255, g: 0, b: 0 } : { r: 0, g: 255, b: 0 };
    // Only send if playing or strictly needed to avoid flooding network on load
    if (isPlaying) {
        fetch(`http://${ledIp}:8000/set-color`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                section: targetSection,
                r: color.r,
                g: color.g,
                b: color.b
            })
        }).catch(e => console.warn("LED Offline"));
    }

    // C. Add Log to Feed
    // We use a functional update to avoid dependency loops
    if (isPlaying) {
        const newLog = {
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            type: isAttack ? (row.predicted === 1 ? 'FDI ATTACK' : 'DoS ATTACK') : 'NORMAL',
            // Handle missing columns safely
            values: `V:${(row.voltage||0).toFixed(1)} C:${(row.current||0).toFixed(1)} T:${(row.temperature||0).toFixed(1)}`
        };

        setLogs(prev => [newLog, ...prev].slice(0, 50));
        setStats(s => ({
            safe: s.safe + (isAttack ? 0 : 1),
            attacks: s.attacks + (isAttack ? 1 : 0)
        }));
    }

  }, [currentIndex, isPlaying, simulationData, ledIp, targetSection]);

  const stopSimulation = () => {
      setIsPlaying(false);
      setCurrentIndex(0);
      setLogs([]);
      setStats({ safe: 0, attacks: 0 });
      // Reset LEDs to Black
      fetch(`http://${ledIp}:8000/off`, { method: 'POST' }).catch(() => {});
  };

  return (
    <div className="grid grid-cols-12 gap-6 p-6 min-h-full">
      {/* --- LEFT: CONFIG --- */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
        <Card className="flex-1 flex flex-col relative">
           <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-orange-500 absolute top-0 left-0" />
           <div className="p-6 flex-1 space-y-6">
              <SectionHeader icon={Activity} title="Simulation Config" />
              
              {/* LED Config */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 mb-1">
                      <Wifi size={16} /> <span className="text-sm font-bold">LED Controller</span>
                  </div>
                  <div>
                      <label className="text-xs text-slate-400">Controller IP</label>
                      <input 
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-sm"
                        value={ledIp} onChange={e => setLedIp(e.target.value)} 
                      />
                  </div>
                  <div>
                      <label className="text-xs text-slate-400">Target Section</label>
                      <select 
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 text-sm"
                        value={targetSection} onChange={e => setTargetSection(e.target.value)}
                      >
                          <option value="downtown">Downtown</option>
                          <option value="suburbs">Suburbs</option>
                          <option value="industrial">Industrial</option>
                          <option value="all">Entire Grid</option>
                      </select>
                  </div>
              </div>

              {/* Dataset Select */}
              <div>
                  <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2"><Database size={14}/> Dataset</label>
                  <select 
                     className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-3 text-slate-200"
                     onChange={(e) => setSelectedDataset(datasets.find(d => d.id === e.target.value))}
                  >
                      <option value="">-- Select Log File --</option>
                      {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
              </div>

              {/* Model Select */}
              <div>
                  <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2"><Cpu size={14}/> Trained Model</label>
                  <select 
                     className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-3 text-slate-200"
                     onChange={(e) => setSelectedModel(models.find(m => m.id === e.target.value))}
                  >
                      <option value="">-- Select Model --</option>
                      {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
              </div>

              {/* Controls */}
              <div className="pt-4 flex gap-2">
                  <button 
                    onClick={loadSimulation}
                    disabled={!selectedModel || !selectedDataset}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-colors
                        ${!selectedModel || !selectedDataset ? 'bg-slate-800 text-slate-500' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                  >
                    Load Data
                  </button>
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={simulationData.length === 0}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors
                        ${simulationData.length === 0 
                            ? 'bg-slate-800 text-slate-500' 
                            : isPlaying 
                                ? 'bg-amber-600/20 text-amber-400 border border-amber-600' 
                                : 'bg-amber-600 text-white hover:bg-amber-500'
                        }`}
                  >
                    {isPlaying ? <><Square size={18} fill="currentColor" /> Pause</> : <><Play size={18} fill="currentColor" /> Play</>}
                  </button>
              </div>
           </div>
        </Card>
      </div>

      {/* --- RIGHT: FEED & VISUALS --- */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
         {/* Stats Bar */}
         <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 flex items-center justify-between bg-slate-800/50">
                <span className="text-slate-400 text-sm">Status</span>
                <span className={`font-mono font-bold ${isPlaying ? 'text-green-400 animate-pulse' : 'text-slate-500'}`}>
                    {isPlaying ? 'LIVE' : 'IDLE'}
                </span>
            </Card>
            <Card className="p-4 flex items-center justify-between bg-emerald-900/10 border-emerald-900/30">
                <span className="text-slate-400 text-sm">Safe Logs</span>
                <span className="font-mono font-bold text-emerald-400">{stats.safe}</span>
            </Card>
            <Card className="p-4 flex items-center justify-between bg-red-900/10 border-red-900/30">
                <span className="text-slate-400 text-sm">Threats</span>
                <span className="font-mono font-bold text-red-400">{stats.attacks}</span>
            </Card>
         </div>

         {/* Log Feed */}
         <Card className="flex-1 flex flex-col relative overflow-hidden min-h-[400px]">
             <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                 <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                     <Activity size={18} className="text-amber-500" />
                     Live Traffic Feed
                 </h3>
                 <span className="text-xs text-slate-500 font-mono">
                     {currentIndex} / {simulationData.length}
                 </span>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm custom-scrollbar bg-black/20">
                 {logs.length === 0 && (
                     <div className="text-center text-slate-600 mt-20">
                         {simulationData.length > 0 ? "Press Play to start..." : "Load data to begin simulation."}
                     </div>
                 )}
                 {logs.map((log) => (
                     <div key={log.id} className={`p-3 rounded border flex justify-between items-center animate-in fade-in slide-in-from-top-2
                        ${log.type === 'NORMAL' 
                            ? 'bg-emerald-950/30 border-emerald-900/30 text-emerald-300' 
                            : 'bg-red-950/40 border-red-900/50 text-red-300'
                        }`}
                     >
                         <div className="flex items-center gap-3">
                             <span className="text-xs opacity-50">{log.time}</span>
                             <span className={`font-bold ${log.type !== 'NORMAL' ? 'text-red-400' : ''}`}>{log.type}</span>
                         </div>
                         <div className="text-xs opacity-70">
                             {log.values}
                         </div>
                     </div>
                 ))}
             </div>
         </Card>
      </div>
    </div>
  );
};

export default SimulationView;