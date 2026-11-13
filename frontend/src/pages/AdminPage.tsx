import React, { useState, useEffect, useCallback } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import {
  ShieldAlert,
  Radio,
  Zap,
  TrendingUp,
  Ticket,
  Users,
  RefreshCw,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Server,
  Cpu,
  Layers,
  Send,
  AlertTriangle,
} from "lucide-react";
import { apiService } from "../services/api";
import { AdminStatsData, AdminRecentBooking } from "../types";

export const AdminPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f4ece1] text-[#1c1c18] font-body">
      <Authenticator hideSignUp={true}>
        {({ signOut, user }) => (
          <AdminDashboard user={user} onSignOut={signOut} />
        )}
      </Authenticator>
    </div>
  );
};

interface AdminDashboardProps {
  user?: any;
  onSignOut?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onSignOut }) => {
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [simulationAlert, setSimulationAlert] = useState<{
    code: string;
    eventId: string;
    timestamp: string;
  } | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getAdminStats();
      setStats(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat statistik promotor.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSimulatePayment = async (booking: AdminRecentBooking) => {
    setSimulatingId(booking.id);
    setSimulationAlert(null);
    try {
      const result = await apiService.simulatePayment(booking.id);
      setSimulationAlert({
        code: result.bookingCode,
        eventId: result.eventBridgeEventId,
        timestamp: result.emittedAt,
      });
      // Refresh real-time dashboard data
      await fetchStats();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal memproses simulasi pembayaran.");
    } finally {
      setSimulatingId(null);
    }
  };

  const operatorEmail =
    user?.signInDetails?.loginId ||
    user?.username ||
    user?.attributes?.email ||
    "promoter-ops@sheilaon7.id";

  return (
    <div className="min-h-screen pb-20">
      {/* =========================================================================
          TOP ANALOG CONSOLE HEADER
          ========================================================================= */}
      <header className="bg-[#760009] text-white border-b-4 border-black px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Lanyard Tag Badge */}
            <div className="bg-[#e67e22] text-black font-mono font-black text-xs px-2.5 py-1 border-2 border-black shadow-[2px_2px_0px_#000] uppercase tracking-widest">
              VIP BACKSTAGE
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#22c55e] border border-black animate-pulse" />
                <h1 className="text-xl md:text-2xl font-headline font-black uppercase tracking-tight text-[#faf6f0]">
                  CONSOLE OPERATOR // SO7 PROMOTER TERMINAL
                </h1>
              </div>
              <p className="text-xs font-mono text-[#ffaaa1] tracking-wider uppercase mt-0.5">
                Kisah Klasik Festival 2026 • Event-Driven Control Plane
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#fdf9f3] text-black font-mono font-bold text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Ke Beranda
            </a>

            <button
              onClick={fetchStats}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0e7490] text-white font-mono font-bold text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Sync Data
            </button>

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1c18] text-white font-mono font-bold text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Console Workspace */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-8">
        {/* Operator Identity Ribbon */}
        <div className="bg-[#fff8f6] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#e67e22] text-black border-2 border-black flex items-center justify-center font-headline font-black text-lg shadow-[2px_2px_0px_#000]">
              OP
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase text-gray-600">
                Logged In Operator (Cognito Session)
              </div>
              <div className="font-mono font-bold text-sm text-[#760009]">{operatorEmail}</div>
            </div>
          </div>
          <div className="text-xs font-mono bg-black text-[#22c55e] px-3 py-1.5 border-2 border-black font-bold uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 animate-pulse text-[#22c55e]" />
            SERVERLESS CLUSTER: AP-SOUTHEAST-1 [PROD/DEV]
          </div>
        </div>

        {/* Simulation Success Toast Banner */}
        {simulationAlert && (
          <div className="bg-[#ecfdf5] border-4 border-black shadow-[6px_6px_0px_0px_#15803d] p-5 relative">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#22c55e] text-black border-2 border-black shadow-[2px_2px_0px_#000]">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              <div className="space-y-1">
                <div className="font-headline font-black text-lg text-[#15803d] uppercase tracking-wide">
                  EVENTBRIDGE EVENT DISPATCHED // ORDER PAID
                </div>
                <p className="font-mono text-xs sm:text-sm text-gray-800">
                  Status pemesanan <strong className="bg-yellow-200 px-1 border border-black">{simulationAlert.code}</strong> berhasil diubah ke <strong>LUNAS (PAID)</strong>.
                </p>
                <div className="font-mono text-xs text-gray-700 bg-white/80 p-2 border border-black mt-2 inline-block">
                  <strong>EventBridge EventId:</strong> {simulationAlert.eventId} | <strong>Workflow:</strong> Step Functions Orchestration (PDF &amp; SNS Notification Triggered)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="bg-[#fef2f2] border-4 border-black shadow-[6px_6px_0px_0px_#991b1b] p-5">
            <div className="flex items-center gap-3 text-[#991b1b]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div className="font-mono font-bold text-sm">{error}</div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 1: EVENT-DRIVEN ARCHITECTURE RACK MONITOR
            ========================================================================= */}
        <section className="bg-[#1c1c18] text-[#faf6f0] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
          <div className="border-b-2 border-dashed border-[#59413e] pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-[#e67e22]" />
              <h2 className="font-headline font-black text-lg uppercase tracking-wider text-[#faf6f0]">
                EVENT-DRIVEN ARCHITECTURE // SYSTEM CHANNELS
              </h2>
            </div>
            <span className="font-mono text-xs text-[#8fdfff] uppercase tracking-widest">
              PROTOCOL: ASYNC EVENT STREAM
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Channel 1: SQS Queue */}
            <div className="bg-[#261c1a] border-2 border-[#59413e] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>CHANNEL 01</span>
                  <span className="text-[#22c55e] font-bold">ONLINE</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Layers className="w-4 h-4 text-[#e67e22]" />
                  <div className="font-headline font-bold text-sm uppercase text-white">AMAZON SQS</div>
                </div>
                <div className="font-mono text-xs text-[#ffaaa1] mt-1 font-bold">BookingQueue</div>
                <p className="font-mono text-[11px] text-gray-400 mt-2 leading-tight">
                  High-throughput concurrency buffer with OCC locking worker.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-[#59413e] text-[10px] font-mono text-gray-500">
                BATCH SIZE: 1 // AUTO-RETRY
              </div>
            </div>

            {/* Channel 2: EventBridge Bus */}
            <div className="bg-[#261c1a] border-2 border-[#59413e] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>CHANNEL 02</span>
                  <span className="text-[#22c55e] font-bold">ACTIVE</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Radio className="w-4 h-4 text-[#8fdfff]" />
                  <div className="font-headline font-bold text-sm uppercase text-white">EVENTBRIDGE</div>
                </div>
                <div className="font-mono text-xs text-[#8fdfff] mt-1 font-bold">ticket.booking/OrderPaid</div>
                <p className="font-mono text-[11px] text-gray-400 mt-2 leading-tight">
                  Serverless event bus routing OrderPaid domain events.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-[#59413e] text-[10px] font-mono text-gray-500">
                BUS: DEFAULT // RETRY 24H
              </div>
            </div>

            {/* Channel 3: Step Functions */}
            <div className="bg-[#261c1a] border-2 border-[#59413e] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>CHANNEL 03</span>
                  <span className="text-[#22c55e] font-bold">ARMED</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Cpu className="w-4 h-4 text-[#fbbf24]" />
                  <div className="font-headline font-bold text-sm uppercase text-white">STEP FUNCTIONS</div>
                </div>
                <div className="font-mono text-xs text-[#fbbf24] mt-1 font-bold">OrderProcessingStateMachine</div>
                <p className="font-mono text-[11px] text-gray-400 mt-2 leading-tight">
                  Sequential orchestration: [generateTicketPdf] → [broadcastNotification].
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-[#59413e] text-[10px] font-mono text-gray-500">
                2 SEQUENTIAL TASKS
              </div>
            </div>

            {/* Channel 4: Amazon SNS */}
            <div className="bg-[#261c1a] border-2 border-[#59413e] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span>CHANNEL 04</span>
                  <span className="text-[#22c55e] font-bold">READY</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Send className="w-4 h-4 text-[#a78bfa]" />
                  <div className="font-headline font-bold text-sm uppercase text-white">AMAZON SNS</div>
                </div>
                <div className="font-mono text-xs text-[#a78bfa] mt-1 font-bold">TicketNotificationTopic</div>
                <p className="font-mono text-[11px] text-gray-400 mt-2 leading-tight">
                  Multi-protocol fanout broadcasting e-ticket credentials to attendees.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-[#59413e] text-[10px] font-mono text-gray-500">
                EMAIL &amp; SMS READY
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: PRIMARY FINANCIAL & INVENTORY GAUGES
            ========================================================================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Gauge 1: Gross Revenue */}
          <div className="bg-[#fff8f6] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 relative overflow-hidden">
            <div className="absolute top-2 right-2 font-mono text-[10px] text-gray-400 border border-black px-1.5 bg-white uppercase">
              METRIC #01
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-gray-600">
              <TrendingUp className="w-4 h-4 text-[#760009]" />
              TOTAL PENDAPATAN (PAID)
            </div>
            <div className="mt-3 font-mono font-black text-2xl sm:text-3xl text-[#760009] tracking-tight">
              {stats?.promoterSummary.formattedRevenue || "Rp 0"}
            </div>
            <div className="mt-2 text-xs font-mono text-gray-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              Dari {stats?.bookingCounts.paid || 0} transaksi lunas terverifikasi
            </div>
          </div>

          {/* Gauge 2: Tickets Sold */}
          <div className="bg-[#fff8f6] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 relative overflow-hidden">
            <div className="absolute top-2 right-2 font-mono text-[10px] text-gray-400 border border-black px-1.5 bg-white uppercase">
              METRIC #02
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-gray-600">
              <Ticket className="w-4 h-4 text-[#e67e22]" />
              TIKET TERJUAL (SOLD)
            </div>
            <div className="mt-3 font-mono font-black text-3xl text-black tracking-tight">
              {stats?.promoterSummary.totalTicketsSold.toLocaleString("id-ID") || 0}
              <span className="text-base text-gray-500 font-normal"> / {stats?.promoterSummary.totalCapacity.toLocaleString("id-ID") || 0}</span>
            </div>
            <div className="mt-2 text-xs font-mono text-gray-600">
              Okupansi Stadion: <strong>{stats?.promoterSummary.overallOccupancyPercentage || 0}%</strong>
            </div>
          </div>

          {/* Gauge 3: Remaining Inventory */}
          <div className="bg-[#fff8f6] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 relative overflow-hidden">
            <div className="absolute top-2 right-2 font-mono text-[10px] text-gray-400 border border-black px-1.5 bg-white uppercase">
              METRIC #03
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-gray-600">
              <Users className="w-4 h-4 text-[#0e7490]" />
              SISA KUOTA TERSEDIA
            </div>
            <div className="mt-3 font-mono font-black text-3xl text-[#0e7490] tracking-tight">
              {stats?.promoterSummary.totalAvailableQuota.toLocaleString("id-ID") || 0}
              <span className="text-base text-gray-500 font-normal"> Kursi/Slot</span>
            </div>
            <div className="mt-2 text-xs font-mono text-gray-600">
              Status Kapasitas: <strong>TERKENDALI (OCC GUARD)</strong>
            </div>
          </div>

          {/* Gauge 4: Total Bookings Status */}
          <div className="bg-[#fff8f6] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 relative overflow-hidden">
            <div className="absolute top-2 right-2 font-mono text-[10px] text-gray-400 border border-black px-1.5 bg-white uppercase">
              METRIC #04
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-gray-600">
              <Clock className="w-4 h-4 text-purple-700" />
              TOTAL ANTRIAN ORDER
            </div>
            <div className="mt-3 font-mono font-black text-3xl text-black tracking-tight">
              {stats?.bookingCounts.total || 0}
              <span className="text-sm text-gray-500 font-normal"> Order</span>
            </div>
            <div className="mt-2 text-xs font-mono text-gray-600 flex items-center gap-2">
              <span className="text-[#15803d] font-bold">{stats?.bookingCounts.paid || 0} LUNAS</span>
              <span>•</span>
              <span className="text-[#b45309] font-bold">{stats?.bookingCounts.pending || 0} PENDING</span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3: INVENTORY PER TIER (ANALOG METERS)
            ========================================================================= */}
        <section className="bg-[#fff8f6] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
          <div className="border-b-4 border-black pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <span className="bg-[#0e7490] text-white text-[10px] font-mono font-bold px-2 py-0.5 border border-black uppercase">
                INVENTORY AUDIT
              </span>
              <h2 className="text-xl font-headline font-black uppercase text-black mt-1">
                KONTROL ALOKASI KUOTA TIKET PER KATEGORI
              </h2>
            </div>
            <div className="text-xs font-mono font-bold text-gray-600">
              TARGET: GBK JAKARTA (50.000 CAPACITY)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats?.tierInventory.map((tier) => {
              const isSoldOut = tier.status === "SOLD_OUT" || tier.availableQuota <= 0;
              const isLimited = tier.status === "LIMITED" || (tier.availableQuota / tier.totalQuota) <= 0.2;

              return (
                <div
                  key={tier.id}
                  className="bg-white border-3 border-black p-5 relative shadow-[4px_4px_0px_#000] flex flex-col justify-between"
                >
                  {/* Top Category Badge */}
                  <div className="flex justify-between items-start border-b-2 border-dashed border-gray-300 pb-3 mb-3">
                    <div>
                      <h3 className="font-headline font-black text-lg text-black uppercase">
                        {tier.name}
                      </h3>
                      <div className="font-mono text-xs font-bold text-[#760009]">
                        Rp {tier.price.toLocaleString("id-ID")}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-black px-2 py-1 border border-black uppercase ${
                        isSoldOut
                          ? "bg-red-600 text-white"
                          : isLimited
                          ? "bg-amber-400 text-black"
                          : "bg-emerald-300 text-black"
                      }`}
                    >
                      {isSoldOut ? "HABIS" : isLimited ? "TERBATAS" : "TERSEDIA"}
                    </span>
                  </div>

                  {/* Quota Numbers */}
                  <div className="space-y-2 my-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-500">Terjual:</span>
                      <strong className="text-black font-bold">{tier.soldQuota} Tiket</strong>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-500">Sisa Kuota:</span>
                      <strong className="text-[#0e7490] font-bold">{tier.availableQuota} Tiket</strong>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-500">Total Alokasi:</span>
                      <strong className="text-gray-800 font-bold">{tier.totalQuota}</strong>
                    </div>

                    {/* Analog Meter Progress Bar */}
                    <div className="pt-2">
                      <div className="h-4 bg-gray-200 border-2 border-black overflow-hidden relative">
                        <div
                          className="h-full bg-[#760009] transition-all duration-500"
                          style={{ width: `${Math.min(tier.occupancyRate, 100)}%` }}
                        />
                      </div>
                      <div className="text-right text-[10px] font-mono font-bold text-gray-500 mt-1">
                        {tier.occupancyRate}% TERPESAN
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            SECTION 4: RECENT BOOKINGS & LIVE EVENTBRIDGE SIMULATION TABLE
            ========================================================================= */}
        <section className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
          <div className="border-b-4 border-black pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <span className="bg-[#e67e22] text-black text-[10px] font-mono font-black px-2 py-0.5 border border-black uppercase tracking-wider">
                TRANSACTION AUDIT LOG
              </span>
              <h2 className="text-xl font-headline font-black uppercase text-black mt-1">
                DAFTAR PEMESANAN &amp; SIMULASI EVENT-DRIVEN
              </h2>
            </div>
            <div className="font-mono text-xs text-gray-600 bg-gray-100 p-2 border border-black">
              *Klik tombol <strong>⚡ Simulasi Bayar</strong> untuk menguji EventBridge &amp; Step Functions
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse border-2 border-black">
              <thead>
                <tr className="bg-[#1c1c18] text-[#faf6f0] border-b-2 border-black uppercase">
                  <th className="p-3 border-r border-gray-700">Kode Booking</th>
                  <th className="p-3 border-r border-gray-700">Nama Pemesan</th>
                  <th className="p-3 border-r border-gray-700">Kategori</th>
                  <th className="p-3 border-r border-gray-700">Qty</th>
                  <th className="p-3 border-r border-gray-700">Total Harga</th>
                  <th className="p-3 border-r border-gray-700">Status</th>
                  <th className="p-3">Aksi Simulasi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {stats?.recentBookings && stats.recentBookings.length > 0 ? (
                  stats.recentBookings.map((b) => {
                    const isPaid = b.paymentStatus === "PAID";
                    return (
                      <tr key={b.id} className="hover:bg-[#fff8f6] transition-colors">
                        <td className="p-3 font-bold text-[#760009] border-r border-black whitespace-nowrap">
                          {b.bookingCode}
                        </td>
                        <td className="p-3 border-r border-black">
                          <div className="font-bold text-black">{b.customerName}</div>
                          <div className="text-[11px] text-gray-500">{b.customerEmail}</div>
                        </td>
                        <td className="p-3 border-r border-black font-bold whitespace-nowrap">
                          {b.tierName}
                        </td>
                        <td className="p-3 border-r border-black font-bold text-center">
                          {b.quantity}
                        </td>
                        <td className="p-3 border-r border-black whitespace-nowrap">
                          {b.formattedPrice}
                        </td>
                        <td className="p-3 border-r border-black whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 border border-black text-[10px] font-black uppercase ${
                              isPaid
                                ? "bg-emerald-200 text-emerald-900"
                                : "bg-amber-200 text-amber-900"
                            }`}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                LUNAS (PAID)
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-700" />
                                PENDING
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {isPaid ? (
                            <span className="font-mono text-[11px] text-gray-500 italic">
                              Event Emitted ✓
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSimulatePayment(b)}
                              disabled={simulatingId === b.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e67e22] text-black font-mono font-bold text-[11px] uppercase border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
                            >
                              <Zap className={`w-3.5 h-3.5 ${simulatingId === b.id ? "animate-spin" : ""}`} />
                              {simulatingId === b.id ? "Memproses..." : "⚡ Simulasi Bayar"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500 font-mono">
                      Belum ada pemesanan tiket yang tercatat di database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

