import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  InlineGrid,
  Badge,
  Banner,
  List,
  Box,
  Divider,
  Tabs,
  Tag,
  Modal,
} from "@shopify/polaris";
import { ExternalIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing, admin } = await authenticate.admin(request);

  let hasProPlan = false;
  let subscriptionId: string | null = null;

  try {
    const billingCheck = await billing.check({
      plans: [MONTHLY_PLAN],
      isTest: process.env.NODE_ENV !== "production",
    });
    hasProPlan = billingCheck.hasActivePayment;
    subscriptionId = billingCheck.appSubscriptions?.[0]?.id || null;
  } catch (error) {
    hasProPlan = false;
  }

  // Sync plan status to shop app metafield so checkout extension enforces limits
  try {
    const shopQuery = await admin.graphql(`query { shop { id } }`);
    const shopData: any = await shopQuery.json();
    const shopId = shopData?.data?.shop?.id;

    if (shopId) {
      await admin.graphql(
        `#graphql
        mutation SetPlanMetafield($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            userErrors {
              message
            }
          }
        }`,
        {
          variables: {
            metafields: [
              {
                namespace: "checkout_fields",
                key: "plan",
                type: "single_line_text_field",
                value: hasProPlan ? "pro" : "free",
                ownerId: shopId,
              },
            ],
          },
        }
      );
    }
  } catch (err) {
    console.error("Metafield sync error:", err);
  }

  return json({
    shop: session.shop,
    hasProPlan,
    subscriptionId,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("_action");

  // Handle Cancellation
  if (intent === "cancel") {
    try {
      const billingCheck = await billing.check({
        plans: [MONTHLY_PLAN],
        isTest: process.env.NODE_ENV !== "production",
      });

      const subscription = billingCheck.appSubscriptions?.[0];
      if (subscription?.id) {
        await billing.cancel({
          subscriptionId: subscription.id,
          isTest: process.env.NODE_ENV !== "production",
          prorate: true,
        });
      }

      // Sync metafield back to free
      const shopQuery = await admin.graphql(`query { shop { id } }`);
      const shopData: any = await shopQuery.json();
      const shopId = shopData?.data?.shop?.id;
      if (shopId) {
        await admin.graphql(
          `#graphql
          mutation SetPlanMetafield($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              userErrors {
                message
              }
            }
          }`,
          {
            variables: {
              metafields: [
                {
                  namespace: "checkout_fields",
                  key: "plan",
                  type: "single_line_text_field",
                  value: "free",
                  ownerId: shopId,
                },
              ],
            },
          }
        );
      }

      return json({
        hasProPlan: false,
        notice: "Your Pro Plan subscription has been cancelled. Your store is now on the Free Starter tier.",
        error: null,
      });
    } catch (err: any) {
      return json({
        hasProPlan: true,
        notice: null,
        error: err?.message || "Failed to cancel subscription.",
      });
    }
  }

  // Handle Upgrade
  try {
    const cleanShop = session.shop.replace(".myshopify.com", "");
    return await billing.request({
      plan: MONTHLY_PLAN,
      isTest: process.env.NODE_ENV !== "production",
      returnUrl: `https://admin.shopify.com/store/${cleanShop}/apps/checkoutfields`,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      throw error;
    }

    const isPublicDistError =
      error?.errorData?.some?.((e: any) =>
        e?.message?.toLowerCase().includes("public distribution")
      ) ||
      error?.message?.toLowerCase().includes("public distribution");

    if (isPublicDistError) {
      return json({
        hasProPlan: false,
        notice: null,
        error:
          "Shopify Billing API requirement: Go to your Shopify Partner Dashboard (partners.shopify.com) > Apps > CheckoutFields > Distribution, and choose 'Public distribution'.",
      });
    }

    return json({
      hasProPlan: false,
      notice: null,
      error: error?.message || "Failed to initiate Shopify billing charge.",
    });
  }
};

const COMPARISON_FEATURES = [
  {
    feature: "Active Checkout Fields",
    description: "Number of fields you can place in checkout simultaneously",
    free: "1 field",
    pro: "Unlimited fields",
  },
  {
    feature: "Required Field Validation",
    description: "Mandate customer input before checkout progression",
    free: "Optional only",
    pro: "Enforced blocking",
  },
  {
    feature: "Supported Input Types",
    description: "Available field components in the Checkout Editor",
    free: "Text, Multiline",
    pro: "Text, Multiline, Select, Checkbox, Number",
  },
  {
    feature: "B2B & Tax Compliance",
    description: "Enforce VAT or Tax ID numbers before order confirmation",
    free: "Optional input",
    pro: "Mandatory validation",
  },
  {
    feature: "Attribution Surveys",
    description: "Dropdown surveys for customer acquisition tracking",
    free: "Not available",
    pro: "Select dropdowns",
  },
  {
    feature: "Terms & Conditions",
    description: "Mandatory buyer consent checkbox before payment",
    free: "Not available",
    pro: "Enforced checkbox",
  },
  {
    feature: "Shopify Admin Order Storage",
    description: "Saved in Order Note Attributes under Additional details",
    free: "Native storage",
    pro: "Native storage",
  },
  {
    feature: "Technical Support",
    description: "Assistance with checkout setup and configuration",
    free: "Standard documentation",
    pro: "Priority developer support",
  },
];

const PRESETS = [
  {
    title: "Gift Message",
    type: "multiline",
    placeholder: "Write a personalized note for the recipient...",
    key: "gift_message",
    badge: "Free Tier",
    tone: "info" as const,
    description: "Collect personal gift notes for holidays, birthdays, and special occasions.",
  },
  {
    title: "Delivery Instructions",
    type: "text",
    placeholder: "e.g., Leave on porch, gate code #1234...",
    key: "delivery_instructions",
    badge: "Free Tier",
    tone: "info" as const,
    description: "Gather drop-off instructions, gate codes, or preferred delivery timing.",
  },
  {
    title: "VAT / Business Tax ID",
    type: "text",
    placeholder: "e.g., GB123456789 or Tax Registration Number",
    key: "vat_number",
    badge: "Pro Plan (Required Validation)",
    tone: "attention" as const,
    description: "Collect tax registration or VAT numbers for business invoices. Enforces input before proceeding.",
  },
  {
    title: "How Did You Hear About Us?",
    type: "select",
    placeholder: "Instagram, TikTok, Google Search, Friend/Family, Other",
    key: "attribution_source",
    badge: "Pro Plan (Dropdown Select)",
    tone: "attention" as const,
    description: "Zero-party attribution survey using custom dropdown choices to measure customer acquisition.",
  },
  {
    title: "Terms & Conditions Checkbox",
    type: "checkbox",
    placeholder: "I agree to the return and cancellation policies",
    key: "agreed_to_terms",
    badge: "Pro Plan (Mandatory Checkbox)",
    tone: "attention" as const,
    description: "Require explicit buyer consent and legal agreement before the order is placed.",
  },
];

export default function Index() {
  const { shop, hasProPlan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const isPro = actionData?.hasProPlan !== undefined ? actionData.hasProPlan : hasProPlan;

  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const activePreset = PRESETS[selectedPresetIndex];
  const checkoutEditorUrl = `https://${shop}/admin/settings/checkout/editor`;

  const handleUpgrade = () => {
    submit({ _action: "upgrade" }, { method: "POST" });
  };

  const handleCancel = () => {
    submit({ _action: "cancel" }, { method: "POST" });
    setIsCancelModalOpen(false);
  };

  return (
    <Page>
      <TitleBar title="CheckoutFields Dashboard" />

      <BlockStack gap="500">
        {actionData?.notice && (
          <Banner tone="info" onDismiss={() => {}}>
            {actionData.notice}
          </Banner>
        )}
        {actionData?.error && (
          <Banner tone="critical" onDismiss={() => {}}>
            {actionData.error}
          </Banner>
        )}

        {/* Header Bar */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h1" variant="headingLg">
                    CheckoutFields
                  </Text>
                  <Badge tone={isPro ? "success" : "info"}>
                    {isPro ? "Pro Plan Active" : "Free Starter Tier"}
                  </Badge>
                </InlineStack>
                <Text as="p" tone="subdued">
                  Add customizable gift notes, delivery instructions, tax IDs, and surveys to checkout.
                </Text>
              </BlockStack>

              <InlineStack gap="200" blockAlign="center">
                <Button onClick={() => setIsPlanModalOpen(true)}>
                  {isPro ? "Pro Plan Details" : "Upgrade to Pro"}
                </Button>
                {isPro && (
                  <Button
                    tone="critical"
                    variant="plain"
                    onClick={() => setIsCancelModalOpen(true)}
                  >
                    Cancel Subscription
                  </Button>
                )}
                <Button
                  variant="primary"
                  icon={ExternalIcon}
                  url={checkoutEditorUrl}
                  target="_blank"
                >
                  Open Checkout Editor
                </Button>
              </InlineStack>
            </InlineStack>
          </BlockStack>
        </Card>

        <Layout>
          {/* Main Content Area */}
          <Layout.Section>
            <BlockStack gap="400">
              {/* Ready-to-Use Presets */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                      <Text as="h2" variant="headingMd">
                        Field Configuration Presets
                      </Text>
                      <Text as="p" tone="subdued">
                        Reference settings to configure inside the Shopify Checkout Editor
                      </Text>
                    </BlockStack>
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
                        <Badge tone={activePreset.tone}>{activePreset.badge}</Badge>
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

              {/* Native Storage Card */}
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Zero External Databases • 100% Native Shopify Storage
                  </Text>
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

          {/* Sidebar Area */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* Subscription Plan Card */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Subscription Plan
                  </Text>

                  {isPro ? (
                    <BlockStack gap="300">
                      <Banner tone="success">
                        <Text as="p" fontWeight="semibold">
                          Pro Plan ($12.99 / month)
                        </Text>
                        <Text as="p" variant="bodySm">
                          Unlimited fields and required validation are active on your store.
                        </Text>
                      </Banner>

                      <InlineStack gap="200">
                        <Button onClick={() => setIsPlanModalOpen(true)}>
                          View Plan Details
                        </Button>
                        <Button
                          tone="critical"
                          variant="plain"
                          onClick={() => setIsCancelModalOpen(true)}
                        >
                          Cancel Subscription
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  ) : (
                    <BlockStack gap="300">
                      <Banner tone="info">
                        <Text as="p" fontWeight="semibold">
                          Free Starter Tier ($0 / month)
                        </Text>
                        <Text as="p" variant="bodySm">
                          1 checkout field included. Upgrade to enable unlimited fields and required validation.
                        </Text>
                      </Banner>

                      <Button
                        variant="primary"
                        onClick={() => setIsPlanModalOpen(true)}
                      >
                        Upgrade to Pro ($12.99/mo)
                      </Button>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

              {/* How to Position Fields */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    How to Position Fields
                  </Text>
                  <Text as="p" tone="subdued">
                    Shopify Checkout is modular. You drag and place fields visually:
                  </Text>
                  <List type="number">
                    <List.Item>
                      Click <strong>"Open Checkout Editor"</strong> above.
                    </List.Item>
                    <List.Item>
                      In the left sidebar, click <strong>"+ Add block"</strong>.
                    </List.Item>
                    <List.Item>
                      Select <strong>CheckoutFields</strong> and drag it to your desired section (Contact, Delivery, Payment).
                    </List.Item>
                    <List.Item>
                      Configure your title, placeholder, and attribute key in real-time.
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>

              {/* Store Compatibility */}
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
                  <Text as="p" variant="bodySm" tone="subdued">
                    Checkout blocks are available across all checkout steps on Shopify Plus, and on Thank You / Order Status pages for standard Shopify plans.
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Plan Details & Upgrade Modal */}
      <Modal
        size="large"
        open={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={isPro ? "Pro Plan Features & Tier Details" : "Upgrade to CheckoutFields Pro"}
        primaryAction={
          isPro
            ? {
                content: "Close",
                onAction: () => setIsPlanModalOpen(false),
              }
            : {
                content: "Start 7-Day Free Trial ($12.99/mo)",
                loading: isSubmitting,
                onAction: handleUpgrade,
              }
        }
        secondaryActions={
          isPro
            ? [
                {
                  content: "Cancel Subscription",
                  destructive: true,
                  onAction: () => {
                    setIsPlanModalOpen(false);
                    setIsCancelModalOpen(true);
                  },
                },
              ]
            : [
                {
                  content: "Cancel",
                  onAction: () => setIsPlanModalOpen(false),
                },
              ]
        }
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" tone="subdued">
              {isPro
                ? "Your store has an active Pro Plan ($12.99/mo). All features are fully unlocked. You can cancel at any time below."
                : "Upgrade to the Pro Plan for $12.99/month with a 7-day free trial. Unlock unlimited active fields, mandatory required field validation, and dropdown surveys."}
            </Text>

            <Divider />

            <BlockStack gap="200">
              {/* Table Header */}
              <Box paddingBlockEnd="100">
                <InlineGrid columns="2fr 1fr 1fr">
                  <Text as="span" variant="headingSm" tone="subdued">
                    CAPABILITY
                  </Text>
                  <Text as="span" variant="headingSm" tone="subdued">
                    FREE STARTER
                  </Text>
                  <Text as="span" variant="headingSm" tone="subdued">
                    PRO ($12.99/MO)
                  </Text>
                </InlineGrid>
              </Box>
              <Divider />

              {/* Rows */}
              {COMPARISON_FEATURES.map((item, idx) => (
                <Box key={idx} paddingBlockStart="150" paddingBlockEnd="150">
                  <InlineGrid columns="2fr 1fr 1fr">
                    <BlockStack gap="050">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {item.feature}
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        {item.description}
                      </Text>
                    </BlockStack>
                    <Text as="span" variant="bodyMd">
                      {item.free}
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {item.pro}
                    </Text>
                  </InlineGrid>
                  {idx < COMPARISON_FEATURES.length - 1 && <Divider />}
                </Box>
              ))}
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Cancel Subscription Confirmation Modal */}
      <Modal
        open={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Pro Subscription"
        primaryAction={{
          content: "Confirm Cancellation",
          destructive: true,
          loading: isSubmitting,
          onAction: handleCancel,
        }}
        secondaryActions={[
          {
            content: "Keep Subscription",
            onAction: () => setIsCancelModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p">
              Are you sure you want to cancel your Pro Plan subscription?
            </Text>
            <Text as="p" tone="subdued">
              Your store will be downgraded to the Free Starter tier. You will be able to maintain 1 active checkout field, but required validation and advanced input components (dropdowns, checkboxes) will be disabled.
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
