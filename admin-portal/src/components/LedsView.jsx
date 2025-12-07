import React, { useState, useEffect } from 'react';
import { Zap, Wifi, Layers, Home, Power } from 'lucide-react';
import { Card, SectionHeader } from './SharedComponents';

const LedsView = () => {
  // --- State ---
  const [ledIp, setLedIp] = useState('192.168.1.101'); // Default IP
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedBuilding, setSelectedBuilding] = useState(''); // Empty = All in section
  
  // UI State
  const [statusMsg, setStatusMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  // 1. Fetch available sections from the Pi on load
  useEffect(() => {
    // We try to fetch the sections to populate the dropdown dynamically
    fetch(`http://${ledIp}:8000/`)
      .then(res => res.json())
      .then(data => {
        if (data.available_sections) {
          setAvailableSections(data.available_sections);
        }
      })
      .catch(err => console.warn("Could not auto-fetch sections. Is Pi on?", err));
  }, [ledIp]);

  // 2. Generic Send Function
  const sendColor = async (r, g, b, label) => {
    setIsSending(true);
    setStatusMsg('');

    const payload = {
      section: selectedSection,
      r, g, b
    };

    // Only add building key if user typed something
    if (selectedBuilding.trim() !== '') {
      payload.building = selectedBuilding.trim().toLowerCase();
    }

    try {
      const response = await fetch(`http://${ledIp}:8000/set-color`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.ok) {
        setStatusMsg(`Success: Set ${label}`);
      } else {
        setStatusMsg(`Error: ${data.message || 'Failed'}`);
      }
    } catch (error) {
      setStatusMsg(`Network Error: Is ${ledIp} correct?`);
    } finally {
      setIsSending(false);
    }
  };

  const turnOff = async () => {
    try {
      await fetch(`http://${ledIp}:8000/off`, { method: 'POST' });
      setStatusMsg("System Off");
    } catch (e) {
      setStatusMsg("Network Error");
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 p-6 min-h-full">
      <div className="col-span-12 lg:col-span-6 lg:col-start-4">
        <Card className="min-h-[500px] flex flex-col relative overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 absolute top-0 left-0" />
          
          <div className="p-8 flex-1 space-y-8">
            <div className="text-center mb-8">
               <Zap size={48} className="text-amber-400 mx-auto mb-4" />
               <h2 className="text-2xl font-bold text-slate-100">Manual LED Control</h2>
               <p className="text-slate-400">Directly override grid lighting states.</p>
            </div>

            {/* Connection Settings */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                 <Wifi size={18} /> <span className="font-semibold text-sm">Target Connection</span>
              </div>
              <div>
                 <label className="text-xs text-slate-500 block mb-1">Controller IP Address</label>
                 <input 
                   value={ledIp}
                   onChange={(e) => setLedIp(e.target.value)}
                   className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-sm focus:border-blue-500 outline-none"
                 />
              </div>
            </div>

            {/* Targeting */}
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2"><Layers size={14}/> Section</label>
                  <select 
                     value={selectedSection}
                     onChange={(e) => setSelectedSection(e.target.value)}
                     className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-3 text-slate-200 focus:border-blue-500 outline-none capitalize"
                  >
                     <option value="all">Entire Grid</option>
                     {availableSections.map(s => (
                       <option key={s} value={s}>{s}</option>
                     ))}
                     {/* Fallbacks in case API fetch failed */}
                     {!availableSections.includes('downtown') && <option value="downtown">Downtown</option>}
                     {!availableSections.includes('suburbs') && <option value="suburbs">Suburbs</option>}
                     {!availableSections.includes('industrial') && <option value="industrial">Industrial</option>}
                  </select>
               </div>
               <div>
                  <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2"><Home size={14}/> Building (Optional)</label>
                  <input 
                     value={selectedBuilding}
                     onChange={(e) => setSelectedBuilding(e.target.value)}
                     placeholder="e.g. hospital"
                     className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-3 text-slate-200 focus:border-blue-500 outline-none"
                  />
               </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
               <p className="text-xs text-slate-500 font-medium uppercase tracking-wider text-center">Set Status State</p>
               
               <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => sendColor(0, 255, 0, "Good (Green)")}
                    disabled={isSending}
                    className="py-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                  >
                    GOOD
                  </button>
                  
                  <button 
                    onClick={() => sendColor(255, 140, 0, "Caught (Orange)")}
                    disabled={isSending}
                    className="py-4 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-bold shadow-lg shadow-orange-900/20 transition-all active:scale-95"
                  >
                    CAUGHT
                  </button>

                  <button 
                    onClick={() => sendColor(255, 0, 0, "Attacked (Red)")}
                    disabled={isSending}
                    className="py-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-900/20 transition-all active:scale-95"
                  >
                    ATTACKED
                  </button>
               </div>
            </div>

            {/* Footer Status */}
            <div className="flex items-center justify-between pt-2">
               <button 
                  onClick={turnOff}
                  className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
               >
                  <Power size={12} /> Master Off
               </button>
               
               {statusMsg && (
                 <span className={`text-sm font-mono ${statusMsg.includes('Error') ? 'text-red-400' : 'text-blue-400'}`}>
                    {statusMsg}
                 </span>
               )}
            </div>

          </div>
        </Card>
      </div>
    </div>
  );
};

export default LedsView;