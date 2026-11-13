import { Handler } from "aws-lambda";
import { PublishCommand } from "@aws-sdk/client-sns";
import { snsClient } from "../utils/awsClients";

interface BroadcastInput {
  bookingId?: string;
  bookingCode?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  tierName?: string;
  quantity?: number;
  totalPrice?: number;
  pdfUrl?: string;
  [key: string]: unknown;
}

/**
 * Step Functions Task 2: Broadcast Notification via Amazon SNS
 * 
 * Sequentially triggered after generateTicketPdf completes.
 * Dispatches an automated multi-channel notification to the Amazon SNS TicketNotificationTopic
 * containing e-ticket details, download links, and gate instructions.
 */
export const handler: Handler = async (event) => {
  console.log("[broadcastNotification] Step Functions Task 2 invoked with payload:", JSON.stringify(event));

  const input: BroadcastInput = event || {};
  const bookingCode = input.bookingCode || "UNKNOWN-CODE";
  const customerName = input.customerName || "Sheilagank";
  const customerEmail = input.customerEmail || "customer@example.com";
  const tierName = input.tierName || "FESTIVAL";
  const quantity = input.quantity || 1;
  const pdfUrl = input.pdfUrl || "https://ticket-booking-assets.s3.amazonaws.com/e-tickets/default.pdf";

  const topicArn = process.env.SNS_TOPIC_ARN;
  if (!topicArn) {
    console.error("[broadcastNotification] CRITICAL: SNS_TOPIC_ARN environment variable is missing.");
    throw new Error("CONFIGURATION_ERROR: SNS_TOPIC_ARN is not set.");
  }

  const emailMessage = `
==================================================
SHEILA ON 7 • KONSER KISAH KLASIK 2026
Stadion Utama Gelora Bung Karno Jakarta
==================================================

Halo ${customerName},

Pembayaran tiket Anda telah terverifikasi secara resmi!
E-Tiket Anda siap digunakan untuk penukaran wristband.

Rincian Transaksi:
- Kode Booking    : ${bookingCode}
- Kategori Tiket  : ${tierName}
- Jumlah Tiket    : ${quantity} tiket
- Penerima Email  : ${customerEmail}

Unduh E-Tiket PDF Resmi:
${pdfUrl}

Catatan Penting:
1. Pintu gerbang stadion dibuka pukul 15:00 WIB.
2. Tunjukkan QR Code pada e-tiket Anda ke petugas gate.
3. Jangan bagikan tautan atau kode booking ini kepada siapapun.

Terima kasih telah merayakan 30 Tahun Kisah Klasik Sheila on 7!
==================================================
`;

  try {
    const publishCommand = new PublishCommand({
      TopicArn: topicArn,
      Subject: `[E-TIKET RESMI] Sheila on 7 Kisah Klasik - ${bookingCode}`,
      Message: emailMessage.trim(),
      MessageAttributes: {
        BookingCode: {
          DataType: "String",
          StringValue: bookingCode,
        },
        CustomerEmail: {
          DataType: "String",
          StringValue: customerEmail,
        },
      },
    });

    const snsResult = await snsClient.send(publishCommand);

    console.log(
      `[broadcastNotification] Successfully published message to SNS Topic=${topicArn}. MessageId=${snsResult.MessageId}`
    );

    return {
      ...input,
      snsMessageId: snsResult.MessageId,
      notificationSentTo: customerEmail,
      notifiedAt: new Date().toISOString(),
      status: "NOTIFICATION_BROADCASTED",
      success: true,
    };
  } catch (err: unknown) {
    console.error("[broadcastNotification] Failed to publish message to SNS Topic:", err);
    throw err;
  }
};

