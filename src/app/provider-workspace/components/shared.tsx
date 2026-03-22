import React from 'react';
import { ProviderStatus } from './types';

export function CategoryIcon({ id, className = "w-4 h-4" }: { id: string, className?: string }) {
  switch (id) {
    case 'PROPERTIES':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'BUYERS':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'STATS':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    default:
      return null;
  }
}

export function MondayStatusBadge({ status }: { status: ProviderStatus }) {
  const statusConfig = {
    WORKING: { text: '服务中', color: 'bg-[#00c875] text-white' }, 
    DONE: { text: '出价已推送', color: 'bg-[#0086c0] text-white' }, 
    PENDING: { text: '待确认', color: 'bg-[#fdab3d] text-white' }, 
    LOOKING: { text: '寻找中', color: 'bg-[#c4c4c4] text-white' }, 
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    text: status, 
    color: 'bg-orange-500 text-white shadow-orange-100' // Default fallback for AI statuses
  };

  return (
    <div className={`flex items-center justify-center min-w-[72px] px-2 h-[30px] rounded-[4px] text-[12px] font-bold tracking-wide shadow-sm transition-all hover:opacity-90 cursor-pointer whitespace-nowrap ${config.color}`}>
      {config.text}
    </div>
  );
}

export function PipelineStatusBadge({ status }: { status: ProviderStatus }) {
  const statusConfig: Record<string, { text: string; color: string }> = {
    WORKING: { text: 'Active', color: 'bg-[#00c875] text-white' },
    DONE: { text: 'Offer Sent', color: 'bg-[#0086c0] text-white' },
    PENDING: { text: 'Pending', color: 'bg-[#fdab3d] text-white' },
    LOOKING: { text: 'Looking', color: 'bg-[#c4c4c4] text-white' },
    pending_buyer_signature: { text: 'Buyer Sign', color: 'bg-[#0ea5e9] text-white' },
    pending_agent_review: { text: 'Agent Review', color: 'bg-[#a855f7] text-white' },
    pending_seller_signature: { text: 'Seller Sign', color: 'bg-[#f97316] text-white' },
    accepted: { text: 'Accepted', color: 'bg-[#16a34a] text-white' },
    sold: { text: 'Sold', color: 'bg-[#15803d] text-white' },
    rejected: { text: 'Rejected', color: 'bg-[#dc2626] text-white' },
  };

  const config = statusConfig[status] || {
    text: status,
    color: 'bg-orange-500 text-white shadow-orange-100'
  };

  return (
    <div className={`flex items-center justify-center min-w-[72px] px-2 h-[30px] rounded-[4px] text-[12px] font-bold tracking-wide shadow-sm transition-all hover:opacity-90 cursor-pointer whitespace-nowrap ${config.color}`}>
      {config.text}
    </div>
  );
}
