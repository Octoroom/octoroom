'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, FileText, CheckCircle2, ChevronRight, Share2, Plus, MessageSquare, Phone, Building2, MapPin, Search, Calendar, History, Sparkles, AlertCircle, Camera, Check, Link, Upload, ExternalLink, RefreshCw, Send, ArrowUp, ArrowDown, Mic, GripVertical, ChevronDown, MoreHorizontal } from 'lucide-react';
import { FollowUpModal } from './components/FollowUpModal';
import { supabase } from '@/lib/supabase';
import { CategoryIcon, PipelineStatusBadge } from './components/shared';
import { PropertyList } from './components/PropertyList';
import { PipelineBoard } from './components/PipelineBoard';
import { PropertyTimeline } from './components/PropertyTimeline';
import { AddBuyerModal } from './components/AddBuyerModal';
import { 
  ProviderStatus, Condition, ActivityLog, Buyer, ManagedProperty, 
  Lawyer, OfferRow, FollowUpNoteRow, CRMContactRow, WorkspaceView 
} from './components/types';

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
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);
  const [expandedBuyerId, setExpandedBuyerId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [cloudBuyers, setCloudBuyers] = useState<Buyer[]>([]);
  const [workspacePropertyIds, setWorkspacePropertyIds] = useState<string[]>([]);
  const [loadingCloudData, setLoadingCloudData] = useState(false);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activityCache, setActivityCache] = useState<Record<string, ActivityLog[]>>({});
  const [orderedPipeline, setOrderedPipeline] = useState<Buyer[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedPropertyIndex, setDraggedPropertyIndex] = useState<number | null>(null);
  const [draggedPropertyId, setDraggedPropertyId] = useState<string | null>(null);
  const [openPropertyMenuId, setOpenPropertyMenuId] = useState<string | null>(null);
  const [buyerPropertyAssignments, setBuyerPropertyAssignments] = useState<Record<string, string[]>>({});
  const [buyerActivePropertyIds, setBuyerActivePropertyIds] = useState<Record<string, string>>({});
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [activeFollowUpBuyer, setActiveFollowUpBuyer] = useState<Buyer | null>(null);

  // Update orderedPipeline whenever mocked or cloud buyers change
  useEffect(() => {
    const basePipeline = [...cloudBuyers];

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

  const persistPropertyOrder = (properties: ManagedProperty[]) => {
    const ids = properties.map((property) => property.id);
    localStorage.setItem('octoroom_workspace_property_order', JSON.stringify(ids));
  };

  const sortPropertiesBySavedOrder = (properties: ManagedProperty[]) => {
    const savedOrder = localStorage.getItem('octoroom_workspace_property_order');
    if (!savedOrder) return properties;

    try {
      const orderIds = JSON.parse(savedOrder) as string[];
      return [...properties].sort((a, b) => {
        const indexA = orderIds.indexOf(a.id);
        const indexB = orderIds.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    } catch {
      return properties;
    }
  };

  const getPropertyActivityCacheKey = (propertyId: string) => `property:${propertyId}`;

  const getActivityCacheKey = (buyer: Buyer, propertyId: string = selectedPropertyId) => {
    return buyer.roleDescription === 'Seller'
      ? getPropertyActivityCacheKey(propertyId)
      : `buyer:${propertyId}:${buyer.id}`;
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
    budget_amount: '',
    type: 'BUYER',
    solicitor_id: ''
  });

  const activeProperty = managedProperties.find(p => p.id === selectedPropertyId) || managedProperties[0];
  const getBuyerContextPropertyId = (buyerId: string) => {
    const activeBuyerPropertyId = buyerActivePropertyIds[buyerId];
    if (activeBuyerPropertyId) return activeBuyerPropertyId;

    const linkedPropertyIds = buyerPropertyAssignments[buyerId];
    if (linkedPropertyIds && linkedPropertyIds.length > 0) {
      return linkedPropertyIds[linkedPropertyIds.length - 1];
    }

    if (managedProperties.length === 1) {
      return managedProperties[0]?.id || '';
    }

    return '';
  };

  const getBuyerLinkedProperties = (buyerId: string) => {
    const linkedIds = buyerPropertyAssignments[buyerId] || [];
    return linkedIds
      .map((propertyId) => managedProperties.find((property) => property.id === propertyId))
      .filter((property): property is ManagedProperty => Boolean(property));
  };

  const buildSellerActivityTarget = (property: ManagedProperty): Buyer => ({
    id: property.sellerId || property.id,
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

  const assignPropertyToBuyer = (buyerId: string, propertyId: string) => {
    setBuyerPropertyAssignments((prev) => {
      const existingIds = prev[buyerId] || [];
      if (existingIds.includes(propertyId)) return prev;
      return { ...prev, [buyerId]: [...existingIds, propertyId] };
    });
    setBuyerActivePropertyIds((prev) => ({ ...prev, [buyerId]: propertyId }));
  };

  const removePropertyFromBuyer = (buyerId: string, propertyId: string) => {
    const remainingIds = (buyerPropertyAssignments[buyerId] || []).filter((id) => id !== propertyId);

    setBuyerPropertyAssignments((prev) => {
      const existingIds = prev[buyerId] || [];
      const nextIds = existingIds.filter((id) => id !== propertyId);
      if (nextIds.length === existingIds.length) return prev;
      if (nextIds.length === 0) {
        const { [buyerId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [buyerId]: nextIds };
    });

    setBuyerActivePropertyIds((prev) => {
      if (prev[buyerId] !== propertyId) return prev;
      if (remainingIds.length === 0) {
        const { [buyerId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [buyerId]: remainingIds[remainingIds.length - 1] };
    });
  };

  const togglePropertyExpansion = (propertyId: string) => {
    const propertyCacheKey = getPropertyActivityCacheKey(propertyId);
    if (propertyId !== selectedPropertyId) {
      if (activityCache[propertyCacheKey]) {
        setActivities(activityCache[propertyCacheKey]);
        setLoadingActivities(false);
      } else {
        setActivities([]);
        setLoadingActivities(true);
      }
    }
    setSelectedPropertyId(propertyId);
    setExpandedBuyerId(null);
    setExpandedPropertyId((prev) => prev === propertyId ? null : propertyId);
    setOpenPropertyMenuId(null);
  };
  const loadWorkspacePropertyIds = async (agentId: string) => {
    try {
      const res = await fetch(`/api/workspace/properties?agentId=${agentId}`);
      const data = await res.json();
      setWorkspacePropertyIds(Array.isArray(data.propertyIds) ? data.propertyIds : []);
      return Array.isArray(data.propertyIds) ? data.propertyIds : [];
    } catch (error) {
      console.error('Failed to load workspace property ids:', error);
      setWorkspacePropertyIds([]);
      return [];
    }
  };

  const toggleWorkspaceProperty = async (propertyId: string, visible: boolean) => {
    if (!currentAgentId) return;

    try {
      const res = await fetch('/api/workspace/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: currentAgentId,
          propertyId,
          visible,
          source: 'manual'
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Workspace update failed');
      }

      setWorkspacePropertyIds(prev => visible ? [...new Set([...prev, propertyId])] : prev.filter(id => id !== propertyId));

      if (!visible && selectedPropertyId === propertyId) {
        const remaining = managedProperties.filter(p => p.id !== propertyId);
        setSelectedPropertyId(remaining[0]?.id || '');
        setExpandedPropertyId(remaining[0]?.id || null);
      } else if (!visible && expandedPropertyId === propertyId) {
        const remaining = managedProperties.filter(p => p.id !== propertyId);
        setExpandedPropertyId(remaining[0]?.id || null);
      }

      if (currentAgentId) {
        await fetchManagedPropertiesForAgent(currentAgentId);
      }
    } catch (error: any) {
      alert(`更新 Workspace 失败: ${error.message}`);
    }
  };

  const fetchManagedPropertiesForAgent = async (agentId: string) => {
    const linkedPropertyIds = await loadWorkspacePropertyIds(agentId);
    const idsToLoad = [...new Set(linkedPropertyIds)];

    if (idsToLoad.length === 0) {
      setManagedProperties([]);
      return;
    }

    const { data: props, error } = await supabase
      .from('octo_properties')
      .select('*')
      .in('id', idsToLoad);

    if (error) {
      console.error("Fetch workspace properties failed:", error);
      return;
    }

    const { data: sellers } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('agent_id', agentId)
      .eq('type', 'SELLER');

    const sellerEmails = sellers?.map((s: any) => s.email).filter(Boolean) || [];

    let profiles: any[] = [];
    if (sellerEmails.length > 0) {
      const orFilter = sellerEmails.map((email: string) => `email.ilike.${email}`).join(',');
      const { data: emailMatches } = await supabase
        .from('profiles')
        .select('id, email, username')
        .or(orFilter);

      profiles = [...(emailMatches || [])];
    }

    const mapped: ManagedProperty[] = (props || []).map((p: any) => {
      const propAddr = (p.address_name || p.title || '').trim().toLowerCase();
      const seller = sellers?.find((s: any) => {
        const sellerAddr = (s.address || '').trim().toLowerCase();
        return sellerAddr === propAddr && propAddr !== '';
      });

      let profile = profiles.find((pr: any) =>
        pr.email?.toLowerCase() === seller?.email?.toLowerCase() && seller?.email
      );

      if (!profile && seller) {
        profile = profiles.find((pr: any) =>
          pr.username?.toLowerCase().includes(seller.name.toLowerCase()) ||
          seller.name.toLowerCase().includes(pr.username?.toLowerCase() || '')
        );
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

    const orderedMapped = sortPropertiesBySavedOrder(mapped);
    setManagedProperties(orderedMapped);
    if (orderedMapped.length > 0 && (!selectedPropertyId || !orderedMapped.find(p => p.id === selectedPropertyId))) {
      setSelectedPropertyId(orderedMapped[0].id);
    }
    if (orderedMapped.length > 0 && !expandedPropertyId && !selectedPropertyId) {
      setExpandedPropertyId(orderedMapped[0].id);
    }
  };

  const formatOfferPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined || Number.isNaN(Number(price))) {
      return 'No Offer Yet';
    }
    return `$${Number(price).toLocaleString()}`;
  };

  const formatBudgetAmount = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return `$${value.toLocaleString()}`;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const numericValue = Number(trimmed.replace(/[^0-9.]/g, ''));
    if (!Number.isNaN(numericValue) && numericValue > 0) {
      return `$${numericValue.toLocaleString()}`;
    }

    return trimmed;
  };

  const getBuyerBudgetLabel = (contact: CRMContactRow) => {
    return formatBudgetAmount(
      contact.budget_amount ??
      contact.max_budget ??
      contact.buying_budget ??
      contact.budget ??
      contact.price_range
    );
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

    const mappedBuyers: Buyer[] = contacts.map((contact: CRMContactRow) => {
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
      const buyerBudgetLabel = getBuyerBudgetLabel(contact);

      return {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone || '',
        infoBadge: latestOffer ? formatOfferPrice(latestOffer.offer_price) : (buyerBudgetLabel || latestContactStatus),
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
  const pipeline = [...cloudBuyers];
  const activeTimelinePropertyId = expandedBuyerId ? getBuyerContextPropertyId(expandedBuyerId) : selectedPropertyId;

  useEffect(() => {
    if (!currentAgentId) return;

    try {
      const savedAssignments = localStorage.getItem(`octoroom_buyer_property_assignments_${currentAgentId}`);
      const savedActivePropertyIds = localStorage.getItem(`octoroom_buyer_active_property_ids_${currentAgentId}`);

      setBuyerPropertyAssignments(savedAssignments ? JSON.parse(savedAssignments) : {});
      setBuyerActivePropertyIds(savedActivePropertyIds ? JSON.parse(savedActivePropertyIds) : {});
    } catch (error) {
      console.warn('Failed to restore buyer property links:', error);
      setBuyerPropertyAssignments({});
      setBuyerActivePropertyIds({});
    }
  }, [currentAgentId]);

  useEffect(() => {
    if (!currentAgentId) return;
    localStorage.setItem(`octoroom_buyer_property_assignments_${currentAgentId}`, JSON.stringify(buyerPropertyAssignments));
  }, [currentAgentId, buyerPropertyAssignments]);

  useEffect(() => {
    if (!currentAgentId) return;
    localStorage.setItem(`octoroom_buyer_active_property_ids_${currentAgentId}`, JSON.stringify(buyerActivePropertyIds));
  }, [currentAgentId, buyerActivePropertyIds]);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsAuthorizing(false);
        return;
      }
      setCurrentAgentId(session.user.id);
      loadCloudBuyers(session.user.id, selectedPropertyId);
      fetchManagedPropertiesForAgent(session.user.id);
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
      const buyerPropertyId = getBuyerContextPropertyId(expandedBuyerId);
      if (selectedBuyer && buyerPropertyId) {
        fetchRealActivities(selectedBuyer, false, buyerPropertyId);
      } else {
        setActivities([]);
        setLoadingActivities(false);
      }
    } else {
      // 🏘️ Fetch Property-Level activities (Seller context)
      setActivities([]);
      setLoadingActivities(true);
      if (activeProperty) {
        fetchRealActivities(buildSellerActivityTarget(activeProperty), false, activeProperty.id);
      } else {
        setLoadingActivities(false);
      }
    }
  }, [expandedBuyerId, selectedPropertyId, currentAgentId, activeProperty, buyerActivePropertyIds, buyerPropertyAssignments]);

  // --- 🛰️ Real-time Subscriptions for Activities & Status ---
  useEffect(() => {
    if (!currentAgentId) return;
    if (expandedBuyerId && !activeTimelinePropertyId) return;

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
        filter: `reference_id=eq.${activeTimelinePropertyId}`
      }, () => {
        console.log('[REALTIME] New Notification - Refreshing Activities');
        // Clear appropriate cache and refresh
        if (expandedBuyerId) {
          const buyer = pipeline.find(b => b.id === expandedBuyerId);
          if (buyer) {
            setActivityCache(prev => {
              const nc = { ...prev };
              delete nc[getActivityCacheKey(buyer)];
              return nc;
            });
            fetchRealActivities(buyer, true);
          }
         } else if (activeProperty) {
            setActivityCache(prev => {
              const nc = { ...prev };
              delete nc[getPropertyActivityCacheKey(activeProperty.id)];
              return nc;
            });
            fetchRealActivities(buildSellerActivityTarget(activeProperty), true, activeProperty.id);
         }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'crm_notes',
        filter: `property_id=eq.${activeTimelinePropertyId}`
      }, () => {
        console.log('[REALTIME] New CRM Note - Refreshing Activities');
        if (expandedBuyerId) {
          const buyer = pipeline.find(b => b.id === expandedBuyerId);
          if (buyer) {
            setActivityCache(prev => {
              const nc = { ...prev };
              delete nc[getActivityCacheKey(buyer)];
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
  }, [currentAgentId, selectedPropertyId, expandedBuyerId, activeProperty, activeTimelinePropertyId, buyerActivePropertyIds, buyerPropertyAssignments]);

  const fetchActivityFeedData = async (buyer: Buyer, propertyId: string) => {
    // 🔪 绝招 1：在 URL 后面加上当前时间戳，确保每次请求的 URL 都是全新的
    const timestampBuster = `&_t=${Date.now()}`;
    
    const query = buyer.roleDescription === 'Seller'
      ? `/api/workspace/activities?propertyId=${propertyId}&viewerId=${currentAgentId || ''}${timestampBuster}`
      : `/api/workspace/activities?propertyId=${propertyId}&buyerEmail=${buyer.email}&buyerId=${buyer.id}&viewerId=${currentAgentId || ''}${timestampBuster}`;
    
    // 🔪 绝招 2：强制 fetch 禁用所有本地和服务器缓存
    const res = await fetch(query, { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    const data = await res.json();

    if (!data.activities || !Array.isArray(data.activities)) {
      return [] as ActivityLog[];
    }

    return data.activities.map((n: any) => {
      // 🛡️ 安全解析 metadata
      let safeMetadata = n.metadata;
      if (typeof safeMetadata === 'string') {
        try { safeMetadata = JSON.parse(safeMetadata); } catch (e) { safeMetadata = {}; }
      }

      return {
        id: n.id,
        type: (n.type === 'offer' || n.type.startsWith('offer_')) ? 'OFFER' : 'NOTE',
        content: n.content || mapNotifToText(n.type),
        timestamp: new Date(n.created_at.endsWith('Z') || n.created_at.includes('+') ? n.created_at : n.created_at + 'Z').toLocaleString(),
        agentName: n.source === 'crm_note' ? 'Agent Follow-up' : (n.buyer_name || 'System Update'),
        avatarUrl: n.avatar_url,
        buyerName: n.buyer_name,
        amountLabel: n.amount_label,
        metadata: safeMetadata // 真正把数据库里的 JSON 传给按钮！
      };
    }) as ActivityLog[];
  };

  const fetchRealActivities = async (buyer: Buyer, forceRefresh: boolean = false, propertyIdOverride?: string) => {
    const resolvedPropertyId = propertyIdOverride || selectedPropertyId;
    const cacheKey = getActivityCacheKey(buyer, resolvedPropertyId);
    if (!forceRefresh && activityCache[cacheKey]) {
      setActivities(activityCache[cacheKey]);
      setLoadingActivities(false);
      return;
    }

    setLoadingActivities(true);
    try {
      const mapped = await fetchActivityFeedData(buyer, resolvedPropertyId);
      setActivities(mapped);
      setActivityCache(prev => ({ ...prev, [cacheKey]: mapped }));
    } catch (err) {
      console.error("Fetch activities failed:", err);
      setActivities([]);
    }
    setLoadingActivities(false);
  };

  useEffect(() => {
    if (!currentAgentId || managedProperties.length === 0) return;

    const missingProperties = managedProperties.filter((property) => !activityCache[getPropertyActivityCacheKey(property.id)]);
    if (missingProperties.length === 0) return;

    let cancelled = false;

    const preloadPropertyActivities = async () => {
      const cacheEntries = await Promise.all(
        missingProperties.map(async (property) => {
          try {
            const mapped = await fetchActivityFeedData(buildSellerActivityTarget(property), property.id);
            return [getPropertyActivityCacheKey(property.id), mapped] as [string, ActivityLog[]];
          } catch (error) {
            console.error('Preload property timeline failed:', error);
            return [getPropertyActivityCacheKey(property.id), [] as ActivityLog[]] as [string, ActivityLog[]];
          }
        })
      );

      if (cancelled) return;

      setActivityCache((prev) => {
        const nextCache = { ...prev };
        cacheEntries.forEach(([cacheKey, mapped]) => {
          nextCache[cacheKey] = mapped;
        });
        return nextCache;
      });
    };

    preloadPropertyActivities();

    return () => {
      cancelled = true;
    };
  }, [currentAgentId, managedProperties, activityCache]);

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

  const moveProperty = (index: number, direction: 'UP' | 'DOWN') => {
    const newProperties = [...managedProperties];
    if (direction === 'UP' && index > 0) {
      [newProperties[index], newProperties[index - 1]] = [newProperties[index - 1], newProperties[index]];
    } else if (direction === 'DOWN' && index < newProperties.length - 1) {
      [newProperties[index], newProperties[index + 1]] = [newProperties[index + 1], newProperties[index]];
    }
    setManagedProperties(newProperties);
    persistPropertyOrder(newProperties);
  };

  const handlePropertyDragStart = (index: number) => {
    setDraggedPropertyIndex(index);
    setDraggedPropertyId(managedProperties[index]?.id || null);
  };

  const handlePropertyDrop = (index: number) => {
    if (draggedPropertyIndex === null || draggedPropertyIndex === index) return;

    const newProperties = [...managedProperties];
    const item = newProperties.splice(draggedPropertyIndex, 1)[0];
    newProperties.splice(index, 0, item);

    setManagedProperties(newProperties);
    persistPropertyOrder(newProperties);
    setDraggedPropertyIndex(null);
    setDraggedPropertyId(null);
  };

  const handleBuyerPropertyDrop = (buyerId: string) => {
    if (!draggedPropertyId) return;
    assignPropertyToBuyer(buyerId, draggedPropertyId);
    setDraggedPropertyIndex(null);
    setDraggedPropertyId(null);
  };

  const handleSaveFollowUp = async (summary: string, transcript: string, recommendedStatus?: string) => {
    if (!activeFollowUpBuyer) return;
    const isSeller = activeFollowUpBuyer.roleDescription === 'Seller';
    const followUpPropertyId = isSeller ? selectedPropertyId : getBuyerContextPropertyId(activeFollowUpBuyer.id);
    if (!followUpPropertyId) {
      alert('Please link a property to this buyer before saving follow-up notes.');
      return;
    }
    
    try {
      // 1. Post to activities API (handles notes/summaries)
      const res = await fetch('/api/workspace/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: followUpPropertyId,
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
          delete newCache[getActivityCacheKey(activeFollowUpBuyer)];
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
        fetchRealActivities(activeFollowUpBuyer, true, followUpPropertyId);
        
        // 5. Refresh cloud contacts to update the status badge on the dashboard
        if (currentAgentId && !isSeller) {
          await loadCloudBuyers(currentAgentId, followUpPropertyId);
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

  const navigateToDraft = (propertyId: string, buyerId: string, email: string, name: string) => {
    const params = new URLSearchParams({
      property_id: propertyId,
      buyer: buyerId,
      buyer_email: email,
      buyer_name: name,
      agent_id: currentAgentId || ''
    });
    router.push(`/contract/${propertyId}/prepare?${params.toString()}`);
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
        budget_amount: formData.type === 'BUYER' && formData.budget_amount ? Number(formData.budget_amount) : null,
        type: formData.type,
        solicitor_id: formData.solicitor_id || null,
        status: 'PENDING'
      });

    if (error) {
      console.error('Persistence error:', error);
      alert('同步失败，请确保您已经在 Supabase 中创建了 crm_contacts 表。');
    } else {
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', address: '', budget_amount: '', type: 'BUYER', solicitor_id: '' });
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
        <PropertyList
          managedProperties={managedProperties}
          selectedPropertyId={selectedPropertyId}
          expandedPropertyId={expandedPropertyId}
          activeView={activeView as WorkspaceView}
          openPropertyMenuId={openPropertyMenuId}
          setOpenPropertyMenuId={setOpenPropertyMenuId}
          togglePropertyExpansion={togglePropertyExpansion}
          handlePropertyDragStart={handlePropertyDragStart}
          handlePropertyDrop={handlePropertyDrop}
          setDraggedPropertyIndex={setDraggedPropertyIndex}
          setDraggedPropertyId={setDraggedPropertyId}
          moveProperty={moveProperty}
          toggleWorkspaceProperty={toggleWorkspaceProperty}
          setActiveFollowUpBuyer={setActiveFollowUpBuyer}
          setIsFollowUpModalOpen={setIsFollowUpModalOpen}
          router={router}
          renderPropertyTimeline={(property) => (
            <PropertyTimeline
              property={property}
              selectedPropertyId={selectedPropertyId}
              activities={activities}
              activityCache={activityCache}
              loadingActivities={loadingActivities}
              getPropertyActivityCacheKey={getPropertyActivityCacheKey}
              router={router}
            />
          )}
        />

        

        {/* --- Buyers Pipeline Section --- */}
        {activeView === 'pipeline' && (
          <PipelineBoard
            orderedPipeline={orderedPipeline}
            expandedBuyerId={expandedBuyerId}
            setExpandedBuyerId={setExpandedBuyerId}
            getBuyerLinkedProperties={getBuyerLinkedProperties}
            getBuyerContextPropertyId={getBuyerContextPropertyId}
            managedProperties={managedProperties}
            draggedIndex={draggedIndex}
            handleDragStart={handleDragStart}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            setDraggedIndex={setDraggedIndex}
            moveBuyer={moveBuyer}
            draggedPropertyId={draggedPropertyId}
            handleBuyerPropertyDrop={handleBuyerPropertyDrop}
            setBuyerActivePropertyIds={setBuyerActivePropertyIds}
            navigateToDraft={navigateToDraft}
            removePropertyFromBuyer={removePropertyFromBuyer}
            setActiveFollowUpBuyer={setActiveFollowUpBuyer}
            setIsFollowUpModalOpen={setIsFollowUpModalOpen}
            loadingActivities={loadingActivities}
            activities={activities}
          />
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
      <AddBuyerModal
        isOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        handleAddCustomerSubmit={handleAddCustomerSubmit}
        formData={formData}
        setFormData={setFormData}
        lawyers={lawyers}
        formLoading={formLoading}
      />

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
