export type ProviderStatus = string;

export interface Condition {
  id: string;
  name: string;
  dueDate: string;
  status: 'PENDING' | 'WAITING' | 'MET' | 'FAILED';
}

export interface ActivityLog {
  id: string;
  type: 'CALL' | 'VIEWING' | 'EMAIL' | 'OFFER' | 'NOTE';
  content: string;
  timestamp: string;
  agentName: string;
  avatarUrl?: string;
  buyerName?: string;
  amountLabel?: string;
  metadata?: any;
}

export interface Buyer {
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

export interface ManagedProperty {
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

export interface Lawyer {
  id: string;
  full_name: string;
  username: string;
}

export interface OfferRow {
  id: string;
  buyer_id: string;
  status: string;
  offer_price: number | null;
  created_at: string;
}

export interface FollowUpNoteRow {
  buyer_id: string;
  created_at: string;
  metadata?: {
    recommendedStatus?: string;
  } | null;
}

export interface CRMContactRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  status?: string | null;
  budget?: string | number | null;
  budget_amount?: string | number | null;
  max_budget?: string | number | null;
  buying_budget?: string | number | null;
  price_range?: string | number | null;
}

export type WorkspaceView = 'summary' | 'pipeline';
