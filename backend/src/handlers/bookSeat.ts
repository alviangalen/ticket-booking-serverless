import { SQSEvent, SQSHandler } from "aws-lambda";
import { prisma } from "../db/client";
import { BookSeatRequest, BookingResponseData } from "../utils/types";

// Maximum retries for optimistic lock conflict under heavy "war tiket" traffic
const MAX_LOCK_RETRIES = 3;

/**
 * SQS Consumer Handler for Booking Execution
 * 
 * Subscribed to Amazon SQS (BookingQueue).
 * Decoupled from the HTTP request cycle to ensure maximum throughput and stability.
 * Wraps the core domain logic: Optimistic Concurrency Control (OCC) for ticket drops.
 */
export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log(`[bookSeat] SQS event received with ${event.Records.length} record(s).`);

  if (!event.Records || event.Records.length === 0) {
    console.warn("[bookSeat] No SQS records found in event payload.");
    return;
  }

  // Parse the record body (event.Records[0].body)
  const rawBody = event.Records[0].body;
  let parsed: BookSeatRequest;
  try {
    parsed = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
  } catch (err) {
    console.error("[bookSeat] Failed to parse SQS record body as JSON:", rawBody, err);
    throw new Error("INVALID_SQS_PAYLOAD");
  }

  const {
    ticketTierId,
    customerName,
    customerEmail,
    customerPhone,
    quantity,
    paymentMethod,
  } = parsed;

  console.log(
    `[bookSeat] Processing booking from SQS: tier=${ticketTierId}, qty=${quantity}, customer=${customerEmail}`
  );

  // Core Domain Logic: Optimistic Concurrency Control ("War Tiket" Protection)
  for (let attempt = 1; attempt <= MAX_LOCK_RETRIES; attempt++) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Fetch current tier state
        const currentTier = await tx.ticketTier.findUnique({
          where: { id: ticketTierId },
        });

        if (!currentTier) {
          throw new Error("TIER_NOT_FOUND");
        }

        if (currentTier.availableQuota < quantity) {
          throw new Error("INSUFFICIENT_QUOTA");
        }

        // 2. Optimistic Concurrency Control: atomic check on id + version
        const updateResult = await tx.ticketTier.updateMany({
          where: {
            id: ticketTierId,
            version: currentTier.version,
            availableQuota: { gte: quantity },
          },
          data: {
            availableQuota: { decrement: quantity },
            version: { increment: 1 },
          },
        });

        // Concurrency conflict occurred: another Lambda acquired the seat first
        if (updateResult.count === 0) {
          throw new Error("CONCURRENCY_CONFLICT");
        }

        // Check if now sold out
        const remaining = currentTier.availableQuota - quantity;
        if (remaining <= 0) {
          await tx.ticketTier.update({
            where: { id: ticketTierId },
            data: { status: "SOLD_OUT" },
          });
        }

        // 3. Generate booking code and QR Payload
        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        const bookingCode = `SO7-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
        const totalPrice = currentTier.price * quantity;
        const qrPayload = JSON.stringify({
          app: "SO7-KisahKlasik-2026",
          code: bookingCode,
          tier: currentTier.name,
          qty: quantity,
          name: customerName.trim(),
          verified: true,
        });

        // 4. Create the booking entry (initial status: PENDING awaiting payment verification)
        const booking = await tx.booking.create({
          data: {
            bookingCode,
            ticketTierId,
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim().toLowerCase(),
            customerPhone: customerPhone.trim(),
            quantity,
            totalPrice,
            paymentMethod,
            paymentStatus: "PENDING",
            qrPayload,
          },
          include: {
            ticketTier: true,
          },
        });

        return booking;
      });

      const responseData: BookingResponseData = {
        bookingId: result.id,
        bookingCode: result.bookingCode,
        tierName: result.ticketTier.name,
        customerName: result.customerName,
        customerEmail: result.customerEmail,
        quantity: result.quantity,
        totalPrice: result.totalPrice,
        paymentMethod: result.paymentMethod,
        paymentStatus: result.paymentStatus,
        qrPayload: result.qrPayload,
        createdAt: result.createdAt.toISOString(),
      };

      console.log(
        `[bookSeat] Booking successfully created: id=${responseData.bookingId}, code=${responseData.bookingCode}, status=${responseData.paymentStatus}`
      );
      return;
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === "TIER_NOT_FOUND") {
          console.error(`[bookSeat] Ticket tier not found: ${ticketTierId}`);
          return;
        }
        if (err.message === "INSUFFICIENT_QUOTA") {
          console.warn(`[bookSeat] Insufficient quota for tier ${ticketTierId}. Sold out.`);
          return;
        }
        if (err.message === "CONCURRENCY_CONFLICT") {
          console.warn(
            `[bookSeat] Concurrency conflict detected on attempt ${attempt}/${MAX_LOCK_RETRIES}. Retrying...`
          );
          if (attempt < MAX_LOCK_RETRIES) {
            const backoff = Math.floor(Math.random() * 50) + attempt * 30;
            await new Promise((res) => setTimeout(res, backoff));
            continue;
          }
          console.error("[bookSeat] Max lock retries exceeded under high concurrency.");
          throw err;
        }
      }

      console.error("[bookSeat] Unexpected error while processing booking transaction:", err);
      throw err;
    }
  }
};
