import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Database, Cpu, Activity, Settings, 
  Loader2, AlertCircle, FileText, BarChart3, Image as ImageIcon
} from 'lucide-react';
import { Card, SectionHeader, SelectionItem, StatusBadge, HyperparameterInput } from './SharedComponents';

const API_BASE = 'http://localhost:5000/api';

const TrainingView = () => {
  // --- Data Selection State ---
  const [trainingSets, setTrainingSets] = useState([]);
  const [models, setModels] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // --- User Selection State ---
  const [runName, setRunName] = useState('');
  const [selectedSet, setSelectedSet] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [taskType, setTaskType] = useState('multiclass'); // Default task
  
  // --- Hyperparameter State ---
  const [learningRate, setLearningRate] = useState(0.01);
  const [maxDepth, setMaxDepth] = useState(6);
  const [nEstimators, setNEstimators] = useState(100);

  // --- Execution & Results State ---
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [resultData, setResultData] = useState({ report: '', images: [] });
  const [error, setError] = useState(null);
  
  // Polling Ref
  const pollInterval = useRef(null);

  // 1. Fetch available Datasets and Models on load
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        // Fetch Datasets
        const setsRes = await fetch(`${API_BASE}/datasets`);
        const setsData = await setsRes.json();
        
        // Map simple filenames to objects for the UI
        const mappedSets = (setsData.datasets || []).map((filename, idx) => ({
          id: filename, // Use filename as ID
          name: filename.replace('.csv', '').replace(/_/g, ' '),
          size: 'CSV File', // We could add size info in backend later
          filename: filename
        }));

        // Fetch Model Options
        const optsRes = await fetch(`${API_BASE}/options`);
        const optsData = await optsRes.json();
        
        // Map model strings to UI objects
        const mappedModels = (optsData.model_types || []).map((type, idx) => ({
          id: type,
          name: type.replace('_', ' ').toUpperCase(),
          type: 'ML Model',
          isConfigurable: true
        }));

        setTrainingSets(mappedSets);
        setModels(mappedModels);
      } catch (error) {
        console.error("API Connection Error:", error);
        setError("Could not connect to Flask API. Is it running?");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // 2. Polling Logic: Check for results every 2 seconds when processing
  useEffect(() => {
    if (isProcessing) {
      pollInterval.current = setInterval(checkResults, 2000);
    }
    return () => clearInterval(pollInterval.current);
  }, [isProcessing]);

  const checkResults = async () => {
    try {
      const res = await fetch(`${API_BASE}/results/latest`);
      const data = await res.json();
      
      if (data.status === 'ready') {
        // Stop Polling
        clearInterval(pollInterval.current);
        setIsProcessing(false);
        setResultData({
            report: data.report,
            images: data.images || []
        });
        setShowResults(true);
      }
    } catch (err) {
      console.warn("Polling error:", err);
      // Don't stop polling on transient network errors
    }
  };

  // 3. Handle "Start Training"
  const handleStart = async () => {
    if (!selectedSet || !selectedModel) return;
    
    setIsProcessing(true);
    setShowResults(false);
    setError(null);

    try {
      // Build Params based on model type
      const params = {};
      if (selectedModel.id === 'xgboost') {
          params.max_depth = maxDepth;
          params.eta = learningRate;
      } else if (selectedModel.id === 'random_forest') {
          params.n_estimators = nEstimators;
          params.max_depth = maxDepth;
      }

      const payload = {
        runName: runName.trim() || `Run-${Date.now()}`,
        dataset: selectedSet.filename,
        label_col: "label", // HARDCODED for now - change this to match your CSV column!
        model_type: selectedModel.id,
        task_type: taskType,
        params: params
      };

      const response = await fetch(`${API_BASE}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Training failed: ${response.statusText}`);
      
      // If success, the 'isProcessing' state triggers the polling useEffect

    } catch (err) {
      console.error("Training Launch Error:", err);
      setError(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 p-6 min-h-full">
      {/* --- LEFT COLUMN: CONTROLS --- */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
        <Card className="flex-1 flex flex-col relative max-h-[calc(100vh-3rem)]">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-cyan-400 absolute top-0 left-0" />
          
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            {isLoadingData ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
                <Loader2 className="animate-spin text-blue-500" size={32} />
                <p>Connecting to Python Backend...</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* 1. Dataset Selection */}
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
                    {trainingSets.length === 0 && <p className="text-slate-500 text-sm p-2">No .csv files found in /datasets</p>}
                  </div>
                </div>

                {/* 2. Task Type Selection (New) */}
                <div>
                  <SectionHeader icon={Activity} title="Task Type" />
                  <div className="flex gap-2">
                    {['multiclass','classification', 'regression'].map(type => (
                        <button
                            key={type}
                            onClick={() => setTaskType(type)}
                            className={`px-3 py-2 rounded text-sm capitalize border transition-all ${
                                taskType === type 
                                ? 'bg-blue-600 border-blue-500 text-white' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                  </div>
                </div>

                {/* 3. Model Selection */}
                <div>
                  <SectionHeader icon={Cpu} title="Select Model Architecture" />
                  <div className="h-40 overflow-y-auto custom-scrollbar pr-2 space-y-2 border border-slate-800 rounded-lg p-2 bg-slate-900/20">
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

                {/* 4. Hyperparameters */}
                <div className={`transition-opacity duration-300 ${selectedModel ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                   <SectionHeader icon={Settings} title="Hyperparameters" />
                   <div className="grid grid-cols-2 gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                     {/* Dynamic inputs based on model type */}
                     {selectedModel?.id === 'random_forest' ? (
                         <HyperparameterInput 
                            label="Estimators" 
                            value={nEstimators} 
                            onChange={setNEstimators} 
                            min={10} max={500} step={10} 
                         />
                     ) : (
                         <HyperparameterInput 
                            label="Learning Rate" 
                            value={learningRate} 
                            onChange={setLearningRate} 
                            step={0.01} min={0.01} max={1.0} 
                         />
                     )}
                     <HyperparameterInput 
                        label="Max Depth" 
                        value={maxDepth} 
                        onChange={setMaxDepth} 
                        step={1} min={1} max={20} 
                     />
                   </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-800 bg-slate-900/50">
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

      {/* --- RIGHT COLUMN: RESULTS --- */}
      <div className="col-span-12 lg:col-span-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-100">Training Analysis</h2>
          {showResults && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
              Training Complete
            </span>
          )}
        </div>
        
        <Card className="h-[600px] flex flex-col relative overflow-hidden">
          
          {/* State: Idle */}
          {!showResults && !isProcessing && !error && (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <Activity size={64} className="text-slate-700 mx-auto mb-4" />
              <p className="text-xl font-medium text-slate-400">Ready to Train</p>
              <p className="text-slate-600 mt-2">Select a dataset and model to begin.</p>
            </div>
          )}
          
          {/* State: Error */}
          {error && (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <AlertCircle size={64} className="text-red-500/50 mx-auto mb-4" />
              <p className="text-xl font-medium text-red-400">System Error</p>
              <p className="text-slate-500 mt-2 max-w-md text-center">{error}</p>
              <button onClick={() => setError(null)} className="mt-6 px-4 py-2 bg-slate-800 rounded-lg text-slate-300">Dismiss</button>
            </div>
          )}
          
          {/* State: Processing */}
          {isProcessing && (
            <div className="h-full flex flex-col items-center justify-center z-10">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-lg text-blue-400 font-medium animate-pulse">Training Model...</p>
              <p className="text-slate-500 text-sm mt-2">Check console for background thread status</p>
            </div>
          )}
          
          {/* State: Success / Results */}
          {showResults && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header Info */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-200">
                           {selectedModel?.name} Results
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Dataset: {selectedSet?.name}
                        </p>
                    </div>
                    <div className="text-right">
                        <StatusBadge label="Task" value={taskType} />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    
                    {/* 1. Text Report */}
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-sm text-slate-300 overflow-x-auto">
                        <div className="flex items-center gap-2 mb-2 text-blue-400">
                            <FileText size={16} />
                            <span className="font-semibold uppercase tracking-wider text-xs">Evaluation Report</span>
                        </div>
                        <pre>{resultData.report}</pre>
                    </div>

                    {/* 2. Image Gallery */}
                    {resultData.images.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-blue-400">
                                <ImageIcon size={16} />
                                <span className="font-semibold uppercase tracking-wider text-xs">Generated Plots</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {resultData.images.map((imgName) => (
                                    <div key={imgName} className="bg-slate-800/30 p-2 rounded-lg border border-slate-700">
                                        <p className="text-xs text-slate-400 mb-2 text-center capitalize">
                                            {imgName.replace('.png', '').replace(/_/g, ' ')}
                                        </p>
                                        <img 
                                            src={`${API_BASE}/results/latest/image/${imgName}?t=${Date.now()}`} // Cache busting
                                            alt={imgName}
                                            className="w-full h-auto rounded border border-slate-600/50"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TrainingView;