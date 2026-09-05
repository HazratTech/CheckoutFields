import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
  List,
  Box,
  Divider,
  Tabs,
  Tag,
} from "@shopify/polaris";
import { ExternalIcon, CheckCircleIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);

  let hasProPlan = false;
  try {
    const billingCheck = await billing.check({
      plans: [MONTHLY_PLAN],
      isTest: true,
    });
    hasProPlan = billingCheck.hasActivePayment;
  } catch (error) {
    // Development fallback if billing is unconfigured
    hasProPlan = false;
  }

  return json({
    shop: session.shop,
    hasProPlan,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);

  const billingCheck = await billing.require({
    plans: [MONTHLY_PLAN],
    isTest: true,
    onFailure: async () => billing.request({
      plan: MONTHLY_PLAN,
      isTest: true,
      returnUrl: `https://${session.shop}/admin/apps/checkout-fields`,
    }),
  });

  return json({ hasProPlan: billingCheck.hasActivePayment });
};

const PRESETS = [
  {
    title: "Gift Message",
    type: "multiline",
    placeholder: "Write a personalized note for the recipient...",
    key: "gift_message",
    badge: "Most Popular",
    description: "Collect personal gift notes for holidays, birthdays, and special occasions.",
  },
  {
    title: "Delivery Instructions",
    type: "text",
    placeholder: "e.g., Leave on porch, gate code #1234...",
    key: "delivery_instructions",
    badge: "Logistics",
    description: "Gather drop-off instructions, gate codes, or preferred delivery timing.",
  },
  {
    title: "VAT / Business Tax ID",
    type: "text",
    placeholder: "e.g., GB123456789 or Tax Registration Number",
    key: "vat_number",
    badge: "B2B / Wholesale",
    description: "Collect tax registration or VAT numbers for business invoices and compliance.",
  },
  {
    title: "How Did You Hear About Us?",
    type: "select",
    placeholder: "Instagram, TikTok, Google Search, Friend/Family, Other",
    key: "attribution_source",
    badge: "Marketing Survey",
    description: "Zero-party attribution survey to measure where your paying customers come from.",
  },
  {
    title: "Terms & Conditions Checkbox",
    type: "checkbox",
    placeholder: "I agree to the return and cancellation policies",
    key: "agreed_to_terms",
    badge: "Legal Compliance",
    description: "Require explicit buyer consent before final order confirmation.",
  },
];

