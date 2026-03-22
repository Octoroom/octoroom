'use client';

import React from 'react';
import { ArrowUp, ArrowDown, GripVertical, MoreHorizontal, Mic, MessageSquare, ChevronDown } from 'lucide-react';
import { CategoryIcon } from './shared';
import { ManagedProperty } from './types';

interface PropertyListProps {
  managedProperties: ManagedProperty[];
  selectedPropertyId: string;
  expandedPropertyId: string | null;
  activeView: 'summary' | 'pipeline';
  openPropertyMenuId: string | null;
  setOpenPropertyMenuId: (id: string | null | ((prev: string | null) => string | null)) => void;
  togglePropertyExpansion: (id: string) => void;
  handlePropertyDragStart: (index: number) => void;
  handlePropertyDrop: (index: number) => void;
  setDraggedPropertyIndex: (index: number | null) => void;
  setDraggedPropertyId: (id: string | null) => void;
  moveProperty: (index: number, direction: 'UP' | 'DOWN') => void;
  toggleWorkspaceProperty: (id: string, visible: boolean) => void;
  setActiveFollowUpBuyer: (buyer: any) => void;
  setIsFollowUpModalOpen: (open: boolean) => void;
  router: any;
  renderPropertyTimeline: (property: ManagedProperty) => React.ReactNode;
}

export const PropertyList: React.FC<PropertyListProps> = ({
  managedProperties,
  selectedPropertyId,
  expandedPropertyId,
  activeView,
  openPropertyMenuId,
  setOpenPropertyMenuId,
  togglePropertyExpansion,
  handlePropertyDragStart,
  handlePropertyDrop,
  setDraggedPropertyIndex,
  setDraggedPropertyId,
  moveProperty,
  toggleWorkspaceProperty,
  setActiveFollowUpBuyer,
  setIsFollowUpModalOpen,
  router,
  renderPropertyTimeline
}) => {
  const renderPropertyCard = (property: ManagedProperty, index: number) => {
    const isSelected = selectedPropertyId === property.id;
    const isExpanded = expandedPropertyId === property.id && activeView === 'summary';

    return (
      <div
        key={property.id}
        onClick={() => {
          setOpenPropertyMenuId(null);
          togglePropertyExpansion(property.id);
        }}
        className={`relative bg-white rounded-[20px] border shadow-sm overflow-hidden transition-all cursor-pointer ${
          isSelected ? 'border-black/10 hover:shadow-md' : 'border-gray-100 hover:shadow-md hover:border-gray-200'
        }`}
        draggable
        onDragStart={() => handlePropertyDragStart(index)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handlePropertyDrop(index)}
        onDragEnd={() => {
          setDraggedPropertyIndex(null);
          setDraggedPropertyId(null);
        }}
      >
        <div className="absolute right-3 top-3 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenPropertyMenuId((prev) => prev === property.id ? null : property.id);
            }}
            className="w-8 h-8 rounded-full bg-white/95 border border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors flex items-center justify-center shadow-sm"
            title="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {openPropertyMenuId === property.id && (
            <div className="absolute right-0 mt-2 min-w-[176px] rounded-2xl border border-gray-100 bg-white p-2 shadow-xl shadow-gray-200/70">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPropertyMenuId(null);
                  toggleWorkspaceProperty(property.id, false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <span>Remove from workspace</span>
                <span className="text-[10px] font-black uppercase tracking-wide opacity-60">Off</span>
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 p-4 pr-14">
          <div className="flex flex-col gap-1 mr-1 items-center shrink-0">
            <div className="text-gray-300 cursor-grab active:cursor-grabbing">
              <GripVertical className="w-3.5 h-3.5" />
            </div>
            <button
              disabled={index === 0}
              onClick={(e) => {
                e.stopPropagation();
                moveProperty(index, 'UP');
              }}
              className={`p-0.5 rounded-md hover:bg-gray-200 transition-colors ${index === 0 ? 'opacity-10' : 'text-gray-400 opacity-60'}`}
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              disabled={index === managedProperties.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                moveProperty(index, 'DOWN');
              }}
              className={`p-0.5 rounded-md hover:bg-gray-200 transition-colors ${index === managedProperties.length - 1 ? 'opacity-10' : 'text-gray-400 opacity-60'}`}
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
          <div className={`w-1.5 h-12 rounded-full shrink-0 ${isSelected ? 'bg-black' : 'bg-gray-200'}`} />
          <div className="w-16 h-16 rounded-xl bg-cover bg-center shrink-0 border border-gray-100 shadow-inner" style={{ backgroundImage: `url(${property.image || ''})` }} />
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-black text-gray-900 truncate tracking-tight">{property.address || 'Loading...'}</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {property.sellerAvatar && (
                  <img
                    src={property.sellerAvatar}
                    alt={property.vendor}
                    className="w-4 h-4 rounded-full border border-gray-100 shadow-sm"
                  />
                )}
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider truncate">Owner: {property.vendor || '...'}</p>
              </div>
              {property.sellerEmail && isSelected && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFollowUpBuyer({
                        id: property.sellerId || '',
                        name: property.vendor,
                        email: property.sellerEmail || '',
                        phone: '',
                        infoBadge: '',
                        financeStatus: 'UNAPPROVED',
                        status: 'WORKING',
                        conditions: [],
                        offerHistory: [],
                        lastFollowUp: '',
                        nextAction: '',
                        roleDescription: 'Seller'
                      });
                      setIsFollowUpModalOpen(true);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors group"
                    title="Record Seller Note"
                  >
                    <Mic className="w-3 h-3 text-gray-300 group-hover:text-blue-500" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (property.sellerProfileId) {
                        router.push(`/messages?chatWith=${property.sellerProfileId}`);
                      } else {
                        alert(`This owner (${property.vendor}) has not registered an Octoroom account yet.\nVerified email: ${property.sellerEmail || 'N/A'}`);
                      }
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors group"
                    title={property.sellerProfileId ? "Send Message" : "Owner account unavailable"}
                  >
                    <MessageSquare className={`w-3 h-3 ${property.sellerProfileId ? 'text-blue-500 group-hover:text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
              <CategoryIcon id="STATS" className="w-3.5 h-3.5 text-black" />
              <span className="text-[12px] font-black text-gray-700">{property.activeBuyers || 0} {isSelected ? '意向人' : 'Intent'}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePropertyExpansion(property.id);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? 'text-gray-500' : 'text-gray-300'} bg-gray-50`}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        {isExpanded && renderPropertyTimeline(property)}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 pr-1">
      <div className="flex items-center gap-2 mb-1 pl-1">
        <div className="w-[22px] h-[22px] rounded-[6px] bg-black flex items-center justify-center shadow-sm text-white">
          <CategoryIcon id="PROPERTIES" className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-[15px] font-black text-gray-900">当前维护房源</h2>
        <span className="text-gray-400 text-xs ml-1 font-medium">{managedProperties.length}</span>
      </div>

      {managedProperties.map((property, index) => renderPropertyCard(property, index))}
    </div>
  );
};
