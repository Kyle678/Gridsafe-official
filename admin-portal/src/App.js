import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Database, 
  Cpu, 
  Activity, 
  Settings, 
  Zap, 
  LayoutDashboard,
  CheckCircle2,
  Beaker,
  Loader2
} from 'lucide-react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar
} from 'recharts';

// --- Shared Components ---

const Card = ({ children, className = "", style = {} }) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden ${className}`} style={style}>
    {children}
  </div>
);

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 text-slate-100 font-semibold mb-4 px-1">
    {Icon && <Icon size={16} className="text-blue-500" />}
    <span className="tracking-wide text-sm uppercase text-slate-400">{title}</span>
  </div>
);

const SelectionItem = ({ label, isSelected, onClick, subtext }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-4 rounded-lg border transition-all duration-200 mb-3 flex justify-between items-center group
      ${isSelected 
        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
        : 'border-slate-800 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
      }`}
  >
    <div className="flex-1">
      <div className={`font-medium ${isSelected ? 'text-blue-400' : 'text-slate-300 group-hover:text-slate-200'}`}>
        {label}
      </div>
      {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
    </div>
    {isSelected && <CheckCircle2 size={18} className="text-blue-500" />}
  </button>
);

const StatusBadge = ({ label, value }) => (
  <div className="flex flex-col">
    <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">{label}</div>
    <div className={`text-sm font-medium ${value === 'None' ? 'text-slate-600' : 'text-blue-400'}`}>
      {value}
    </div>
  </div>
);

// --- Page: Training ---

