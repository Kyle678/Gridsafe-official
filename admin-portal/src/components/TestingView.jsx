import React, { useState, useEffect, useRef } from 'react';
import { Beaker, Cpu, Loader2, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { Card, SectionHeader, SelectionItem, StatusBadge } from './SharedComponents';

const API_BASE = 'http://localhost:5000/api';

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
  const [resultData, setResultData] = useState({ report: '', images: [] });
  const [error, setError] = useState(null);

  const pollInterval = useRef(null);

  // 1. Fetch available resources on load
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        // Fetch Datasets
        const setsRes = await fetch(`${API_BASE}/datasets`);
        const setsData = await setsRes.json();
        const mappedSets = (setsData.datasets || []).map(f => ({
            id: f, name: f, size: 'CSV'
        }));
        setTestingSets(mappedSets);

        // Fetch Models
        const modelsRes = await fetch(`${API_BASE}/models`);
        const modelsData = await modelsRes.json();
        setTrainedModels(modelsData.models || []);

      } catch (error) {
        console.error("API Error", error);
        setError("Could not load resources.");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // 2. Polling Logic
  useEffect(() => {
      if (isTesting) {
          pollInterval.current = setInterval(checkResults, 2000);
      }
      return () => clearInterval(pollInterval.current);
  }, [isTesting]);

  const checkResults = async () => {
      try {
          const res = await fetch(`${API_BASE}/results/test_latest`);
          const data = await res.json();
          if (data.status === 'ready') {
              clearInterval(pollInterval.current);
              setIsTesting(false);
              setResultData({ report: data.report, images: data.images });
              setShowResults(true);
          }
      } catch (err) { console.warn("Polling error", err); }
  };

  const handleTest = async () => {
    if (!selectedTestSet || !selectedModel) return;
    setIsTesting(true);
    setShowResults(false);
    setError(null);

    try {
        const response = await fetch(`${API_BASE}/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model_path: selectedModel.id, // ID is the full path
                dataset: selectedTestSet.id,
                label_col: "label" // Ensure this matches your CSV!
            })
        });
        if (!response.ok) throw new Error("Testing failed to start");
    } catch (err) {
        setError(err.message);
        setIsTesting(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 p-6 min-h-full">
      {/* LEFT COL: CONTROLS */}
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
                {/* Test Set Selection */}
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
                    {testingSets.length === 0 && <p className="text-slate-500 text-sm">No datasets found.</p>}
                  </div>
                </div>

                {/* Trained Model Selection */}
                <div>
                  <SectionHeader icon={Cpu} title="Select Trained Model" />
                  <div className="h-40 overflow-y-auto custom-scrollbar pr-2 space-y-2 border border-slate-800 rounded-lg p-2 bg-slate-900/20">
                    {trainedModels.map(model => (
                      <SelectionItem 
                        key={model.id}
                        label={model.name} // Shows folder/filename
                        subtext={model.type}
                        isSelected={selectedModel?.id === model.id}
                        onClick={() => setSelectedModel(model)}
                      />
                    ))}
                    {trainedModels.length === 0 && <p className="text-slate-500 text-sm">No models found in test_results/</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-800 bg-slate-900/50">
             <div className="grid grid-cols-2 gap-4 mb-6">
               <StatusBadge label="Test Set" value={selectedTestSet ? selectedTestSet.name : 'None'} />
               {/* Truncate long model names for display */}
               <StatusBadge label="Model" value={selectedModel ? selectedModel.name.split('-')[0] : 'None'} />
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
              ) : 'Run Diagnostics'}
            </button>
          </div>
        </Card>
      </div>

      {/* RIGHT COL: RESULTS */}
      <div className="col-span-12 lg:col-span-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-100">Test Results</h2>
          {showResults && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20">
              Diagnostics Complete
            </span>
          )}
        </div>
        <Card className="h-[600px] flex flex-col relative overflow-hidden">
          
          {/* Idle */}
          {!showResults && !isTesting && !error && (
             <div className="h-full flex flex-col items-center justify-center p-8">
              <Beaker size={64} className="text-slate-700 mx-auto mb-4" />
              <p className="text-xl font-medium text-slate-400">Ready to Test</p>
              <p className="text-slate-600 mt-2">Select a saved model and a dataset.</p>
            </div>
          )}

          {/* Loading */}
          {isTesting && (
             <div className="h-full flex flex-col items-center justify-center z-10">
              <div className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-lg text-pink-400 font-medium animate-pulse">Running Diagnostics...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <AlertCircle size={64} className="text-red-500/50 mx-auto mb-4" />
              <p className="text-xl font-medium text-red-400">Testing Failed</p>
              <p className="text-slate-500 mt-2">{error}</p>
              <button onClick={() => setError(null)} className="mt-6 px-4 py-2 bg-slate-800 rounded-lg text-slate-300">Dismiss</button>
            </div>
          )}

          {/* Results Display */}
          {showResults && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    
                    {/* Text Report */}
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-sm text-slate-300 overflow-x-auto">
                        <div className="flex items-center gap-2 mb-2 text-pink-400">
                            <FileText size={16} />
                            <span className="font-semibold uppercase tracking-wider text-xs">Test Report</span>
                        </div>
                        <pre>{resultData.report}</pre>
                    </div>

                    {/* Images */}
                    {resultData.images.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-pink-400">
                                <ImageIcon size={16} />
                                <span className="font-semibold uppercase tracking-wider text-xs">Visualizations</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {resultData.images.map((imgName) => (
                                    <div key={imgName} className="bg-slate-800/30 p-2 rounded-lg border border-slate-700">
                                        <p className="text-xs text-slate-400 mb-2 text-center capitalize">
                                            {imgName.replace('.png', '').replace(/_/g, ' ')}
                                        </p>
                                        <img 
                                            src={`${API_BASE}/results/test_latest/image/${imgName}?t=${Date.now()}`}
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

export default TestingView;