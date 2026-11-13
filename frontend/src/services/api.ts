import {
  ApiResponse,
  BookingRequest,
  BookingResult,
  ConcertEvent,
  TicketTier,
  AdminStatsData,
  PaymentSimulationResult,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/dev";

export const apiService = {
  /**
   * Fetch concert event details from API Gateway
   * Returns null if no data is found.
   */
  async getEvent(slug = "sheila-on-7-kisah-klasik-2026"): Promise<ConcertEvent | null> {
    const response = await fetch(`${API_BASE_URL}/events?slug=${encodeURIComponent(slug)}`);
    if (!response.ok) {
      throw new Error(`Gagal memuat event dari server (${response.status}: ${response.statusText})`);
    }
    const json: ApiResponse<ConcertEvent> = await response.json();
    if (!json.success || !json.data) {
      return null;
    }
    return json.data;
  },

  /**
   * Fetch live ticket tiers and remaining quotas from API Gateway
   * Returns empty array if no data is found.
   */
  async getTicketTiers(eventId?: string): Promise<TicketTier[]> {
    const endpoint = eventId
      ? `${API_BASE_URL}/tickets/tiers?eventId=${encodeURIComponent(eventId)}`
      : `${API_BASE_URL}/tickets/tiers`;

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Gagal memuat kategori tiket dari server (${response.status}: ${response.statusText})`);
    }
    const json: ApiResponse<TicketTier[]> = await response.json();
    if (!json.success || !json.data || !Array.isArray(json.data)) {
      return [];
    }
    return json.data;
  },

  /**
   * Submit ticket booking (Enqueues to SQS or executes transaction)
   */
  async bookTicket(payload: BookingRequest): Promise<BookingResult> {
    const response = await fetch(`${API_BASE_URL}/tickets/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json: ApiResponse<BookingResult> = await response.json();

    if (!response.ok || !json.success) {
      throw new Error(json.error || "Gagal memproses pemesanan tiket.");
    }

    if (!json.data) {
      throw new Error("Respon server tidak valid atau kosong.");
    }

    return json.data;
  },

  /**
   * Verify booking status from API Gateway
   */
  async getBookingStatus(code: string): Promise<BookingResult | null> {
    const response = await fetch(`${API_BASE_URL}/bookings/status?code=${encodeURIComponent(code)}`);
    if (!response.ok) {
      throw new Error(`Gagal memeriksa kode booking (${response.status})`);
    }
    const json: ApiResponse<BookingResult> = await response.json();
    if (!json.success || !json.data) {
      return null;
    }
    return json.data;
  },

  /**
   * Fetch real-time Admin Metrics and Promoter Dashboard data
   */
  async getAdminStats(authToken?: string): Promise<AdminStatsData> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Gagal mengambil statistik admin (${response.status}: ${response.statusText})`);
    }

    const json: ApiResponse<AdminStatsData> = await response.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || "Data statistik admin kosong atau tidak valid.");
    }

    return json.data;
  },

  /**
   * Simulate payment confirmation and trigger EventBridge OrderPaid event
   */
  async simulatePayment(bookingIdentifier: string): Promise<PaymentSimulationResult> {
    const response = await fetch(`${API_BASE_URL}/tickets/simulate-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookingId: bookingIdentifier }),
    });

    const json: ApiResponse<PaymentSimulationResult> = await response.json();

    if (!response.ok || !json.success) {
      throw new Error(json.error || "Gagal melakukan simulasi pembayaran.");
    }

    if (!json.data) {
      throw new Error("Respon simulasi pembayaran tidak valid.");
    }

    return json.data;
  },
};