export default function Index() {
  const { shop, hasProPlan } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isUpgrading = navigation.state === "submitting";

  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const activePreset = PRESETS[selectedPresetIndex];

  // Deep link directly to the Shopify Checkout Editor
  const checkoutEditorUrl = `https://${shop}/admin/settings/checkout/editor`;

  const handleUpgrade = () => {
    submit({}, { method: "POST" });
  };

  return (
    <Page>
      <TitleBar title="CheckoutFields Dashboard" />

      <BlockStack gap="500">
        {/* Welcome Header */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h1" variant="headingLg">
                    CheckoutFields
                  </Text>
                  <Badge tone={hasProPlan ? "success" : "attention"}>
                    {hasProPlan ? "Pro Plan Active" : "Free Starter Tier"}
                  </Badge>
                </InlineStack>
                <Text as="p" tone="subdued">
                  Add customizable gift notes, delivery instructions, tax IDs, and surveys to checkout and thank you pages.
                </Text>
              </BlockStack>

              <Button
                variant="primary"
                icon={ExternalIcon}
                url={checkoutEditorUrl}
                target="_blank"
              >
                Open Checkout Editor
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Layout>
          {/* Main Content Area */}
          <Layout.Section>
            <BlockStack gap="400">
              {/* Step-by-Step Onboarding */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    How to Add Fields to Your Checkout
                  </Text>
                  <Text as="p" tone="subdued">
                    Because Shopify Checkout is fully modular, you drag and position your fields visually right inside Shopify:
                  </Text>
                  <List type="number">
                    <List.Item>
                      Click <strong>"Open Checkout Editor"</strong> above to enter Shopify's native checkout designer.
                    </List.Item>
                    <List.Item>
                      In the left sidebar, click <strong>"+ Add App block"</strong>.
                    </List.Item>
                    <List.Item>
                      Select <strong>CheckoutFields</strong> and drag it to any checkout step (Plus stores) or to the <strong>Thank You</strong> / <strong>Order Status</strong> pages (all stores).
                    </List.Item>
                    <List.Item>
                      Click the block to set your field label, placeholder, input type, and required toggle in real-time.
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>

              {/* Ready-to-Use Presets */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Field Configuration Presets
                    </Text>
                    <Text as="p" tone="subdued">
                      Use these presets as inspiration inside the Checkout Editor
                    </Text>
                  </InlineStack>

                  <Tabs
                    tabs={PRESETS.map((p) => ({
                      id: p.key,
                      content: p.title,
                    }))}
                    selected={selectedPresetIndex}
                    onSelect={(index) => setSelectedPresetIndex(index)}
                  />

                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="200">
                      <InlineStack gap="200" align="space-between">
                        <Text as="h3" variant="headingSm">
                          {activePreset.title}
                        </Text>
                        <Badge tone="info">{activePreset.badge}</Badge>
                      </InlineStack>
                      <Text as="p">{activePreset.description}</Text>
                      <Divider />
                      <InlineStack gap="400">
                        <Text as="p" tone="subdued">
                          <strong>Type:</strong> {activePreset.type}
                        </Text>
                        <Text as="p" tone="subdued">
                          <strong>Attribute Key:</strong> <code>{activePreset.key}</code>
                        </Text>
                      </InlineStack>
                      <Text as="p" tone="subdued">
                        <strong>Placeholder:</strong> {activePreset.placeholder}
                      </Text>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>

              {/* Zero-DB Guarantee */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack gap="200" blockAlign="center">
                    <CheckCircleIcon width={20} height={20} />
                    <Text as="h2" variant="headingMd">
                      Zero External Databases • 100% Native Shopify Storage
                    </Text>
                  </InlineStack>
                  <Text as="p" tone="subdued">
                    Your customers' responses are saved directly into the Shopify Order details as <strong>Note Attributes</strong> under <code>order.customAttributes</code>.
                  </Text>
                  <Text as="p" tone="subdued">
                    You can view them natively in Shopify Admin under <strong>Orders &gt; [Order #] &gt; Additional details</strong>, or sync them with shipping apps like ShipStation, Klaviyo, and ERPs with zero custom integrations.
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          {/* Sidebar / Plan Status */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Subscription Plan
                  </Text>
                  {hasProPlan ? (
                    <Banner status="success">
                      You are on the <strong>Pro Plan ($12.99/mo)</strong>. Unlimited checkout fields and priority support are active.
                    </Banner>
                  ) : (
                    <BlockStack gap="300">
                      <Banner status="info">
                        Free tier active. Upgrade to Pro for unlimited fields, survey attribution, and conditional logic.
                      </Banner>
                      <BlockStack gap="100">
                        <Text as="p" variant="headingSm">
                          Pro Plan — $12.99 / month
                        </Text>
                        <Text as="p" tone="subdued" size="small">
                          Includes a 7-day free trial. Cancel anytime.
                        </Text>
                      </BlockStack>
                      <Button
                        variant="primary"
                        onClick={handleUpgrade}
                        loading={isUpgrading}
                      >
                        Upgrade to Pro
                      </Button>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingSm">
                    Store Compatibility
                  </Text>
                  <InlineStack gap="100" wrap>
                    <Tag>Shopify Basic</Tag>
                    <Tag>Shopify</Tag>
                    <Tag>Advanced</Tag>
                    <Tag>Shopify Plus</Tag>
                  </InlineStack>
                  <Text as="p" size="small" tone="subdued">
                    Works across all checkout steps on Plus, and on Thank You / Order Status pages for all standard plans.
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
