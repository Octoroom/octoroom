'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, FileText, CheckCircle2, ChevronRight, Share2, Plus, MessageSquare, Phone, Building2, MapPin, Search, Calendar, History, Sparkles, AlertCircle, Camera, Check, Link, Upload, ExternalLink, RefreshCw, Send, Trash2, ArrowUp, ArrowDown, Mic } from 'lucide-react';
import { FollowUpModal } from '@/components/workspace/FollowUpModal';
import { supabase } from '@/lib/supabase';

// --- 🌟 Types & Interfaces ---
type ProviderStatus = string; // Relaxed to allow dynamic AI statuses

interface Condition {
  id: string;
  name: string;
  dueDate: string;
  status: 'PENDING' | 'WAITING' | 'MET' | 'FAILED';
}

interface ActivityLog {
  id: string;
  type: 'CALL' | 'VIEWING' | 'EMAIL' | 'OFFER' | 'NOTE';
  content: string;
  timestamp: string;
  agentName: string;
}

interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  infoBadge: string;
  financeStatus: 'CASH' | 'CONDITIONAL' | 'UNAPPROVED';
  status: ProviderStatus;
  conditions: Condition[];
  offerHistory: {
    status: 'DRAFT' | 'SENT' | 'INITIALED' | 'NEGOTIATING' | 'ACCEPTED';
    date: string;
    price: string;
  }[];
  lastFollowUp: string;
  nextAction: string;
  roleDescription?: string;
  company?: string;
}

interface ManagedProperty {
  id: string;
  address: string;
  vendor: string;
  sellerId?: string;
  sellerEmail?: string;
  sellerAvatar?: string;
  sellerProfileId?: string;
  image: string;
  status: 'ACTIVE' | 'SOLD' | 'WITHDRAWN';
  activeBuyers: number;
  scheduledViewings: number;
  themeColor: string;
}

interface Lawyer {
  id: string;
  full_name: string;
  username: string;
}

interface OfferRow {
  id: string;
  buyer_id: string;
  status: string;
  offer_price: number | null;
  created_at: string;
}

interface FollowUpNoteRow {
  buyer_id: string;
  created_at: string;
  metadata?: {
    recommendedStatus?: string;
  } | null;
}

type WorkspaceView = 'summary' | 'pipeline';

