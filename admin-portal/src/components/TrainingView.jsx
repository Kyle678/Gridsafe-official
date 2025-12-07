import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Database, 
  Cpu, 
  Activity, 
  Settings, 
  Loader2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { 
  Card, 
  SectionHeader, 
  SelectionItem, 
  StatusBadge, 
  HyperparameterInput 
} from './SharedComponents';

const TrainingView = () => {
  // --- Data Selection State ---
  const [trainingSets, setTrainingSets] = useState([]);
  const [models, setModels] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // --- User Selection State ---
  const [runName, setRunName] = useState('');
  const [selectedSet, setSelectedSet] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  
  // --- Hyperparameter State ---
  const [learningRate, setLearningRate] = useState(0.01);
  const [maxDepth, setMaxDepth] = useState(6);

  // --- Execution & Results State ---
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [trainingResults, setTrainingResults] = useState([]); 
  const [metrics, setMetrics] = useState({ r2: 0 }); 
  const [error, setError] = useState(null); 

  // 1. Fetch available Datasets and Models on load
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      const defaultTrainingSets = [
        { id: 's1', name: 'Training Set Alpha', size: '1.2 GB • 50k Samples' },
        { id: 's2', name: 'Training Set Beta', size: '2.4 GB • 120k Samples' },
        { id: 's3', name: 'Training Set Gamma', size: '800 MB • 25k Samples' },
        { id: 's4', name: 'Training Set Delta', size: '1.1 GB • 45k Samples' },
        { id: 's5', name: 'Training Set Epsilon', size: '3.2 GB • 150k Samples' },
      ];

      const defaultModels = [
        { id: 'm1', name: 'XGBoost v2.1', type: 'Gradient Boosting', isConfigurable: true },
        { id: 'm2', name: 'Random Forest Light', type: 'Ensemble', isConfigurable: true },
        { id: 'm3', name: 'Neural Net Deep', type: 'Deep Learning', isConfigurable: false },
        { id: 'm4', name: 'Linear Regression', type: 'Regression', isConfigurable: false },
        { id: 'm5', name: 'SVM Classifier', type: 'Classification', isConfigurable: true },
      ];

      try {
        const response = await fetch('http://localhost:5000/api/resources');
        if (!response.ok) throw new Error('API unavailable');
        const data = await response.json();
        setTrainingSets(data.trainingSets || defaultTrainingSets);
        setModels(data.models || defaultModels);
      } catch (error) {
        console.warn("Resource fetch failed, using defaults for UI demo.");
        setTrainingSets(defaultTrainingSets);
        setModels(defaultModels);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // 2. Handle "Start Training" -> POST request to API
  const handleStart = async () => {
    if (!selectedSet || !selectedModel) return;
    
    setIsProcessing(true);
    setShowResults(false);
    setError(null);

    try {
      const payload = {
        runName: runName.trim() || `Run-${Date.now()}`,
        datasetId: selectedSet.id,
        modelId: selectedModel.id,
        hyperparameters: selectedModel.isConfigurable ? {
          learningRate,
          maxDepth
        } : {} 
      };

      const response = await fetch('http://localhost:5000/api/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Training failed: ${response.statusText}`);
      }

      const data = await response.json();

      setTrainingResults(data.points || []); 
      setMetrics({ r2: data.r2_score || 0 });
      setShowResults(true);

    } catch (err) {
      console.error("Training Error:", err);
      setError("Failed to connect to training server. Please ensure the backend is running.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isConfigurable = selectedModel?.isConfigurable;

  return (
    <div className="grid grid-cols-12 gap-6 p-6 min-h-full">
      {/* Controls Column */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
        <Card className="flex-1 flex flex-col relative max-h-[calc(100vh-3rem)]">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-cyan-400 absolute top-0 left-0" />
          
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            {isLoadingData ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
                <Loader2 className="animate-spin text-blue-500" size={32} />
                <p>Fetching resources...</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Name Input Section */}
                <div>
                  <SectionHeader icon={FileText} title="Run Name (Optional)" />
                  <input
                    type="text"
                    value={runName}
                    onChange={(e) => setRunName(e.target.value)}
                    placeholder="e.g. Experiment A - Batch 1"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
                  />
                </div>

                {/* Dataset Selection Box */}
                <div>
                  <SectionHeader icon={Database} title="Select Training Data" />
                  <div className="h-40 overflow-y-auto custom-scrollbar pr-2 space-y-2 border border-slate-800 rounded-lg p-2 bg-slate-900/20">
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

                {/* Model Selection Box */}
                <div>
                  <SectionHeader icon={Cpu} title="Select Model Architecture" />
                  <div className="h-40 overflow-y-auto custom-scrollbar pr-2 space-y-2 border border-slate-800 rounded-lg p-2 bg-slate-900/20">
                    {models.map(model => (
                      <SelectionItem 
                        key={model.id}
                        label={model.name}
                        subtext={model.type}
                        showConfigIcon={model.isConfigurable}
                        isSelected={selectedModel?.id === model.id}
                        onClick={() => setSelectedModel(model)}
                      />
                    ))}
                  </div>
                </div>

                {/* Hyperparameters Section */}
                <div className={`transition-opacity duration-300 ${selectedModel ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                   <SectionHeader icon={Settings} title="Hyperparameters" />
                   
                   {isConfigurable ? (
                     <div className="grid grid-cols-2 gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                       <HyperparameterInput 
                         label="Learning Rate" 
                         value={learningRate} 
                         onChange={setLearningRate} 
                         step={0.001} 
                         min={0.001} 
                         max={1.0} 
                       />
                       <HyperparameterInput 
                         label="Max Depth" 
                         value={maxDepth} 
                         onChange={setMaxDepth} 
                         step={1} 
                         min={1} 
                         max={20} 
                       />
                     </div>
                   ) : (
                     <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/30 text-center">
                        <p className="text-sm text-slate-500">
                          {selectedModel 
                            ? "This model uses fixed parameters." 
                            : "Select a model to configure parameters."}
                        </p>
                     </div>
                   )}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-800 bg-slate-900/50">
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-6">
              <StatusBadge label="Dataset" value={selectedSet ? selectedSet.name : 'None'} />
              <StatusBadge label="Model" value={selectedModel ? selectedModel.name : 'None'} />
              <StatusBadge label="L. Rate" value={isConfigurable ? learningRate : 'N/A'} />
              <StatusBadge label="Run Name" value={runName || 'Auto-generated'} />
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
          
          {/* State: Idle */}
          {!showResults && !isProcessing && !error && (
            <div className="text-center p-8">
              <Activity size={64} className="text-slate-700 mx-auto mb-4" />
              <p className="text-xl font-medium text-slate-400">No Results Available</p>
              <p className="text-slate-600 mt-2">Run a training session to view metrics</p>
            </div>
          )}
          
          {/* State: Error */}
          {error && (
            <div className="text-center p-8 max-w-md mx-auto">
              <AlertCircle size={64} className="text-red-500/50 mx-auto mb-4" />
              <p className="text-xl font-medium text-red-400">Training Failed</p>
              <p className="text-slate-500 mt-2">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
          
          {/* State: Processing */}
          {isProcessing && (
            <div className="text-center z-10">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-lg text-blue-400 font-medium animate-pulse">Training Model...</p>
              <p className="text-slate-500 text-sm mt-2">Sending data to server...</p>
            </div>
          )}
          
          {/* State: Success / Results */}
          {showResults && (
            <div className="w-full h-full p-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">
                    {runName || "Shear Strength Prediction"}
                  </h3>
                  
                  {/* Added Model Name Badge Here */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-500/30">
                      {selectedModel?.name}
                    </span>
                    <span className="text-slate-500 text-sm">Actual vs Predicted (MPa)</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-400">
                    {metrics.r2.toFixed(4)}
                  </div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">R² Accuracy Score</div>
                </div>
              </div>
              
              <div className="w-full h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="Actual" 
                      stroke="#94a3b8" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      label={{ value: 'Actual (MPa)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="Predicted" 
                      stroke="#94a3b8" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      label={{ value: 'Predicted (MPa)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                    <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 5, y: 5 }]} stroke="#60a5fa" strokeDasharray="3 3" opacity={0.5} />
                    <Scatter name="Results" data={trainingResults} fill="#3b82f6" fillOpacity={0.6} />
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

export default TrainingView;