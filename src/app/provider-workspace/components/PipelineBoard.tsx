'use client';

import React from 'react';
import { CategoryIcon, PipelineStatusBadge } from './shared';
import { Buyer, ManagedProperty, ActivityLog } from './types';
import { Mic } from 'lucide-react';

interface PipelineBoardProps {
  orderedPipeline: Buyer[];
  expandedBuyerId: string | null;
  setExpandedBuyerId: (id: string | null | ((prev: string | null) => string | null)) => void;
  getBuyerLinkedProperties: (buyerId: string) => ManagedProperty[];
  getBuyerContextPropertyId: (buyerId: string) => string;
  managedProperties: ManagedProperty[];
  draggedIndex: number | null;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDrop: (index: number) => void;
  setDraggedIndex: (index: number | null) => void;
  moveBuyer: (index: number, direction: 'UP' | 'DOWN') => void;
  draggedPropertyId: string | null;
  handleBuyerPropertyDrop: (buyerId: string) => void;
  setBuyerActivePropertyIds: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  navigateToDraft: (propertyId: string, buyerId: string, email: string, name: string) => void;
  removePropertyFromBuyer: (buyerId: string, propertyId: string) => void;
  setActiveFollowUpBuyer: (buyer: Buyer) => void;
  setIsFollowUpModalOpen: (open: boolean) => void;
  loadingActivities: boolean;
  activities: ActivityLog[];
}

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  orderedPipeline,
  expandedBuyerId,
  setExpandedBuyerId,
  getBuyerLinkedProperties,
  getBuyerContextPropertyId,
  managedProperties,
  draggedIndex,
  handleDragStart,
  handleDragOver,
  handleDrop,
  setDraggedIndex,
  moveBuyer,
  draggedPropertyId,
  handleBuyerPropertyDrop,
  setBuyerActivePropertyIds,
  navigateToDraft,
  removePropertyFromBuyer,
  setActiveFollowUpBuyer,
  setIsFollowUpModalOpen,
  loadingActivities,
  activities
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1 pl-1">
        <div className="w-[22px] h-[22px] rounded-[6px] bg-blue-600 flex items-center justify-center shadow-sm text-white">
          <CategoryIcon id="BUYERS" className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-[15px] font-black text-blue-600">买家管线 (Pipeline)</h2>
        <span className="text-gray-400 text-xs ml-1 font-medium">{orderedPipeline.length}</span>
      </div>

      <style>{`
        @keyframes buyerSlideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .buyer-card-animate {
          opacity: 0;
          animation: buyerSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        {orderedPipeline.map((buyer, index) => {
          const isExpanded = expandedBuyerId === buyer.id;
          const linkedProperties = getBuyerLinkedProperties(buyer.id);
          const activeBuyerPropertyId = getBuyerContextPropertyId(buyer.id);
          const activeBuyerProperty = managedProperties.find((property) => property.id === activeBuyerPropertyId);
          
          return (
            <div 
              key={buyer.id} 
              className={`buyer-card-animate transition-all duration-300 ${
                index !== orderedPipeline.length - 1 ? 'border-b border-gray-50' : ''
              } ${draggedIndex === index ? 'opacity-30 scale-95' : 'opacity-100'}`}
              style={{ animationDelay: `${index * 0.04}s` }}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => setDraggedIndex(null)}
            >
              <div 
                className={`flex items-center gap-3 p-4 transition-all duration-300 cursor-pointer ${
                  isExpanded ? 'bg-gray-50/50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setExpandedBuyerId(isExpanded ? null : buyer.id)}
              >
                {/* --- Drag Handle & Reorder Controls --- */}
                <div className="flex flex-col gap-1 mr-1 items-center">
                   <div className="text-gray-300 mb-1 cursor-grab active:cursor-grabbing">
                     <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 11.001 4.001A2 2 0 017 2zm0 6a2 2 0 11.001 4.001A2 2 0 017 8zm0 6a2 2 0 11.001 4.001A2 2 0 017 14zm6-12a2 2 0 11.001 4.001A2 2 0 0113 2zm0 6a2 2 0 11.001 4.001A2 2 0 0113 8zm0 6a2 2 0 11.001 4.001A2 2 0 0113 14z" /></svg>
                   </div>
                   <div className="flex flex-col gap-0.5">
                     <button 
                       disabled={index === 0}
                       onClick={(e) => { e.stopPropagation(); moveBuyer(index, 'UP'); }}
                       className={`p-0.5 rounded-md hover:bg-gray-200 transition-colors ${index === 0 ? 'opacity-10' : 'text-gray-400 opacity-60'}`}
                     >
                       <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                     </button>
                     <button 
                       disabled={index === orderedPipeline.length - 1}
                       onClick={(e) => { e.stopPropagation(); moveBuyer(index, 'DOWN'); }}
                       className={`p-0.5 rounded-md hover:bg-gray-200 transition-colors ${index === orderedPipeline.length - 1 ? 'opacity-10' : 'text-gray-400 opacity-60'}`}
                     >
                       <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                     </button>
                   </div>
                </div>

                <div className={`w-1.5 h-10 rounded-full shrink-0 transition-colors duration-500 ${isExpanded ? 'bg-orange-500' : 'bg-blue-600'}`} />
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full border-2 border-white shadow-md bg-cover bg-center shrink-0" style={{ backgroundImage: `url(https://i.pravatar.cc/100?u=${buyer.id})` }} />
                  <div className="flex flex-col truncate">
                    <span className="text-[14px] font-black text-gray-900 truncate tracking-tight">{buyer.name}</span>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 mt-0.5 truncate">
                      <span className="bg-white px-2 py-0.5 rounded-full text-gray-600 shrink-0 border border-gray-100 shadow-sm">{buyer.infoBadge}</span>
                      <span className="truncate opacity-70 uppercase tracking-wide">{buyer.roleDescription}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <PipelineStatusBadge status={buyer.status} />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isExpanded ? 'rotate-180 text-orange-600 bg-orange-100/50' : 'text-gray-300 bg-gray-50'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {/* --- Inline Expanded Content with Interactive Timeline --- */}
              <div
                className={`px-4 bg-gray-50/30 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1200px] py-6 border-t border-gray-100' : 'max-h-0'}`}
                onDragOver={(e) => {
                  if (!draggedPropertyId) return;
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBuyerPropertyDrop(buyer.id);
                }}
              >
                   <div className={`mb-5 rounded-[22px] border-2 border-dashed p-4 transition-all ${draggedPropertyId ? 'border-blue-300 bg-blue-50/70' : 'border-gray-200 bg-white/70'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Linked Properties</p>
                          <p className="mt-1 text-[12px] font-bold text-gray-500">
                            {linkedProperties.length > 0 ? 'Drag more properties here or tap one below to switch offer context.' : 'Drag a property card from the top section into this buyer.'}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-gray-500 shadow-sm border border-gray-100">
                          {linkedProperties.length} linked
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        {linkedProperties.length > 0 ? linkedProperties.map((property) => {
                          const isActiveLinkedProperty = property.id === activeBuyerPropertyId;
                          return (
                            <div
                              key={`${buyer.id}-${property.id}`}
                              className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all ${isActiveLinkedProperty ? 'border-black bg-black text-white shadow-lg shadow-gray-200' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBuyerActivePropertyIds((prev: any) => ({ ...prev, [buyer.id]: property.id }));
                                }}
                                className="flex flex-1 items-center gap-3 text-left"
                              >
                                <div className="h-10 w-10 rounded-xl bg-cover bg-center border border-white/20 shadow-sm shrink-0" style={{ backgroundImage: `url(${property.image || ''})` }} />
                                <div className="min-w-0">
                                  <p className={`truncate text-[13px] font-black ${isActiveLinkedProperty ? 'text-white' : 'text-gray-900'}`}>{property.address}</p>
                                  <p className={`truncate text-[11px] font-bold uppercase tracking-wide ${isActiveLinkedProperty ? 'text-white/70' : 'text-gray-400'}`}>Owner: {property.vendor}</p>
                                </div>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToDraft(property.id, buyer.id, buyer.email, buyer.name);
                                }}
                                className={`rounded-xl px-3 py-2 text-[11px] font-black transition-colors ${isActiveLinkedProperty ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}`}
                              >
                                Offer
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePropertyFromBuyer(buyer.id, property.id);
                                }}
                                className={`rounded-xl px-2 py-2 text-[11px] font-black transition-colors ${isActiveLinkedProperty ? 'text-white/80 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                                title="Remove property from this buyer"
                              >
                                x
                              </button>
                            </div>
                          );
                        }) : (
                          <div className="rounded-2xl bg-white px-4 py-5 text-center border border-gray-100">
                            <p className="text-[12px] font-black text-gray-400">No property linked yet</p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-300">Drop property here</p>
                          </div>
                        )}
                      </div>
                   </div>

                   <div className="flex gap-3 mb-8">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!activeBuyerProperty) return;
                          navigateToDraft(activeBuyerProperty.id, buyer.id, buyer.email, buyer.name);
                        }}
                        disabled={!activeBuyerProperty}
                        className={`flex-1 font-black py-3 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-[13px] tracking-tight ${activeBuyerProperty ? 'bg-black text-white shadow-gray-200 hover:bg-gray-800' : 'bg-gray-200 text-gray-400 shadow-transparent cursor-not-allowed'}`}
                      >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                         {activeBuyerProperty ? `Create Offer - ${activeBuyerProperty.address}` : 'Link A Property First'}
                      </button>
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           setActiveFollowUpBuyer(buyer);
                           setIsFollowUpModalOpen(true);
                         }}
                         className="flex-1 bg-white text-black border-2 border-gray-100 font-black py-3 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all shadow-sm text-[13px] tracking-tight flex items-center justify-center gap-2"
                       >
                          <Mic className="w-4 h-4 text-gray-400" />
                          Record Follow-up Note
                       </button>
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center justify-between pl-1 pr-1">
                        <div className="flex flex-col">
                          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Buyer Timeline</h4>
                          <span className="text-[11px] font-bold text-gray-500">{activeBuyerProperty?.address || 'Please link one property to this buyer'}</span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-300 uppercase">Live Update</span>
                      </div>
                      
                      {loadingActivities ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-3">
                           <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin"></div>
                           <span className="text-[11px] font-bold text-gray-400">Loading buyer timeline...</span>
                        </div>
                      ) : activities.length > 0 ? (
                        <div className="space-y-3 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
                           {activities.map((log, idx) => (
                             <div key={log.id} className="relative pl-9 group">
                                <div className={`absolute left-0 top-1.5 w-[32px] h-[32px] rounded-full border-4 border-gray-50 flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${idx === 0 ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-white text-gray-400 border-gray-100'}`}>
                                   {idx === 0 ? (
                                     <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                                   ) : (
                                     <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                   )}
                                </div>
                                <div className="p-4 bg-white rounded-[18px] border border-gray-100 shadow-sm transition-all hover:border-gray-200">
                                   <div className="flex justify-between items-center mb-1.5">
                                      <span className={`text-[10px] font-black uppercase tracking-wider ${idx === 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                        {idx === 0 ? 'Latest Update' : 'History'}
                                      </span>
                                      <span className="text-[10px] font-bold text-gray-300">{log.timestamp}</span>
                                   </div>
                                   <p className="text-[13px] font-bold text-gray-800 leading-snug">{log.content}</p>
                                </div>
                             </div>
                           ))}
                        </div>
                      ) : (
                        <div className="py-10 text-center bg-gray-100/40 rounded-[20px] border-2 border-dashed border-gray-200/60">
                           <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                              <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0116 0z" /></svg>
                           </div>
                           <p className="text-[12px] font-black text-gray-400">{activeBuyerProperty ? 'No activity tracked for this buyer-property pair yet' : 'Please link a property before loading this buyer timeline'}</p>
                           <p className="text-[10px] font-bold text-gray-300 mt-1 uppercase">No activity tracked yet</p>
                        </div>
                      )}
                   </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
