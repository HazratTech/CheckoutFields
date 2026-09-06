import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { handleComplianceWebhook } from "../compliance.server";

export const action = async (args: ActionFunctionArgs) => {
  return handleComplianceWebhook(args);
};

export const loader = async (_args: LoaderFunctionArgs) => {
  return new Response("Customers Data Request Webhook Endpoint Active", { status: 200 });
};
