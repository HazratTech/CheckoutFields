import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "./shopify.server";
import db from "./db.server";

export async function handleComplianceWebhook({ request }: ActionFunctionArgs) {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`[Compliance Webhook] Received ${topic} for ${shop}:`, JSON.stringify(payload));

  const normalizedTopic = topic?.toLowerCase().replace(/_/g, "/");

  switch (normalizedTopic) {
    case "customers/data/request":
    case "customers/data_request": {
      // CheckoutFields does not store customer personal data in an external database.
      // All field data is saved directly in native Shopify Order Note Attributes.
      // Acknowledge receipt with 200 OK.
      console.log(`[Compliance Webhook] Handled customers/data_request for ${shop}`);
      break;
    }

    case "customers/redact": {
      // CheckoutFields does not retain customer personal data on our servers.
      console.log(`[Compliance Webhook] Handled customers/redact for ${shop}`);
      break;
    }

    case "shop/redact": {
      // 48 hours after app uninstall, erase all remaining store sessions.
      if (shop) {
        console.log(`[Compliance Webhook] Deleting sessions for shop: ${shop}`);
        await db.session.deleteMany({ where: { shop } });
      }
      break;
    }

    default: {
      console.warn(`[Compliance Webhook] Received topic: ${topic}`);
      break;
    }
  }

  return new Response(null, { status: 200 });
}
