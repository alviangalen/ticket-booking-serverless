import { SQSClient } from "@aws-sdk/client-sqs";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { SNSClient } from "@aws-sdk/client-sns";

const region = process.env.AWS_REGION || process.env.REGION || "ap-southeast-1";

/**
 * Reusable AWS SDK v3 Clients instantiated outside Lambda handlers
 * to ensure connection and keep-alive reuse across warm invocations.
 */
export const sqsClient = new SQSClient({ region });
export const eventBridgeClient = new EventBridgeClient({ region });
export const snsClient = new SNSClient({ region });