// --- 🎨 Components from Providers Page Style ---
function CategoryIcon({ id, className = "w-4 h-4" }: { id: string, className?: string }) {
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

function MondayStatusBadge({ status }: { status: ProviderStatus }) {
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

function PipelineStatusBadge({ status }: { status: ProviderStatus }) {
  const statusConfig: Record<string, { text: string; color: string }> = {
    WORKING: { text: 'Active', color: 'bg-[#00c875] text-white' },
    DONE: { text: 'Offer Sent', color: 'bg-[#0086c0] text-white' },
    PENDING: { text: 'Pending', color: 'bg-[#fdab3d] text-white' },
    LOOKING: { text: 'Looking', color: 'bg-[#c4c4c4] text-white' },
    pending_buyer_signature: { text: 'Buyer Sign', color: 'bg-[#0ea5e9] text-white' },
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

// --- 📊 Mock Data (Temporarily still used for pipeline while crm_contacts remains personal) ---
const MOCKED_PROPERTIES: ManagedProperty[] = [
  {
    id: '17419957-de38-4e16-ba44-3fadf6c468c1',
    address: '110 Tihi Street, Stonefields',
    vendor: 'John & Jane Doe',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    status: 'ACTIVE',
    activeBuyers: 4,
    scheduledViewings: 12,
    themeColor: '#ff7575',
  }
];

const MOCKED_PIPELINE: Record<string, Buyer[]> = {
  '17419957-de38-4e16-ba44-3fadf6c468c1': [
    {
      id: 'b1',
      name: 'Alice Johnson',
      email: 'alice.j@example.com',
      phone: '021 123 4567',
      infoBadge: '$1,950,000',
      financeStatus: 'CONDITIONAL',
      status: 'WORKING',
      roleDescription: 'Cash Buyer (Approved)',
      company: 'Auckland Real Estate Investors',
      conditions: [
        { id: 'c1', name: 'Finance', dueDate: '2026-03-25', status: 'WAITING' },
        { id: 'c2', name: 'Building', dueDate: '2026-03-20', status: 'MET' }
      ],
      offerHistory: [{ status: 'NEGOTIATING', date: '2h ago', price: '$1,850,000' }],
      lastFollowUp: 'Today, 10:00 AM',
      nextAction: 'Follow up on finance letter'
    },
    {
      id: 'b2',
      name: 'David Chen',
      email: 'david.c@example.com',
      phone: '022 987 6543',
      infoBadge: '$1,800,000',
      financeStatus: 'CASH',
      status: 'PENDING',
      roleDescription: 'First Home Buyer',
      company: 'Tech Professionals Coop',
      conditions: [],
      offerHistory: [{ status: 'SENT', date: 'Yesterday', price: '$1,780,000' }],
      lastFollowUp: 'Yesterday, 3:30 PM',
      nextAction: 'Private viewing scheduled for Sat'
    }
  ]
};

const MOCKED_ACTIVITY: Record<string, ActivityLog[]> = {};

export default function AgentWorkspacePage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<WorkspaceView>('summary');
  const [managedProperties, setManagedProperties] = useState<ManagedProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [expandedBuyerId, setExpandedBuyerId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [cloudBuyers, setCloudBuyers] = useState<Buyer[]>([]);
  const [loadingCloudData, setLoadingCloudData] = useState(false);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activityCache, setActivityCache] = useState<Record<string, ActivityLog[]>>({});
  const [orderedPipeline, setOrderedPipeline] = useState<Buyer[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [activeFollowUpBuyer, setActiveFollowUpBuyer] = useState<Buyer | null>(null);

  // Update orderedPipeline whenever mocked or cloud buyers change
  useEffect(() => {
    const basePipeline = cloudBuyers.length > 0
      ? [...cloudBuyers]
      : [...(MOCKED_PIPELINE[selectedPropertyId] || [])];
    
    // 🧠 Load persisted order from localStorage
    const savedOrder = localStorage.getItem(`octoroom_pipeline_order_${selectedPropertyId}`);
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder) as string[];
        const sorted = [...basePipeline].sort((a, b) => {
          const indexA = orderIds.indexOf(a.id);
          const indexB = orderIds.indexOf(b.id);
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        setOrderedPipeline(sorted);
        return;
      } catch (e) {
        console.warn("Failed to parse saved order:", e);
      }
    }
    
    setOrderedPipeline(basePipeline);
  }, [selectedPropertyId, cloudBuyers]);

  // Helper to persist order
  const persistOrder = (pipeline: Buyer[]) => {
    const ids = pipeline.map(b => b.id);
    localStorage.setItem(`octoroom_pipeline_order_${selectedPropertyId}`, JSON.stringify(ids));
  };

  // --- 📝 Add Customer Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    type: 'BUYER',
    solicitor_id: ''
  });

  const currentProperty = managedProperties.find(p => p.id === selectedPropertyId) || managedProperties[0];
  const formatOfferPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined || Number.isNaN(Number(price))) {
      return 'No Offer Yet';
    }
    return `$${Number(price).toLocaleString()}`;
  };

  const getLatestRecommendedStatus = (notes: FollowUpNoteRow[] | null | undefined) => {
    const latestRecommended = (notes || []).find((note) => note?.metadata?.recommendedStatus);
    return latestRecommended?.metadata?.recommendedStatus || null;
  };

  const loadCloudBuyers = async (agentId: string, propertyId?: string) => {
    setLoadingCloudData(true);

    const { data: contacts, error: contactsError } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('agent_id', agentId)
      .eq('type', 'BUYER');

    if (contactsError || !contacts) {
      setLoadingCloudData(false);
      return;
    }

    const emails = contacts.map((contact: any) => contact.email).filter(Boolean);
    const { data: profiles } = emails.length > 0
      ? await supabase.from('profiles').select('id, email').in('email', emails)
      : { data: [] as { id: string; email: string }[] };

    const profileIdByEmail = new Map(
      (profiles || []).map((profile: { id: string; email: string }) => [profile.email.toLowerCase(), profile.id])
    );

    let offers: OfferRow[] = [];
    let offerBuyerEmailById = new Map<string, string>();
    let notes: FollowUpNoteRow[] = [];
    if (propertyId) {
      const { data: offerRows } = await supabase
        .from('octo_offers')
        .select('id, buyer_id, status, offer_price, created_at')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      offers = offerRows || [];

      const offerBuyerIds = [...new Set(offers.map((offer) => offer.buyer_id).filter(Boolean))];
      if (offerBuyerIds.length > 0) {
        const { data: offerBuyerProfiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', offerBuyerIds);

        offerBuyerEmailById = new Map(
          (offerBuyerProfiles || [])
            .filter((profile: { id: string; email: string | null }) => !!profile.email)
            .map((profile: { id: string; email: string }) => [profile.id, profile.email.toLowerCase()])
        );
      }

      const { data: noteRows } = await supabase
        .from('crm_notes')
        .select('buyer_id, created_at, metadata')
        .eq('property_id', propertyId)
        .eq('type', 'ai_summary')
        .order('created_at', { ascending: false });

      notes = noteRows || [];
    }

    const mappedBuyers: Buyer[] = contacts.map((contact: any) => {
      const authBuyerId = contact.email ? profileIdByEmail.get(contact.email.toLowerCase()) : null;
      const normalizedEmail = contact.email?.toLowerCase();
      const latestOffer = offers.find((offer) =>
        offer.buyer_id === authBuyerId ||
        offer.buyer_id === contact.id ||
        (!!normalizedEmail && offerBuyerEmailById.get(offer.buyer_id) === normalizedEmail)
      );
      const buyerNotes = notes.filter((note) =>
        note.buyer_id === authBuyerId || note.buyer_id === contact.id
      );
      const latestRecommendedStatus = getLatestRecommendedStatus(buyerNotes);
      const latestContactStatus = latestRecommendedStatus || contact.status || 'PENDING';
      const unifiedStatus = (latestOffer?.status as ProviderStatus) || (latestContactStatus as ProviderStatus);

      return {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone || '',
        infoBadge: latestOffer ? formatOfferPrice(latestOffer.offer_price) : latestContactStatus,
        financeStatus: 'UNAPPROVED',
        status: unifiedStatus,
        conditions: [],
        offerHistory: latestOffer ? [{
          status: latestOffer.status === 'accepted' ? 'ACCEPTED' : latestOffer.status === 'pending_seller_signature' ? 'SENT' : latestOffer.status === 'pending_buyer_signature' ? 'DRAFT' : latestOffer.status === 'rejected' ? 'NEGOTIATING' : 'DRAFT',
          date: new Date(latestOffer.created_at).toLocaleString(),
          price: formatOfferPrice(latestOffer.offer_price),
        }] : [],
        lastFollowUp: buyerNotes[0]?.created_at ? new Date(buyerNotes[0].created_at).toLocaleString() : 'N/A',
        nextAction: latestOffer ? `Latest OA status: ${latestOffer.status}` : `Latest follow-up: ${latestContactStatus}`,
        roleDescription: latestOffer ? 'Offer Synced' : 'Cloud Client',
        company: contact.address || 'Unknown Address'
      };
    });

    setCloudBuyers(mappedBuyers);
    setLoadingCloudData(false);
  };

  // Prefer cloud-synced buyers whenever they exist so real-time updates are not masked by mock data.
  const pipeline = cloudBuyers.length > 0
    ? [...cloudBuyers]
    : (selectedPropertyId && MOCKED_PIPELINE[selectedPropertyId] ? [...MOCKED_PIPELINE[selectedPropertyId]] : []);

  useEffect(() => {
    async function fetchManagedProperties(agentId: string) {
      // 1. Fetch all sellers for this agent to get their property addresses
      const { data: sellers } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('agent_id', agentId)
        .eq('type', 'SELLER');

      const sellerAddresses = sellers?.map((s: any) => s.address).filter(Boolean) || [];

      // 2. Fetch properties where agent is author OR address matches a CRM seller
      let query = supabase
        .from('octo_properties')
        .select('*');
      
      if (sellerAddresses.length > 0) {
        query = query.or(`author_id.eq.${agentId},address_name.in.(${sellerAddresses.map((a: string) => `"${a}"`).join(',')})`);
      } else {
        query = query.eq('author_id', agentId);
      }

      const { data: props, error } = await query;

      if (error) {
        console.error("Fetch properties failed:", error);
        return;
      }

      if (props && props.length > 0) {
        // --- 🔍 Fetch profiles for matched sellers using case-insensitive ilike ---
        const sellerEmails = sellers?.map((s: any) => s.email).filter(Boolean) || [];
        
        let profiles: any[] = [];
        if (sellerEmails.length > 0) {
          // 🔍 Try to find by email (using ilike)
          const orFilter = sellerEmails.map((email: string) => `email.ilike.${email}`).join(',');
          const { data: emailMatches } = await supabase
            .from('profiles')
            .select('id, email, username')
            .or(orFilter);
            
          profiles = [...(emailMatches || [])];
          
          // 🔍 FALLBACK: Try to find by the seller's names in the CRM (just in case they registered with a different email)
          const sellerNames = sellers?.map((s: any) => s.name).filter(Boolean) || [];
          if (sellerNames.length > 0) {
            const nameFilter = sellerNames.map((name: string) => `username.ilike.%${name}%`).join(',');
            const { data: nameMatches } = await supabase
              .from('profiles')
              .select('id, email, username')
              .or(nameFilter);
            
            // Add unique name matches to profiles list
            if (nameMatches) {
              nameMatches.forEach((nm: any) => {
                if (!profiles.find((p: any) => p.id === nm.id)) profiles.push(nm);
              });
            }
          }
        }

        console.log('[DEBUG_WORKSPACE] All potentially matched profiles found:', profiles);

        const mapped: ManagedProperty[] = props.map((p: any) => {
          // Robust address matching (trimmed and case-insensitive)
          const propAddr = (p.address_name || p.title || '').trim().toLowerCase();
          const seller = sellers?.find((s: any) => {
            const sellerAddr = (s.address || '').trim().toLowerCase();
            return sellerAddr === propAddr && propAddr !== '';
          });

          // Robust mapping
          let profile = profiles.find((pr: any) => 
            pr.email?.toLowerCase() === seller?.email?.toLowerCase() && seller?.email
          );
          
          // Fallback to username matching if email didn't hit
          if (!profile && seller) {
            profile = profiles.find((pr: any) => 
              pr.username?.toLowerCase().includes(seller.name.toLowerCase()) ||
              seller.name.toLowerCase().includes(pr.username?.toLowerCase() || '')
            );
          }

          // 🔍 DEBUG: Log the result for the agent to check in console
          if (seller) {
            console.log(`[DEBUG_WORKSPACE] Property "${propAddr}" matched seller "${seller.name}" (${seller.email || 'no email'}). Profile linked: ${profile?.id ? `YES (username: ${profile.username})` : 'NO'}`);
          }

          return {
            id: p.id,
            address: p.address_name || p.title,
            vendor: seller ? seller.name : (p.author_name || '房东'),
            sellerId: seller ? seller.id : undefined,
            sellerEmail: seller ? seller.email : undefined,
            sellerAvatar: seller ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${seller.name}` : undefined,
            sellerProfileId: profile ? profile.id : undefined,
            image: p.cover_image ? p.cover_image.split(',')[0] : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
            status: p.status === 'active' ? 'ACTIVE' : (p.status === 'sold' ? 'SOLD' : 'WITHDRAWN'),
            activeBuyers: 0, 
            scheduledViewings: 0,
            themeColor: '#0086c0'
          };
        });

        setManagedProperties(mapped);
        if (mapped.length > 0 && !selectedPropertyId) {
          setSelectedPropertyId(mapped[0].id);
        }
      }
    }

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsAuthorizing(false);
        return;
      }
      setCurrentAgentId(session.user.id);
      loadCloudBuyers(session.user.id, selectedPropertyId);
      fetchManagedProperties(session.user.id); // Fetch real properties here
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      setUserRole(profile?.role || null);
      setIsAuthorizing(false);
    }
    checkAuth();

    async function fetchLawyers() {
      const { data } = await supabase.from('profiles').select('id, full_name, username').eq('role', 'LAWYER');
      if (data) setLawyers(data);
    }
    fetchLawyers();
  }, [selectedPropertyId]);

  useEffect(() => {
    if (!currentAgentId || !selectedPropertyId) return;

    const refreshCloudBuyers = () => {
      loadCloudBuyers(currentAgentId, selectedPropertyId);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshCloudBuyers();
      }
    };

    const offersChannel = supabase
      .channel(`workspace-offers-${selectedPropertyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'octo_offers', filter: `property_id=eq.${selectedPropertyId}` },
        refreshCloudBuyers
      )
      .subscribe();

    window.addEventListener('focus', refreshCloudBuyers);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshCloudBuyers);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(offersChannel);
    };
  }, [currentAgentId, selectedPropertyId]);

  // --- 🌟 Fetch Real Activities for Transaction Timeline ---
  useEffect(() => {
    if (!selectedPropertyId || !currentAgentId) return;

    if (expandedBuyerId) {
      const selectedBuyer = pipeline.find(b => b.id === expandedBuyerId);
      if (selectedBuyer) {
        fetchRealActivities(selectedBuyer);
      }
    } else {
      // 🏘️ Fetch Property-Level activities (Seller context)
      if (currentProperty && currentProperty.sellerEmail) {
        fetchRealActivities({
          id: currentProperty.sellerId || '',
          name: currentProperty.vendor,
          email: currentProperty.sellerEmail,
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
      }
    }
  }, [expandedBuyerId, selectedPropertyId, currentAgentId, currentProperty]);

  // --- 🛰️ Real-time Subscriptions for Activities & Status ---
  useEffect(() => {
    if (!currentAgentId) return;

    // 1. Listen for CRM Contact Updates (for status bar real-time sync)
    const contactChannel = supabase
      .channel('crm_status_updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'crm_contacts',
        filter: `agent_id=eq.${currentAgentId}`
      }, (payload) => {
        console.log('[REALTIME] CRM Contact Updated:', payload);
        const updated = payload.new as any;
        setCloudBuyers(prev => prev.map(b => b.id === updated.id ? { ...b, status: updated.status } : b));
      })
      .subscribe();

    // 2. Listen for Activity Updates (Notifications & Notes)
    const activityChannel = supabase
      .channel('activity_stream')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `reference_id=eq.${selectedPropertyId}`
      }, () => {
        console.log('[REALTIME] New Notification - Refreshing Activities');
        // Clear appropriate cache and refresh
        if (expandedBuyerId) {
          const buyer = pipeline.find(b => b.id === expandedBuyerId);
          if (buyer) {
            setActivityCache(prev => {
              const nc = { ...prev };
              delete nc[buyer.id];
              return nc;
            });
            fetchRealActivities(buyer, true);
          }
        } else {
           // Refresh property-level activities
           fetchRealActivities({ id: currentProperty?.sellerId || '', email: currentProperty?.sellerEmail || '' } as any, true);
        }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'crm_notes',
        filter: `property_id=eq.${selectedPropertyId}`
      }, () => {
        console.log('[REALTIME] New CRM Note - Refreshing Activities');
        if (expandedBuyerId) {
          const buyer = pipeline.find(b => b.id === expandedBuyerId);
          if (buyer) {
            setActivityCache(prev => {
              const nc = { ...prev };
              delete nc[buyer.id];
              return nc;
            });
            fetchRealActivities(buyer, true);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(contactChannel);
      supabase.removeChannel(activityChannel);
    };
  }, [currentAgentId, selectedPropertyId, expandedBuyerId, currentProperty]);

  const fetchRealActivities = async (buyer: Buyer, forceRefresh: boolean = false) => {
    // 💡 Instant Cache Check
    if (!forceRefresh && activityCache[buyer.id]) {
      setActivities(activityCache[buyer.id]);
      return;
    }

    setLoadingActivities(true);
    try {
      const res = await fetch(`/api/workspace/activities?propertyId=${selectedPropertyId}&buyerEmail=${buyer.email}&buyerId=${buyer.id}`);
      const data = await res.json();

      if (data.activities && Array.isArray(data.activities)) {
        const mapped: ActivityLog[] = data.activities.map((n: any) => ({
          id: n.id,
          type: (n.type === 'offer' || n.type.startsWith('offer_')) ? 'OFFER' : 'NOTE',
          content: n.content || mapNotifToText(n.type),
          timestamp: new Date(n.created_at).toLocaleString(),
          agentName: n.source === 'crm_note' ? '代理跟进' : '系统推送'
        }));
        setActivities(mapped);
        // 🚀 Update Cache
        setActivityCache(prev => ({ ...prev, [buyer.id]: mapped }));
      } else {
        setActivities([]);
      }
    } catch (err) {
      console.error("Fetch activities failed:", err);
      setActivities([]);
    }
    setLoadingActivities(false);
  };

  const moveBuyer = (index: number, direction: 'UP' | 'DOWN') => {
    const newPipeline = [...orderedPipeline];
    if (direction === 'UP' && index > 0) {
      [newPipeline[index], newPipeline[index - 1]] = [newPipeline[index - 1], newPipeline[index]];
    } else if (direction === 'DOWN' && index < newPipeline.length - 1) {
      [newPipeline[index], newPipeline[index + 1]] = [newPipeline[index + 1], newPipeline[index]];
    }
    setOrderedPipeline(newPipeline);
    persistOrder(newPipeline);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newPipeline = [...orderedPipeline];
    const item = newPipeline.splice(draggedIndex, 1)[0];
    newPipeline.splice(index, 0, item);
    
    setOrderedPipeline(newPipeline);
    persistOrder(newPipeline);
    setDraggedIndex(null);
  };

  const handleSaveFollowUp = async (summary: string, transcript: string, recommendedStatus?: string) => {
    if (!activeFollowUpBuyer) return;
    const isSeller = activeFollowUpBuyer.roleDescription === 'Seller';
    
    try {
      // 1. Post to activities API (handles notes/summaries)
      const res = await fetch('/api/workspace/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          buyerId: activeFollowUpBuyer.id,
          buyerEmail: activeFollowUpBuyer.email,
          agentId: currentAgentId,
          type: 'followup_ai',
          content: summary,
          metadata: { 
            transcript,
            recommendedStatus,
            recipientRole: isSeller ? 'Seller' : 'Buyer'
          }
        })
      });

      if (res.ok) {
        // 2. Clear activity cache for this buyer FIRST to ensure next fetch is fresh
        setActivityCache(prev => {
          const newCache = { ...prev };
          delete newCache[activeFollowUpBuyer.id];
          return newCache;
        });

        // 3. Update CRM contact status if AI recommended one (SKIP FOR SELLERS & MOCK BUYERS)
        const isCloudBuyer = activeFollowUpBuyer.roleDescription === 'Cloud Client' || activeFollowUpBuyer.roleDescription === 'Offer Synced';
        if (recommendedStatus && !isSeller && isCloudBuyer) {
           const { error: updateError } = await supabase
             .from('crm_contacts')
             .update({ status: recommendedStatus })
             .eq('id', activeFollowUpBuyer.id);
             
           if (updateError) {
             console.error("Failed to update CRM status in Supabase:", updateError);
           } else {
             setCloudBuyers(prev => prev.map((buyer) =>
               buyer.id === activeFollowUpBuyer.id
                 ? {
                     ...buyer,
                     infoBadge: buyer.offerHistory.length > 0 ? buyer.infoBadge : recommendedStatus,
                     status: buyer.offerHistory.length > 0 ? buyer.status : recommendedStatus,
                     lastFollowUp: new Date().toLocaleString(),
                     nextAction: `Latest follow-up: ${recommendedStatus}`,
                   }
                 : buyer
             ));
           }
        }

        // 4. Refresh data for this contact (force refresh)
        fetchRealActivities(activeFollowUpBuyer, true);
        
        // 5. Refresh cloud contacts to update the status badge on the dashboard
        if (currentAgentId && !isSeller) {
          await loadCloudBuyers(currentAgentId, selectedPropertyId);
        }
      }
    } catch (err) {
      console.error("Save follow-up failed:", err);
    }
  };

  const mapNotifToText = (type: string) => {
    switch (type) {
      case 'offer': return '代理已向买家推送购房协议 (Offer)';
      case 'offer_signed_buyer': return '买家已完成签署，等待卖家确认';
      case 'offer_signed_seller': return '卖家已接受并签署，交易合意达成！';
      case 'offer_rejected': return '该出价已被婉拒 (Rejected)';
      default: return '交易流状态更新';
    }
  };

  const navigateToDraft = (buyerId: string, email: string, name: string) => {
    const params = new URLSearchParams({
      property_id: selectedPropertyId,
      buyer: buyerId,
      buyer_email: email,
      buyer_name: name,
      agent_id: currentAgentId || ''
    });
    router.push(`/contract/${selectedPropertyId}/prepare?${params.toString()}`);
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAgentId) {
      alert('请先登录。');
      return;
    }
    
    setFormLoading(true);
    
    const { error } = await supabase
      .from('crm_contacts')
      .insert({
        agent_id: currentAgentId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        type: formData.type,
        solicitor_id: formData.solicitor_id || null,
        status: 'PENDING'
      });

    if (error) {
      console.error('Persistence error:', error);
      alert('同步失败，请确保您已经在 Supabase 中创建了 crm_contacts 表。');
    } else {
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', address: '', type: 'BUYER', solicitor_id: '' });
      alert('客户已成功同步到云端 CRM！');
    }
    
    setFormLoading(false);
  };

  if (isAuthorizing) return <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center font-bold text-gray-400">Loading Workspace...</div>;

  if (userRole?.toLowerCase() !== 'agent' && userRole?.toLowerCase() !== 'admin') {
    return (
      <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
          <h1 className="text-[18px] font-black text-gray-900 mb-2">Agent Access Only</h1>
          <button onClick={() => router.push('/')} className="mt-4 px-6 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-black transition-colors">
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-[#fefefe] flex flex-col relative mx-auto font-sans">
      
      {/* 顶部导航 (Providers Page Style) */}
      <div className="bg-white/80 backdrop-blur-md px-4 py-4 border-b border-gray-100 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-[18px] font-black text-gray-900 leading-tight">代理商工作台 (Cloud Workspace)</h1>
            <p className="text-[12px] text-gray-500 font-medium mt-0.5">管线数据已实时接入 Supabase</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/provider-workspace/crm')}
            className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-full text-[13px] font-bold hover:bg-gray-100 transition-all shadow-sm"
          >
            <CategoryIcon id="BUYERS" className="w-3.5 h-3.5" />
            进入 CRM
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-800 shadow-sm transition-transform active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-8 pb-28">
        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setActiveView('summary');
                setExpandedBuyerId(null);
              }}
              className={`rounded-2xl px-4 py-3 text-[13px] font-black transition-all ${
                activeView === 'summary'
                  ? 'bg-black text-white shadow-lg shadow-gray-200'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              Sales Summary
            </button>
            <button
              onClick={() => setActiveView('pipeline')}
              className={`rounded-2xl px-4 py-3 text-[13px] font-black transition-all ${
                activeView === 'pipeline'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              Buyer Pipeline
            </button>
          </div>
        </div>
        {/* --- Featured Property Section --- */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1 pl-1">
            <div className="w-[22px] h-[22px] rounded-[6px] bg-black flex items-center justify-center shadow-sm text-white">
              <CategoryIcon id="PROPERTIES" className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-[15px] font-black text-gray-900">当前维护房源</h2>
            <span className="text-gray-400 text-xs ml-1 font-medium">1</span>
          </div>

          <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 p-4">
               <div className="w-1.5 h-12 rounded-full shrink-0 bg-black" />
               <div className="w-16 h-16 rounded-xl bg-cover bg-center shrink-0 border border-gray-100 shadow-inner" style={{ backgroundImage: `url(${currentProperty?.image || ''})` }} />
               <div className="flex-1 truncate">
                   <h3 className="text-[16px] font-black text-gray-900 truncate tracking-tight">{currentProperty?.address || '加载中...'}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        {currentProperty?.sellerAvatar && (
                          <img 
                            src={currentProperty.sellerAvatar} 
                            alt={currentProperty.vendor} 
                            className="w-4 h-4 rounded-full border border-gray-100 shadow-sm"
                          />
                        )}
                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">业主: {currentProperty?.vendor || '...'}</p>
                      </div>
                      {currentProperty?.sellerEmail && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveFollowUpBuyer({
                                id: currentProperty.sellerId || '',
                                name: currentProperty.vendor,
                                email: currentProperty.sellerEmail || '',
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
                            title="记录业主跟进 (Record Seller Note)"
                          >
                            <Mic className="w-3 h-3 text-gray-300 group-hover:text-blue-500" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (currentProperty.sellerProfileId) {
                                router.push(`/messages?chatWith=${currentProperty.sellerProfileId}`);
                              } else {
                                alert(`该房东 (${currentProperty.vendor}) 尚未注册 Octoroom 账户，暂时无法站内私信。\n(验证邮箱: ${currentProperty.sellerEmail || '无'})`);
                              }
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors group"
                            title={currentProperty.sellerProfileId ? "发送私信 (Send Message)" : "房东未注册账户"}
                          >
                            <MessageSquare className={`w-3 h-3 ${currentProperty.sellerProfileId ? 'text-blue-500 group-hover:text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
                          </button>
                        </div>
                      )}
                    </div>
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 shrink-0">
                  <CategoryIcon id="STATS" className="w-3.5 h-3.5 text-black" />
                   <span className="text-[12px] font-black text-gray-700">{currentProperty?.activeBuyers || 0} 意向人</span>
               </div>
            </div>
          </div>
        </div>

        {/* --- 🏘️ Property & Seller Unified Timeline (Shown when no buyer expanded) --- */}
        {activeView === 'summary' && !expandedBuyerId && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between pl-1 pr-1">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-400" />
                <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-widest">房源动态及业主沟通 (Property Timeline)</h4>
              </div>
              <span className="text-[10px] font-bold text-gray-300 uppercase">Live Update</span>
            </div>

            {loadingActivities ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 bg-gray-50/50 rounded-[24px] border border-gray-100">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin"></div>
                <span className="text-[11px] font-bold text-gray-400">正在同步房源流水...</span>
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-4 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-[2px] before:bg-gray-100/60">
                {activities.map((log, idx) => (
                  <div key={log.id} className="relative pl-12 group">
                    <div className={`absolute left-0 top-1.5 w-[40px] h-[40px] rounded-full border-4 border-gray-50 flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${idx === 0 ? 'bg-black text-white shadow-xl shadow-gray-200' : 'bg-white text-gray-400 border-gray-100'}`}>
                       {idx === 0 ? (
                         <Sparkles className="w-4 h-4" />
                       ) : (
                         <div className="w-2 h-2 rounded-full bg-gray-200" />
                       )}
                    </div>
                    <div className="p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm transition-all hover:border-gray-200 hover:shadow-md">
                       <div className="flex justify-between items-center mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${idx === 0 ? 'text-black' : 'text-gray-400'}`}>
                            {idx === 0 ? '房源新动态' : '历史轨迹'}
                          </span>
                          <span className="text-[10px] font-bold text-gray-300">{log.timestamp}</span>
                       </div>
                       <p className="text-[14px] font-bold text-gray-800 leading-relaxed">{log.content}</p>
                       <div className="mt-2 flex items-center gap-1.5 opacity-40">
                         <div className="w-3 h-3 rounded-full bg-gray-200" />
                         <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">{log.agentName}</span>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-200/50">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                   <History className="w-6 h-6 text-gray-200" />
                </div>
                <p className="text-[13px] font-black text-gray-400">暂无房源动态或业主沟通记录</p>
                <p className="text-[10px] font-bold text-gray-300 mt-1 uppercase">Start recording notes to see them here</p>
              </div>
            )}
          </div>
        )}

        {/* --- Buyers Pipeline Section --- */}
        {activeView === 'pipeline' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1 pl-1">
            <div className="w-[22px] h-[22px] rounded-[6px] bg-blue-600 flex items-center justify-center shadow-sm text-white">
              <CategoryIcon id="BUYERS" className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-[15px] font-black text-blue-600">买家管线 (Pipeline)</h2>
            <span className="text-gray-400 text-xs ml-1 font-medium">{pipeline.length}</span>
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
                  <div className={`px-4 bg-gray-50/30 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[800px] py-6 border-t border-gray-100' : 'max-h-0'}`}>
                       <div className="flex gap-3 mb-8">
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigateToDraft(buyer.id, buyer.email, buyer.name); }}
                            className="flex-1 bg-black text-white font-black py-3 rounded-2xl shadow-xl shadow-gray-200 flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-95 transition-all text-[13px] tracking-tight"
                          >
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                             生成出价 (Create Offer)
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
                              记录跟进 note
                           </button>
                       </div>

                       <div className="space-y-4">
                          <div className="flex items-center justify-between pl-1 pr-1">
                            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">交易动态实时线 (Timeline)</h4>
                            <span className="text-[10px] font-bold text-gray-300 uppercase">Live Update</span>
                          </div>
                          
                          {loadingActivities ? (
                            <div className="py-8 flex flex-col items-center justify-center gap-3">
                               <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin"></div>
                               <span className="text-[11px] font-bold text-gray-400">正在同步交易流水...</span>
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
                                            {idx === 0 ? '最新动态' : '历史轨迹'}
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
                               <p className="text-[12px] font-black text-gray-400">暂无该笔交易的相关流水记录</p>
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
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[640px] mx-auto bg-gradient-to-t from-white via-white/95 to-transparent p-4 pb-8 z-40 backdrop-blur-sm">
        <button 
          onClick={() => router.push('/provider-workspace/crm')}
          className="w-full bg-black text-white font-black py-4 rounded-2xl hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
           查看全库 CRM 客户中心
        </button>
      </div>

      {/* --- 📝 Add Customer Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white w-full max-w-[480px] rounded-[24px] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-[17px] font-black text-gray-900">同步至云端 CRM</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddCustomerSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">姓名</label>
                <input 
                  type="text" required placeholder="Full Name"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">电子邮件</label>
                  <input type="email" required placeholder="Email" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">电话</label>
                  <input type="tel" required placeholder="Phone" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">客户类型</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold cursor-pointer"
                  value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="BUYER">买家 (Buyer)</option>
                  <option value="SELLER">卖家 (Seller)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">关联律师</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold cursor-pointer"
                  value={formData.solicitor_id} onChange={e => setFormData({...formData, solicitor_id: e.target.value})}
                >
                  <option value="">暂不指派</option>
                  {lawyers.map(l => ( <option key={l.id} value={l.id}>{l.full_name || l.username}</option> ))}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[14px] font-black text-gray-500">取消</button>
                <button type="submit" disabled={formLoading} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-[14px] font-black shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">
                  {formLoading ? '正在同步云端...' : '确认同步到数据库'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeFollowUpBuyer && (
        <FollowUpModal 
          isOpen={isFollowUpModalOpen}
          onClose={() => {
            setIsFollowUpModalOpen(false);
            setActiveFollowUpBuyer(null);
          }}
          buyerName={activeFollowUpBuyer.name}
          onSave={(summary: string, transcript: string, recommendedStatus?: string) => handleSaveFollowUp(summary, transcript, recommendedStatus)}
        />
      )}

    </main>
  );
}
