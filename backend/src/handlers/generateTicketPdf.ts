import { Handler } from "aws-lambda";

interface GeneratePdfInput {
  bookingId?: string;
  bookingCode?: string;
  tierName?: string;
  eventName?: string;
  customerName?: string;
  customerEmail?: string;
  quantity?: number;
  totalPrice?: number;
  qrPayload?: string;
  [key: string]: unknown;
}

/**
 * Step Functions Task 1: Generate Ticket PDF
 * 
 * Invoked sequentially as the first step in the OrderPaid Step Functions State Machine.
 * Simulates rendering a high-resolution, branded concert e-ticket PDF with embedded QR code
 * and saving it to an S3 bucket for distribution.
 */
export const handler: Handler = async (event) => {
  console.log("[generateTicketPdf] Step Functions Task 1 invoked with payload:", JSON.stringify(event));

  // Handle EventBridge event wrapper or direct state machine input
  const booking: GeneratePdfInput = (event && (event as any).detail) ? (event as any).detail : event || {};

  const bookingCode = booking.bookingCode || `SO7-${Date.now().toString(36).toUpperCase()}`;
  const customerName = booking.customerName || "Sheilagank";
  const tierName = booking.tierName || "FESTIVAL";
  const bucket = process.env.TICKET_BUCKET || "ticket-booking-assets";

  console.log(
    `[generateTicketPdf] Rendering PDF for bookingCode=${bookingCode}, customer=${customerName}, tier=${tierName}`
  );

  // Simulate ticket generation delay & S3 object generation
  const pdfUrl = `https://${bucket}.s3.amazonaws.com/e-tickets/${bookingCode}.pdf`;

  console.log(`[generateTicketPdf] E-ticket PDF successfully generated and uploaded: ${pdfUrl}`);

  // Return enriched context for downstream Step Functions states
  return {
    ...booking,
    bookingCode,
    customerName,
    tierName,
    pdfUrl,
    pdfGeneratedAt: new Date().toISOString(),
    status: "PDF_GENERATED",
  };
};

