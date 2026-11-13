import { APIGatewayProxyHandler } from "aws-lambda";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "../utils/awsClients";
import { errorResponse, successResponse } from "../utils/apiResponse";
import { BookSeatRequest } from "../utils/types";

/**
 * Enqueue Booking Handler (API Gateway POST /tickets/book)
 * 
 * Lightweight API handler designed to absorb high concurrency ("war tiket").
 * Validates request payload and offloads heavy database operations by pushing
 * the raw payload to Amazon SQS (BookingQueue).
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("[enqueueBooking] Incoming booking request received via API Gateway.");

  if (!event.body) {
    return errorResponse("Request body is required", 400);
  }

  let parsed: BookSeatRequest;
  try {
    parsed = JSON.parse(event.body);
  } catch {
    return errorResponse("Invalid JSON in request body", 400);
  }

  const {
    ticketTierId,
    customerName,
    customerEmail,
    customerPhone,
    quantity,
    paymentMethod,
  } = parsed;

  // Strict Request Validation prior to enqueuing
  if (!ticketTierId || typeof ticketTierId !== "string") {
    return errorResponse("ticketTierId is required", 400);
  }
  if (!customerName || customerName.trim().length < 3) {
    return errorResponse("customerName must be at least 3 characters", 400);
  }
  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return errorResponse("Valid customerEmail is required", 400);
  }
  if (!customerPhone || customerPhone.trim().length < 8) {
    return errorResponse("Valid customerPhone is required", 400);
  }
  if (!quantity || quantity < 1 || quantity > 4) {
    return errorResponse("Quantity must be between 1 and 4 tickets per transaction", 400);
  }
  if (!paymentMethod || !["qris", "va"].includes(paymentMethod)) {
    return errorResponse("paymentMethod must be 'qris' or 'va'", 400);
  }

  const queueUrl = process.env.BOOKING_QUEUE_URL;
  if (!queueUrl) {
    console.error("[enqueueBooking] CRITICAL: BOOKING_QUEUE_URL environment variable is missing.");
    return errorResponse("Server configuration error: BookingQueue is not configured.", 500);
  }

  try {
    const queuePayload = JSON.stringify({
      ticketTierId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone.trim(),
      quantity,
      paymentMethod,
      enqueuedAt: new Date().toISOString(),
    });

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: queuePayload,
      MessageAttributes: {
        Action: {
          DataType: "String",
          StringValue: "BOOK_TICKET",
        },
      },
    });

    const sendResult = await sqsClient.send(command);

    console.log(
      `[enqueueBooking] Successfully queued booking messageId=${sendResult.MessageId} for customer=${customerEmail} tier=${ticketTierId} qty=${quantity}`
    );

    return successResponse(
      {
        status: "QUEUED",
        messageId: sendResult.MessageId,
        ticketTierId,
        customerEmail: customerEmail.trim().toLowerCase(),
        quantity,
      },
      "Permintaan pemesanan tiket Anda berhasil diterima dan sedang diproses dalam antrean (BookingQueue).",
      202
    );
  } catch (err: unknown) {
    console.error("[enqueueBooking] Failed to send message to SQS BookingQueue:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(`Gagal memasukkan pemesanan ke antrean: ${message}`, 500);
  }
};

