'use client';

import React from 'react';
import { History, Sparkles, FileText } from 'lucide-react';

interface PropertyTimelineProps {
  property: any;
  selectedPropertyId: string;
  activities: any[];
  activityCache: Record<string, any[]>;
  loadingActivities: boolean;
  getPropertyActivityCacheKey: (propertyId: string) => string;
  router: any;
}

export const PropertyTimeline: React.FC<PropertyTimelineProps> = ({
  property,
  selectedPropertyId,
  activities,
  activityCache,
  loadingActivities,
  getPropertyActivityCacheKey,
  router
}) => {
  const propertyCacheKey = getPropertyActivityCacheKey(property.id);
  const cachedActivities = activityCache[propertyCacheKey];
  const timelineActivities = selectedPropertyId === property.id ? activities : (cachedActivities || []);
  const isTimelineLoading = selectedPropertyId === property.id ? loadingActivities && !cachedActivities : false;

  return (
    <div 
      className="px-4 pb-5 pt-2 border-t border-gray-100 bg-gray-50/30 cursor-default"
      onClick={(e) => e.stopPropagation()} 
    >
      <div className="flex items-center justify-between pl-1 pr-1 mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-400" />
          <div className="flex flex-col">
            <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Property Timeline</h4>
            <span className="text-[11px] font-bold text-gray-500 normal-case">{property.address || 'No property selected'}</span>
          </div>
        </div>
        <span className="text-[10px] font-bold text-gray-300 uppercase">Live Update</span>
      </div>

      {isTimelineLoading ? (
        <div className="py-10 flex flex-col items-center justify-center gap-3 bg-gray-50/50 rounded-[24px] border border-gray-100">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin"></div>
          <span className="text-[11px] font-bold text-gray-400">Loading property timeline...</span>
        </div>
      ) : timelineActivities.length > 0 ? (
        <div className="space-y-4 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-[2px] before:bg-gray-100/60">
          {timelineActivities.map((log, idx) => (
            <div key={log.id} className="relative pl-12 group">
              <div className={`absolute left-0 top-1.5 w-[40px] h-[40px] rounded-full border-4 border-gray-50 flex items-center justify-center z-10 overflow-hidden transition-transform group-hover:scale-110 ${idx === 0 ? 'bg-black text-white shadow-xl shadow-gray-200' : 'bg-white text-gray-400 border-gray-100'}`}>
                {log.avatarUrl ? (
                  <img src={log.avatarUrl} alt={log.buyerName || log.agentName} className="w-full h-full object-cover" />
                ) : idx === 0 ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-200" />
                )}
              </div>
              <div className="p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm transition-all hover:border-gray-200 hover:shadow-md">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${idx === 0 ? 'text-black' : 'text-gray-400'}`}>
                    {idx === 0 ? 'Latest Update' : 'History'}
                  </span>
                  <span className="text-[10px] font-bold text-gray-300">{log.timestamp}</span>
                </div>
                <p className="text-[14px] font-bold text-gray-800 leading-relaxed">{log.content}</p>
                <div className="text-xs text-red-500 break-all bg-red-50 p-2 rounded mt-2">
                  Debug Metadata: {JSON.stringify(log.metadata)}
                </div>
                {(log.buyerName || log.amountLabel) && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-gray-500">
                    {log.buyerName && <span>{log.buyerName}</span>}
                    {log.amountLabel && <span className="px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-gray-700">{log.amountLabel}</span>}
                  </div>
                )}
                {log.metadata?.offer_id && (
                  <div className="mt-4 border-t border-gray-50 pt-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/contract/${property.id}/review?offerId=${log.metadata.offer_id}`);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[12px] font-bold hover:bg-gray-800 transition-transform active:scale-95 shadow-sm w-fit"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      查看/审核 Offer
                    </button>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-1.5 opacity-40">
                  <div className="w-3 h-3 rounded-full bg-gray-200" />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">{log.agentName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center bg-gray-50/50 rounded-[24px] border-2 border-dashed border-gray-200/50">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <History className="w-5 h-5 text-gray-200" />
          </div>
          <p className="text-[13px] font-black text-gray-400">No property activity yet</p>
          <p className="text-[10px] font-bold text-gray-300 mt-1 uppercase">No activity tracked yet</p>
        </div>
      )}
    </div>
  );
};
