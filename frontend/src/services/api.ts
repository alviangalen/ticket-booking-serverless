import { fetchAuthSession } from "aws-amplify/auth";
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
   * Fetch real-time Admin Metrics and Promoter Dashboard data.
   * Dynamically injects Cognito ID Token via Amplify v6 fetchAuthSession.
   */
  async getAdminStats(authToken?: string): Promise<AdminStatsData | null> {
    let token = authToken;
    if (!token) {
      const session = await fetchAuthSession();
      token = session.tokens?.idToken?.toString();
    }

    if (!token) {
      throw new Error("Token sesi Cognito tidak ditemukan. Silakan login kembali.");
    }

    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      let errorDetail = `${response.status}: ${response.statusText}`;
      try {
        const errorBody = (await response.json()) as { error?: string; message?: string };
        errorDetail = errorBody.error || errorBody.message || errorDetail;
      } catch {
        // Ignore parse failure if response body is not JSON
      }
      throw new Error(`Gagal mengambil statistik admin (${errorDetail})`);
    }

    const json: ApiResponse<AdminStatsData> = await response.json();
    if (!json.success) {
      throw new Error(json.error || "Gagal mengambil statistik admin dari server.");
    }

    return json.data ?? null;
  },

  /**
   * Simulate payment confirmation and trigger EventBridge OrderPaid event
   */
  async simulatePayment(
    bookingIdentifier: string,
    authToken?: string
  ): Promise<PaymentSimulationResult> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/tickets/simulate-payment`, {
      method: "POST",
      headers,
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
