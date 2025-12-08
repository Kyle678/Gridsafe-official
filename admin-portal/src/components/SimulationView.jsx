import React, { useState, useEffect } from 'react';
import { Play, Square, FastForward, Activity, Wifi, Cpu, Database, Clock, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
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
  
  // --- Playback Speed State ---
  const [playbackSpeed, setPlaybackSpeed] = useState(1); 

  // --- Simulation State ---
  const [simulationData, setSimulationData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [logs, setLogs] = useState([]); 
  
  // --- Detailed Stats ---
  const [stats, setStats] = useState({ 
      safe: 0, 
      attacks: 0, 
      correct: 0, 
      missedAttacks: 0, 
      totalProcessed: 0
  });

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
    stopSimulation(); 
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
        alert("Failed to load simulation data.");
    }
  };

  // 3. The "Game Loop"
  useEffect(() => {
    let timer;
    if (isPlaying && simulationData.length > 0) {
        const currentRow = simulationData[currentIndex];
        const nextRow = simulationData[currentIndex + 1];

        if (!nextRow) {
            setIsPlaying(false);
            return;
        }

        // Calculate Delay based on timestamps
        let delay = 1000; 
        if (currentRow.timestamp && nextRow.timestamp) {
            const t1 = new Date(currentRow.timestamp).getTime();
            const t2 = new Date(nextRow.timestamp).getTime();
            delay = t2 - t1;
            if (delay < 0) delay = 100; 
            if (delay > 5000) delay = 2000;
        }

        // Apply Speed Multiplier
        const adjustedDelay = delay / playbackSpeed;

        timer = setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
        }, adjustedDelay);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, simulationData, playbackSpeed]);

  // 4. The "Renderer"
  useEffect(() => {
    if (simulationData.length === 0) return;
    
    const row = simulationData[currentIndex];
    if (!row) return;

// A. Logic & Stats
    const isAttackPredicted = row.predicted !== 0;
    const isActuallyAttack = row.actual !== 0;
    const isCorrect = row.predicted === row.actual;
    // Missed = It was an attack, but we predicted 0 (Safe)
    const isMissedAttack = isActuallyAttack && !isAttackPredicted; 
    // Caught = It was an attack, and we predicted !0 (Attack)
    const isCaughtAttack = isActuallyAttack && isAttackPredicted;

    // B. Trigger LED
    if (isPlaying) {
        // 1. Determine Color based on Performance
        let color = { r: 0, g: 255, b: 0 }; // Default: Green (Safe/Normal)

        if (isMissedAttack) {
            // RED: DANGER - The model failed to stop an attack
            color = { r: 255, g: 0, b: 0 }; 
        } else if (isCaughtAttack) {
            // ORANGE: WARNING - Attack happening, but system caught it
            color = { r: 255, g: 50, b: 0 }; 
        } else if (isAttackPredicted && !isActuallyAttack) {
            // (Optional) False Positive: System panicked but it was safe
            // Let's make this Yellow/Orange too to show system activity
            color = { r: 255, g: 200, b: 0 };
        }

        // 2. Send Request (We send it on every tick now to ensure color updates immediately)
        fetch(`http://${ledIp}:8000/set-color`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                section: targetSection,
                r: color.r,
                g: color.g,
                b: color.b
            })
        }).catch(() => {});
    }

    // C. Update UI
    if (isPlaying) {
        const simTime = row.timestamp 
            ? new Date(row.timestamp).toLocaleTimeString([], { hour12: false }) 
            : new Date().toLocaleTimeString();

        let logType = 'OK';
        if (isMissedAttack) logType = 'MISSED';
        else if (isAttackPredicted) logType = row.predicted === 1 ? 'FDI' : 'DoS';

        const newLog = {
            id: Date.now() + Math.random(),
            time: simTime,
            type: logType,
            predVal: row.predicted,
            actualVal: row.actual,
            isCorrect: isCorrect,
            isMissed: isMissedAttack,
            values: `V:${(row.voltage||0).toFixed(1)} C:${(row.current||0).toFixed(1)}`
        };

        setLogs(prev => [newLog, ...prev].slice(0, 50));
        setStats(s => ({
            safe: s.safe + (!isAttackPredicted ? 1 : 0),
            attacks: s.attacks + (isAttackPredicted ? 1 : 0),
            correct: s.correct + (isCorrect ? 1 : 0),
            missedAttacks: s.missedAttacks + (isMissedAttack ? 1 : 0),
            totalProcessed: s.totalProcessed + 1
        }));
    }

  }, [currentIndex, isPlaying, simulationData, ledIp, targetSection]);

  const stopSimulation = () => {
      setIsPlaying(false);
      setCurrentIndex(0);
      setLogs([]);
      setStats({ safe: 0, attacks: 0, correct: 0, missedAttacks: 0, totalProcessed: 0 });
      fetch(`http://${ledIp}:8000/off`, { method: 'POST' }).catch(() => {});
  };

  const accuracy = stats.totalProcessed > 0 
    ? ((stats.correct / stats.totalProcessed) * 100).toFixed(1) 
    : "100.0";

  return (
    <div className="grid grid-cols-12 gap-6 p-6 min-h-full">
      {/* --- LEFT: CONFIG --- */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
        <Card className="flex-1 flex flex-col relative">
           <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-orange-500 absolute top-0 left-0" />
           <div className="p-6 flex-1 space-y-6">
              <SectionHeader icon={Activity} title="Simulation Config" />
              
              {/* --- RESTORED: LED Config --- */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 mb-1">
                      <Wifi size={16} /> <span className="text-sm font-bold">LED Controller</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Controller IP</label>
                        <input 
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-sm"
                            value={ledIp} onChange={e => setLedIp(e.target.value)} 
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Target Zone</label>
                        <select 
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-sm"
                            value={targetSection} onChange={e => setTargetSection(e.target.value)}
                        >
                            <option value="downtown">Downtown</option>
                            <option value="suburbs">Suburbs</option>
                            <option value="industrial">Industrial</option>
                            <option value="all">Entire Grid</option>
                        </select>
                    </div>
                  </div>
              </div>

              {/* Playback Controls & Speed */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-4">
                  <div className="flex items-center justify-between text-amber-400 mb-1">
                      <div className="flex items-center gap-2">
                        <FastForward size={16} /> <span className="text-sm font-bold">Playback Control</span>
                      </div>
                      <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-300">
                          {playbackSpeed}x Speed
                      </span>
                  </div>
                  
                  <input 
                    type="range" 
                    min="1" max="100" step="1"
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />

                  <div className="flex gap-2 pt-2">
                      <button 
                        onClick={loadSimulation}
                        disabled={!selectedModel || !selectedDataset}
                        className={`flex-1 py-3 rounded-lg font-semibold transition-colors
                            ${!selectedModel || !selectedDataset ? 'bg-slate-800 text-slate-500' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                      >
                        Load
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
                        {isPlaying ? <><Square size={18} fill="currentColor" /> Stop</> : <><Play size={18} fill="currentColor" /> Play</>}
                      </button>
                  </div>
              </div>

              {/* Data Selection */}
              <div className="space-y-4">
                  <div>
                      <label className="text-sm text-slate-400 mb-2 flex items-center gap-2"><Database size={14}/> Dataset</label>
                      <select 
                         className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-3 text-slate-200"
                         onChange={(e) => setSelectedDataset(datasets.find(d => d.id === e.target.value))}
                      >
                          <option value="">-- Select Log File --</option>
                          {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="text-sm text-slate-400 mb-2 flex items-center gap-2"><Cpu size={14}/> Model</label>
                      <select 
                         className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-3 text-slate-200"
                         onChange={(e) => setSelectedModel(models.find(m => m.id === e.target.value))}
                      >
                          <option value="">-- Select Model --</option>
                          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                  </div>
              </div>
           </div>
        </Card>
      </div>

      {/* --- RIGHT: FEED & VISUALS --- */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
         {/* Stats Bar */}
         <div className="grid grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col justify-between bg-slate-800/50">
                <span className="text-slate-400 text-xs flex items-center gap-1"><CheckCircle size={12}/> Model Accuracy</span>
                <span className={`font-mono text-2xl font-bold ${Number(accuracy) > 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {accuracy}%
                </span>
            </Card>

            <Card className="p-4 flex flex-col justify-between bg-purple-900/10 border-purple-900/30">
                <span className="text-slate-400 text-xs flex items-center gap-1"><ShieldAlert size={12}/> Missed Attacks</span>
                <span className="font-mono text-2xl font-bold text-purple-400">
                    {stats.missedAttacks}
                </span>
            </Card>

            <Card className="p-4 flex flex-col justify-between bg-red-900/10 border-red-900/30">
                <span className="text-slate-400 text-xs flex items-center gap-1"><AlertTriangle size={12}/> Threats Caught</span>
                <span className="font-mono text-2xl font-bold text-red-400">
                    {stats.attacks}
                </span>
            </Card>
            
            <Card className="p-4 flex flex-col justify-between bg-emerald-900/10 border-emerald-900/30">
                <span className="text-slate-400 text-xs flex items-center gap-1"><Wifi size={12}/> Safe Traffic</span>
                <span className="font-mono text-2xl font-bold text-emerald-400">
                    {stats.safe}
                </span>
            </Card>
         </div>

         {/* Log Feed */}
         <Card className="flex flex-col relative overflow-hidden">
             <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                 <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                     <Clock size={18} className="text-amber-500" />
                     Live Traffic Feed
                 </h3>
                 <span className="text-xs text-slate-500 font-mono">
                     {currentIndex + 1} / {simulationData.length}
                 </span>
             </div>
             
             <div className="h-96 overflow-y-auto p-4 space-y-2 font-mono text-sm custom-scrollbar bg-black/20">
                 {logs.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full text-slate-600">
                         <Activity size={48} className="mb-4 opacity-20" />
                         <p>Load data to begin simulation.</p>
                     </div>
                 )}
                 {logs.map((log) => (
                     <div key={log.id} className={`p-3 rounded border flex justify-between items-center animate-in fade-in slide-in-from-top-2
                        ${log.isMissed
                            ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                            : log.type === 'OK' 
                                ? 'bg-emerald-950/30 border-emerald-900/30 text-emerald-300' 
                                : 'bg-red-950/40 border-red-900/50 text-red-300'
                        }`}
                     >
                         <div className="flex items-center gap-4">
                             <span className="text-xs opacity-50 w-16">{log.time}</span>
                             
                             <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold 
                                        ${log.isMissed ? 'text-purple-400' : log.type !== 'OK' ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {log.isMissed ? '[MISSED ATTACK]' : `[${log.type}]`}
                                    </span>
                                    
                                    <div className="flex gap-1">
                                        <span className="text-xs opacity-60 bg-black/30 px-1 rounded">
                                            Pred: {log.predVal}
                                        </span>
                                        {(log.predVal !== log.actualVal || log.actualVal !== 0) && (
                                            <span className="text-xs opacity-60 bg-white/10 px-1 rounded text-slate-300">
                                                Act: {log.actualVal}
                                            </span>
                                        )}
                                    </div>
                                </div>
                             </div>
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