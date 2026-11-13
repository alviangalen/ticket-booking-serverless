import { APIGatewayProxyHandler } from "aws-lambda";
import { PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { prisma } from "../db/client";
import { eventBridgeClient } from "../utils/awsClients";
import { errorResponse, successResponse } from "../utils/apiResponse";

interface SimulatePaymentRequest {
  bookingId?: string;
  bookingCode?: string;
}

/**
 * Simulate Payment & Emit EventBridge Event Handler
 * 
 * HTTP POST /tickets/simulate-payment
 * 
 * Simulates a payment gateway webhook / instant payment confirmation.
 * 1. Updates Booking status in PostgreSQL to PAID.
 * 2. Emits an enterprise EventBridge event (Source: 'ticket.booking', DetailType: 'OrderPaid')
 *    to trigger downstream serverless asynchronous workflows (Step Functions, SNS).
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("[simulatePayment] Received payment simulation request.");

  if (!event.body) {
    return errorResponse("Request body is required", 400);
  }

  let parsed: SimulatePaymentRequest;
  try {
    parsed = JSON.parse(event.body);
  } catch {
    return errorResponse("Invalid JSON in request body", 400);
  }

  const identifier = parsed.bookingId || parsed.bookingCode;
  if (!identifier || typeof identifier !== "string") {
    return errorResponse("bookingId or bookingCode is required", 400);
  }

  try {
    // 1. Locate the booking in PostgreSQL
    const existingBooking = await prisma.booking.findFirst({
      where: {
        OR: [{ id: identifier }, { bookingCode: identifier }],
      },
      include: {
        ticketTier: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!existingBooking) {
      console.warn(`[simulatePayment] Booking not found for identifier: ${identifier}`);
      return errorResponse("Data pemesanan tidak ditemukan.", 404);
    }

    // 2. Update booking status to PAID
    const updatedBooking = await prisma.booking.update({
      where: { id: existingBooking.id },
      data: {
        paymentStatus: "PAID",
      },
      include: {
        ticketTier: {
          include: {
            event: true,
          },
        },
      },
    });

    console.log(
      `[simulatePayment] Booking ${updatedBooking.bookingCode} (ID: ${updatedBooking.id}) marked as PAID.`
    );

    // 3. Prepare payload and emit event to EventBridge
    const eventPayload = {
      bookingId: updatedBooking.id,
      bookingCode: updatedBooking.bookingCode,
      ticketTierId: updatedBooking.ticketTierId,
      tierName: updatedBooking.ticketTier.name,
      eventName: updatedBooking.ticketTier.event.title,
      customerName: updatedBooking.customerName,
      customerEmail: updatedBooking.customerEmail,
      customerPhone: updatedBooking.customerPhone,
      quantity: updatedBooking.quantity,
      totalPrice: updatedBooking.totalPrice,
      paymentMethod: updatedBooking.paymentMethod,
      paymentStatus: updatedBooking.paymentStatus,
      qrPayload: updatedBooking.qrPayload,
      paidAt: new Date().toISOString(),
    };

    const eventBusName = process.env.EVENT_BUS_NAME || "default";

    const putEventCommand = new PutEventsCommand({
      Entries: [
        {
          Source: "ticket.booking",
          DetailType: "OrderPaid",
          EventBusName: eventBusName,
          Time: new Date(),
          Detail: JSON.stringify(eventPayload),
        },
      ],
    });

    const eventBridgeResult = await eventBridgeClient.send(putEventCommand);
    const eventId = eventBridgeResult.Entries?.[0]?.EventId || "simulated-event-id";

    console.log(
      `[simulatePayment] EventBridge event OrderPaid emitted successfully. EventId: ${eventId}`
    );

    return successResponse(
      {
        bookingId: updatedBooking.id,
        bookingCode: updatedBooking.bookingCode,
        paymentStatus: updatedBooking.paymentStatus,
        customerName: updatedBooking.customerName,
        customerEmail: updatedBooking.customerEmail,
        totalPrice: updatedBooking.totalPrice,
        eventBridgeEventId: eventId,
        emittedAt: new Date().toISOString(),
      },
      "Status pembayaran berhasil diperbarui menjadi LUNAS (PAID) dan event OrderPaid telah dipancarkan ke EventBridge.",
      200
    );
  } catch (err: unknown) {
    console.error("[simulatePayment] Error processing payment simulation:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(`Gagal memproses simulasi pembayaran: ${message}`, 500);
  }
};

