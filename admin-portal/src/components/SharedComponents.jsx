import React from 'react';
import { CheckCircle2, Settings } from 'lucide-react';

export const Card = ({ children, className = "", style = {} }) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden ${className}`} style={style}>
    {children}
  </div>
);

export const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 text-slate-100 font-semibold mb-4 px-1">
    {Icon && <Icon size={16} className="text-blue-500" />}
    <span className="tracking-wide text-sm uppercase text-slate-400">{title}</span>
  </div>
);

export const SelectionItem = ({ label, isSelected, onClick, subtext, showConfigIcon }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-4 rounded-lg border transition-all duration-200 mb-3 flex justify-between items-start group
      ${isSelected 
        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
        : 'border-slate-800 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
      }`}
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <div className={`font-medium ${isSelected ? 'text-blue-400' : 'text-slate-300 group-hover:text-slate-200'}`}>
          {label}
        </div>
        {showConfigIcon && <Settings size={12} className="text-slate-500" />}
      </div>
      {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
    </div>
    {isSelected && <CheckCircle2 size={18} className="text-blue-500 ml-2 flex-shrink-0" />}
  </button>
);

export const StatusBadge = ({ label, value }) => (
  <div className="flex flex-col">
    <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">{label}</div>
    <div className={`text-sm font-medium ${value === 'None' || value === 'N/A' ? 'text-slate-600' : 'text-blue-400'}`}>
      {value}
    </div>
  </div>
);

export const HyperparameterInput = ({ label, value, onChange, min, max, step, type = "number" }) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
      min={min}
      max={max}
      step={step}
      className="w-full p-3 bg-slate-950/50 border border-slate-700 rounded-lg text-slate-200 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
    />
  </div>
);