import React, { useState } from 'react';
// Added Activity icon for Simulation
import { LayoutDashboard, Database, Beaker, Zap, Settings, FilePlus, Activity } from 'lucide-react';
import TrainingView from './components/TrainingView';
import TestingView from './components/TestingView';
import LedsView from './components/LedsView';
import LogGenerationView from './components/LogGenerationView';
import SimulationView from './components/SimulationView'; // <--- Import

export default function App() {
  const [activeTab, setActiveTab] = useState('generation');

  const renderContent = () => {
    switch (activeTab) {
      case 'training': return <TrainingView />;
      case 'testing': return <TestingView />;
      case 'generation': return <LogGenerationView />;
      case 'simulation': return <SimulationView />; // <--- Added Case
      case 'leds': return <LedsView />;
      default: return <LogGenerationView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      <nav className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <LayoutDashboard size={18} color="white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white leading-none">Gridsafe</h1>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Admin Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-800">
          {[
            { id: 'generation', label: 'Data Gen', icon: FilePlus },
            { id: 'training', label: 'Training', icon: Database },
            { id: 'testing', label: 'Testing', icon: Beaker },
            // Added Sim Tab
            { id: 'simulation', label: 'Simulate', icon: Activity },
            { id: 'leds', label: 'LEDs', icon: Zap }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                ${activeTab === tab.id 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800 cursor-pointer transition-colors">
           <Settings size={18} className="text-slate-400" />
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto">
        {renderContent()}
      </main>
    </div>
  );
}