const TrainingView = () => {
  // State for data
  const [trainingSets, setTrainingSets] = useState([]);
  const [models, setModels] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // State for UI interaction
  const [selectedSet, setSelectedSet] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // 1. USE EFFECT HOOK TO FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);

      // Define default values to fallback to
      const defaultTrainingSets = [
        { id: 's1', name: 'Training Set Alpha', size: '1.2 GB • 50k Samples' },
        { id: 's2', name: 'Training Set Beta', size: '2.4 GB • 120k Samples' },
        { id: 's3', name: 'Training Set Gamma', size: '800 MB • 25k Samples' },
      ];

      const defaultModels = [
        { id: 'm1', name: 'XGBoost v2.1', type: 'Gradient Boosting' },
        { id: 'm2', name: 'Random Forest Light', type: 'Ensemble' },
        { id: 'm3', name: 'Neural Net Deep', type: 'Deep Learning' },
      ];

      try {
        // Attempt to retrieve from API
        // Using a hypothetical endpoint here. In this demo environment, 
        // this will likely fail or 404, triggering the catch block.
        const response = await fetch('http://localhost:5000/v1/resources');
        
        if (!response.ok) {
          throw new Error('API unavailable');
        }

        const data = await response.json();
        setTrainingSets(data.trainingSets || defaultTrainingSets);
        setModels(data.models || defaultModels);

      } catch (error) {
        console.log("Fetching from API failed, loading default data...", error);
        
        // Simulate a small network delay for realism even on fallback
        await new Promise(resolve => setTimeout(resolve, 600));
        
        setTrainingSets(defaultTrainingSets);
        setModels(defaultModels);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const scatterData = Array.from({ length: 50 }, () => {
    const actual = Math.random() * 4.5;
    return { x: actual, y: actual + ((Math.random() - 0.5) * 0.4) };
  });

  const handleStart = () => {
    if (!selectedSet || !selectedModel) return;
    setIsProcessing(true);
    setShowResults(false);
    setTimeout(() => {
      setIsProcessing(false);
      setShowResults(true);
    }, 1500);
  };

  return (
    <div className="grid grid-cols-12 gap-6 p-6 min-h-full">
      {/* Controls Column */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
        <Card className="flex-1 flex flex-col relative">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-cyan-400 absolute top-0 left-0" />
          
          <div className="p-6 flex-1 overflow-y-auto">
            {isLoadingData ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
                <Loader2 className="animate-spin text-blue-500" size={32} />
                <p>Fetching resources...</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div>
                  <SectionHeader icon={Database} title="Select Training Data" />
                  <div className="space-y-2">
                    {trainingSets.map(set => (
                      <SelectionItem 
                        key={set.id}
                        label={set.name}
                        subtext={set.size}
                        isSelected={selectedSet?.id === set.id}
                        onClick={() => setSelectedSet(set)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <SectionHeader icon={Cpu} title="Select Model Architecture" />
                  <div className="space-y-2">
                    {models.map(model => (
                      <SelectionItem 
                        key={model.id}
                        label={model.name}
                        subtext={model.type}
                        isSelected={selectedModel?.id === model.id}
                        onClick={() => setSelectedModel(model)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-800 bg-slate-900/50">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <StatusBadge label="Dataset" value={selectedSet ? selectedSet.name : 'None'} />
              <StatusBadge label="Model" value={selectedModel ? selectedModel.name : 'None'} />
            </div>
            <button
              onClick={handleStart}
              disabled={!selectedSet || !selectedModel || isProcessing}
              className={`w-full py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-300
                ${!selectedSet || !selectedModel 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : isProcessing
                    ? 'bg-blue-600/20 text-blue-400 cursor-wait'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                }`}
            >
              {isProcessing ? (
                <>
                   <Loader2 className="animate-spin" size={20} />
                   Training Model...
                </>
              ) : (
                <>
                  <Play size={20} fill="currentColor" />
                  Start Training
                </>
              )}
            </button>
          </div>
        </Card>
      </div>

      {/* Results Column */}
      <div className="col-span-12 lg:col-span-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-100">Training Analysis</h2>
          {showResults && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
              Training Complete
            </span>
          )}
        </div>
        
        <Card className="h-[600px] flex items-center justify-center relative">
          {!showResults && !isProcessing && (
            <div className="text-center p-8">
              <Activity size={64} className="text-slate-700 mx-auto mb-4" />
              <p className="text-xl font-medium text-slate-400">No Results Available</p>
              <p className="text-slate-600 mt-2">Run a training session to view metrics</p>
            </div>
          )}
          
          {isProcessing && (
            <div className="text-center z-10">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-lg text-blue-400 font-medium animate-pulse">Training Model...</p>
            </div>
          )}
          
          {showResults && (
            <div className="w-full h-full p-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">Shear Strength Prediction</h3>
                  <p className="text-slate-500 text-sm">Actual vs Predicted (MPa)</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-400">0.9707</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">R² Accuracy Score</div>
                </div>
              </div>
              <div className="w-full h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis type="number" dataKey="x" name="Actual" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis type="number" dataKey="y" name="Predicted" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                    <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 4.5, y: 4.5 }]} stroke="#60a5fa" strokeDasharray="3 3" opacity={0.5} />
                    <Scatter name="Results" data={scatterData} fill="#3b82f6" fillOpacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// --- Page: Testing ---

const TestingView = () => {
  const [selectedTestSet, setSelectedTestSet] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Mock data for testing view (could also be moved to useEffect)
  const testingSets = [
    { id: 't1', name: 'Test Set Delta', size: '200 MB • 5k Samples' },
    { id: 't2', name: 'Test Set Epsilon', size: '450 MB • 12k Samples' },
  ];

  const trainedModels = [
    { id: 'tm1', name: 'XGBoost v2.1 (Trained)', type: 'Ready for Inference' },
    { id: 'tm2', name: 'Neural Net Deep (Trained)', type: 'Ready for Inference' },
  ];

  const barData = [
    { name: 'Accuracy', value: 94 },
    { name: 'Precision', value: 88 },
    { name: 'Recall', value: 92 },
    { name: 'F1 Score', value: 90 },
  ];

  const handleTest = () => {
    if (!selectedTestSet || !selectedModel) return;
    setIsTesting(true);
    setShowResults(false);
    setTimeout(() => {
      setIsTesting(false);
      setShowResults(true);
    }, 1200);
  };

  return (
    <div className="grid grid-cols-12 gap-6 p-6 min-h-full">
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
        <Card className="flex-1 flex flex-col relative">
          <div className="h-1 w-full bg-gradient-to-r from-pink-500 to-purple-500 absolute top-0 left-0" />
          <div className="p-6 flex-1 overflow-y-auto space-y-8">
            <div>
              <SectionHeader icon={Beaker} title="Select Test Set" />
              <div className="space-y-2">
                {testingSets.map(set => (
                  <SelectionItem 
                    key={set.id}
                    label={set.name}
                    subtext={set.size}
                    isSelected={selectedTestSet?.id === set.id}
                    onClick={() => setSelectedTestSet(set)}
                  />
                ))}
              </div>
            </div>
            <div>
              <SectionHeader icon={Cpu} title="Select Trained Model" />
              <div className="space-y-2">
                {trainedModels.map(model => (
                  <SelectionItem 
                    key={model.id}
                    label={model.name}
                    subtext={model.type}
                    isSelected={selectedModel?.id === model.id}
                    onClick={() => setSelectedModel(model)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-slate-800 bg-slate-900/50">
             <div className="grid grid-cols-2 gap-4 mb-6">
              <StatusBadge label="Test Set" value={selectedTestSet ? selectedTestSet.name : 'None'} />
              <StatusBadge label="Model" value={selectedModel ? selectedModel.name : 'None'} />
            </div>
            <button
              onClick={handleTest}
              disabled={!selectedTestSet || !selectedModel || isTesting}
              className={`w-full py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-300
                ${!selectedTestSet || !selectedModel 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : isTesting
                    ? 'bg-pink-600/20 text-pink-400 cursor-wait'
                    : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-600/20'
                }`}
            >
              {isTesting ? (
                <>
                   <Loader2 className="animate-spin" size={20} />
                   Testing...
                </>
              ) : (
                'Run Diagnostics'
              )}
            </button>
          </div>
        </Card>
      </div>

      <div className="col-span-12 lg:col-span-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-100">Test Results</h2>
          {showResults && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20">
              Diagnostics Complete
            </span>
          )}
        </div>
        <Card className="h-[600px] flex items-center justify-center relative">
          {!showResults && !isTesting && (
             <div className="text-center p-8">
              <Beaker size={64} className="text-slate-700 mx-auto mb-4" />
              <p className="text-xl font-medium text-slate-400">Ready to Test</p>
              <p className="text-slate-600 mt-2">Select a test set and model</p>
            </div>
          )}
          {isTesting && (
             <div className="text-center z-10">
              <div className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-lg text-pink-400 font-medium animate-pulse">Running Diagnostics...</p>
            </div>
          )}
          {showResults && (
            <div className="w-full h-full p-6 animate-in fade-in duration-500">
              <div className="mb-6">
                 <h3 className="text-lg font-semibold text-slate-200">Model Performance</h3>
                 <p className="text-slate-500 text-sm">Key Metrics Overview</p>
              </div>
              <div className="w-full h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip cursor={{fill: '#334155', opacity: 0.2}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                    <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// --- Page: LEDs ---

const LedsView = () => (
  <div className="grid grid-cols-12 gap-6 p-6 min-h-full">
     <div className="col-span-12">
        <Card className="min-h-[600px] flex items-center justify-center">
           <div className="text-center">
              <Zap size={64} className="text-slate-700 mx-auto mb-4" />
              <p className="text-xl font-medium text-slate-400">LED Configuration</p>
              <p className="text-slate-600 mt-2">No modules connected</p>
           </div>
        </Card>
     </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('training');

  const renderContent = () => {
    switch (activeTab) {
      case 'training': return <TrainingView />;
      case 'testing': return <TestingView />;
      case 'leds': return <LedsView />;
      default: return <TrainingView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Navigation */}
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
            { id: 'training', label: 'Training', icon: Database },
            { id: 'testing', label: 'Testing', icon: Beaker },
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

      {/* Main Content Area */}
      <main className="max-w-[1600px] mx-auto">
        {renderContent()}
      </main>
    </div>
  );
}