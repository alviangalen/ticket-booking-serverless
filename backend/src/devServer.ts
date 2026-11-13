import http from "http";
import url from "url";
import { APIGatewayProxyEvent, Context, SQSEvent } from "aws-lambda";
import { handler as healthHandler } from "./handlers/health";
import { handler as getEventsHandler } from "./handlers/getEvents";
import { handler as getTicketTiersHandler } from "./handlers/getTicketTiers";
import { handler as enqueueBookingHandler } from "./handlers/enqueueBooking";
import { handler as bookSeatHandler } from "./handlers/bookSeat";
import { handler as simulatePaymentHandler } from "./handlers/simulatePayment";
import { handler as getBookingStatusHandler } from "./handlers/getBookingStatus";
import { handler as initDBHandler } from "./handlers/initDB";
import { handler as getAdminStatsHandler } from "./handlers/getAdminStats";
import { prisma } from "./db/client";

const PORT = process.env.PORT || 3000;

function createLambdaEvent(req: http.IncomingMessage, body: string, parsedUrl: url.UrlWithParsedQuery): APIGatewayProxyEvent {
  const queryParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsedUrl.query)) {
    if (typeof v === "string") queryParams[k] = v;
    else if (Array.isArray(v)) queryParams[k] = v[0];
  }

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers[k] = v;
  }

  return {
    body,
    headers,
    multiValueHeaders: {},
    httpMethod: req.method || "GET",
    isBase64Encoded: false,
    path: parsedUrl.pathname || "/",
    pathParameters: null,
    queryStringParameters: Object.keys(queryParams).length > 0 ? queryParams : null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            email: "operator@sheilaon7.id",
            sub: "local-dev-operator-uuid",
          },
        },
      },
    } as any,
    resource: "",
  };
}

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: true,
  functionName: "local-dev",
  functionVersion: "1",
  invokedFunctionArn: "arn:aws:lambda:local",
  memoryLimitInMB: "512",
  awsRequestId: "local-req-id",
  logGroupName: "local-group",
  logStreamName: "local-stream",
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Credentials": "true",
    });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url || "", true);
  let pathname = parsedUrl.pathname || "";
  
  // Normalize path if prefixed with /dev
  if (pathname.startsWith("/dev/")) {
    pathname = pathname.substring(4);
  } else if (pathname === "/dev") {
    pathname = "/";
  }

  const chunks: Buffer[] = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", async () => {
    const rawBody = Buffer.concat(chunks).toString("utf8");
    const lambdaEvent = createLambdaEvent(req, rawBody, parsedUrl);

    try {
      let result;

      if (pathname === "/health" && req.method === "GET") {
        result = await (healthHandler as any)(lambdaEvent, mockContext, () => {});
      } else if (pathname === "/events" && req.method === "GET") {
        result = await (getEventsHandler as any)(lambdaEvent, mockContext, () => {});
      } else if (pathname === "/tickets/tiers" && req.method === "GET") {
        result = await (getTicketTiersHandler as any)(lambdaEvent, mockContext, () => {});
      } else if (pathname === "/tickets/book" && req.method === "POST") {
        // If SQS queue is configured, enqueue normally; otherwise or in local dev,
        // execute enqueue + immediate SQS worker simulation for seamless local testing
        if (process.env.BOOKING_QUEUE_URL) {
          result = await (enqueueBookingHandler as any)(lambdaEvent, mockContext, () => {});
        } else {
          // Dev fallback: Simulate SQS dispatch and consumer invocation locally
          console.log("[devServer] Simulating local SQS Queue dispatch -> Worker execution...");
          const sqsMockEvent: SQSEvent = {
            Records: [
              {
                messageId: `mock-msg-${Date.now()}`,
                receiptHandle: "mock-receipt-handle",
                body: rawBody,
                attributes: {} as any,
                messageAttributes: {},
                md5OfBody: "mock-md5",
                eventSource: "aws:sqs",
                eventSourceARN: "arn:aws:sqs:local:123456789012:ticket-booking-queue-dev",
                awsRegion: "local",
              },
            ],
          };

          await (bookSeatHandler as any)(sqsMockEvent, mockContext, () => {});

          // Fetch the created booking to return to client in dev mode
          const parsed = JSON.parse(rawBody);
          const latestBooking = await prisma.booking.findFirst({
            where: { customerEmail: parsed.customerEmail.toLowerCase().trim() },
            orderBy: { createdAt: "desc" },
            include: { ticketTier: true },
          });

          result = {
            statusCode: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({
              success: true,
              data: latestBooking
                ? {
                    bookingId: latestBooking.id,
                    bookingCode: latestBooking.bookingCode,
                    tierName: latestBooking.ticketTier.name,
                    customerName: latestBooking.customerName,
                    customerEmail: latestBooking.customerEmail,
                    quantity: latestBooking.quantity,
                    totalPrice: latestBooking.totalPrice,
                    paymentMethod: latestBooking.paymentMethod,
                    paymentStatus: latestBooking.paymentStatus,
                    qrPayload: latestBooking.qrPayload,
                    createdAt: latestBooking.createdAt.toISOString(),
                  }
                : { status: "QUEUED" },
              message: "Pemesanan berhasil diproses via simulasi SQS queue.",
            }),
          };
        }
      } else if (pathname === "/tickets/simulate-payment" && req.method === "POST") {
        result = await (simulatePaymentHandler as any)(lambdaEvent, mockContext, () => {});
      } else if (pathname === "/bookings/status" && req.method === "GET") {
        result = await (getBookingStatusHandler as any)(lambdaEvent, mockContext, () => {});
      } else if (pathname === "/admin/stats" && req.method === "GET") {
        result = await (getAdminStatsHandler as any)(lambdaEvent, mockContext, () => {});
      } else if (pathname === "/init-db" && (req.method === "POST" || req.method === "GET")) {
        result = await (initDBHandler as any)(lambdaEvent, mockContext, () => {});
      } else {
        res.writeHead(404, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ success: false, error: `Route not found: ${pathname}` }));
        return;
      }

      if (result) {
        const headers = result.headers || {};
        headers["Access-Control-Allow-Origin"] = "*";
        res.writeHead(result.statusCode || 200, headers);
        res.end(result.body || "");
      } else {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Handler returned no response" }));
      }
    } catch (err: any) {
      console.error("Local Dev Server Error:", err);
      res.writeHead(500, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ success: false, error: err.message || "Internal server error" }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Local Enterprise API Gateway Dev Server running!`);
  console.log(`Base URL: http://localhost:${PORT}/dev`);
  console.log(`-------------------------------------------------------`);
  console.log(`Endpoints:`);
  console.log(` - GET  /dev/health`);
  console.log(` - GET  /dev/events`);
  console.log(` - GET  /dev/tickets/tiers`);
  console.log(` - POST /dev/tickets/book (SQS queue + OCC worker)`);
  console.log(` - POST /dev/tickets/simulate-payment (EventBridge OrderPaid)`);
  console.log(` - GET  /dev/bookings/status`);
  console.log(` - GET  /dev/admin/stats (Cognito protected)`);
  console.log(` - POST /dev/init-db (Database schema & seeding)`);
  console.log(`=======================================================`);
});
