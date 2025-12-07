import React from 'react';
import { Zap } from 'lucide-react';
import { Card } from './SharedComponents';

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

export default LedsView;