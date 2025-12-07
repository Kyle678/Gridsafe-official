import React, { useState, useEffect } from 'react';
import { Beaker, Cpu, Loader2 } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, SectionHeader, SelectionItem, StatusBadge } from './SharedComponents';

const TestingView = () => {
  // --- Data State ---
  const [testingSets, setTestingSets] = useState([]);
  const [trainedModels, setTrainedModels] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // --- Selection & Execution State ---
  const [selectedTestSet, setSelectedTestSet] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // 1. Fetch available resources on load
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      
      // Fallback data structure
      const defaultTestingSets = [
        { id: 't1', name: 'Test Set Delta', size: '200 MB • 5k Samples' },
        { id: 't2', name: 'Test Set Epsilon', size: '450 MB • 12k Samples' },
        { id: 't3', name: 'Test Set Zeta', size: '150 MB • 3k Samples' },
        { id: 't4', name: 'Test Set Eta', size: '300 MB • 8k Samples' },
        { id: 't5', name: 'Test Set Theta', size: '500 MB • 15k Samples' },
      ];

      // Updated data structure for Trained Models
      const defaultTrainedModels = [
        { 
            id: "tm1", 
            name: "XGBoost on Alpha - Jan 2024", 
            type: "Gradient Boosting",
            r2_score: 0.82
        },
        { 
            id: "tm2", 
            name: "Random Forest on Beta - Feb 2024", 
            type: "Ensemble",
            r2_score: 0.76
        },
        { 
            id: "tm3", 
            name: "Neural Net on Gamma - Mar 2024", 
            type: "Deep Learning",
            r2_score: 0.89
        }
      ];

      try {
        // We reuse the resources endpoint. In a real app, you might have a specific /api/test-sets endpoint
        const response = await fetch('http://localhost:5000/api/resources');
        if (!response.ok) throw new Error('API unavailable');
        
        const data = await response.json();
        
        // Mapping the generic "trainingSets" to "testingSets" for this view's context
        // We look for 'trainedModels' in the response now, falling back to defaults if not present
        setTestingSets(data.trainingSets || defaultTestingSets); 
        setTrainedModels(data.trainedModels || defaultTrainedModels);
      } catch (error) {
        console.warn("Resource fetch failed, using defaults for UI demo.");
        setTestingSets(defaultTestingSets);
        setTrainedModels(defaultTrainedModels);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, []);

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
        <Card className="flex-1 flex flex-col relative max-h-[calc(100vh-3rem)]">
          <div className="h-1 w-full bg-gradient-to-r from-pink-500 to-purple-500 absolute top-0 left-0" />
          
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            {isLoadingData ? (
               <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
                 <Loader2 className="animate-spin text-pink-500" size={32} />
                 <p>Fetching resources...</p>
               </div>
            ) : (
              <div className="space-y-6">
                {/* Test Set Selection Box */}
                <div>
                  <SectionHeader icon={Beaker} title="Select Test Set" />
                  <div className="h-40 overflow-y-auto custom-scrollbar pr-2 space-y-2 border border-slate-800 rounded-lg p-2 bg-slate-900/20">
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

                {/* Trained Model Selection Box */}
                <div>
                  <SectionHeader icon={Cpu} title="Select Trained Model" />
                  <div className="h-40 overflow-y-auto custom-scrollbar pr-2 space-y-2 border border-slate-800 rounded-lg p-2 bg-slate-900/20">
                    {trainedModels.map(model => (
                      <SelectionItem 
                        key={model.id}
                        label={model.name}
                        // Updated to show Type and R2 Score
                        subtext={model.r2_score 
                          ? `${model.type} • R²: ${model.r2_score}` 
                          : (model.type || "Ready for Inference")
                        }
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

export default TestingView;