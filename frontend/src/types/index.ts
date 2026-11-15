export interface TicketTier {
  id: string;
  name: string;
  description: string;
  price: number;
  totalQuota: number;
  availableQuota: number;
  status: "AVAILABLE" | "LIMITED" | "SOLD_OUT";
  perks: string[];
}

export interface ConcertEvent {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  venue: string;
  date: string;
  gatesOpen: string;
  description: string;
  bannerUrl: string;
  ticketTiers: TicketTier[];
}

export interface BookingRequest {
  ticketTierId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
  paymentMethod: "qris" | "va";
}

export interface BookingResult {
  bookingId: string;
  bookingCode: string;
  tierName?: string;
  customerName?: string;
  customerEmail?: string;
  quantity?: number;
  totalPrice?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  qrPayload?: string;
  createdAt?: string;
  status?: string;
  messageId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface AdminTierInventory {
  id: string;
  name: string;
  price: number;
  totalQuota: number;
  availableQuota: number;
  soldQuota: number;
  occupancyRate: number;
  status: string;
}

export interface AdminRecentBooking {
  id: string;
  bookingCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tierName: string;
  quantity: number;
  totalPrice: number;
  formattedPrice: string;
  paymentMethod: string;
  paymentStatus: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED";
  createdAt: string;
}

export interface AdminOperatorUser {
  username?: string;
  userId?: string;
  signInDetails?: {
    loginId?: string;
  };
}

export interface AdminStatsData {
  promoterSummary: {
    eventTitle: string;
    venue: string;
    totalRevenue: number;
    formattedRevenue: string;
    totalTicketsSold: number;
    totalCapacity: number;
    totalAvailableQuota: number;
    overallOccupancyPercentage: number;
  };
  bookingCounts: {
    total: number;
    paid: number;
    pending: number;
  };
  tierInventory: AdminTierInventory[];
  recentBookings: AdminRecentBooking[];
  eventDrivenArchitecture: {
    sqsQueue: { name: string; status: string; policy: string };
    eventBridge: { bus: string; rule: string; status: string };
    stepFunctions: { stateMachine: string; tasks: string[]; status: string };
    sns: { topic: string; protocol: string; status: string };
  };
  serverTimestamp: string;
}

export interface PaymentSimulationResult {
  bookingId: string;
  bookingCode: string;
  paymentStatus: string;
  customerName: string;
  customerEmail: string;
  totalPrice: number;
  eventBridgeEventId: string;
  emittedAt: string;
}
