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
import { authenticate } from "../shopify.server";
import { MONTHLY_PLAN, ANNUAL_PLAN } from "../plans";

async function getAppDetails(admin: any) {
  let isPartnerDev = false;
  let shopId: string | null = null;
  let appHandle = "checkoutfields-4";

  try {
    const res = await admin.graphql(`
      query {
        shop {
          id
          plan {
            partnerDevelopment
          }
        }
        currentAppInstallation {
          app {
            handle
          }
        }
      }
    `);
    const data: any = await res.json();
    shopId = data?.data?.shop?.id || null;
    isPartnerDev = Boolean(data?.data?.shop?.plan?.partnerDevelopment);
    if (data?.data?.currentAppInstallation?.app?.handle) {
      appHandle = data.data.currentAppInstallation.app.handle;
    }
  } catch (err) {
    console.error("Failed to query shop details:", err);
  }

  return { shopId, isPartnerDev, appHandle };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing, admin } = await authenticate.admin(request);
  const { shopId, appHandle } = await getAppDetails(admin);

  let hasProPlan = false;
  let subscriptionId: string | null = null;
  let currentPlanName: string | null = null;
  let isAnnual = false;
  let isMonthly = false;

  try {
    // Check for both Monthly and Annual subscriptions.
    // Setting isTest: true allows test subscriptions (reviewers and dev stores)
    // AND real production subscriptions to be recognized!
    const billingCheck = await billing.check({
      plans: [MONTHLY_PLAN, ANNUAL_PLAN],
      isTest: true,
    });

    hasProPlan = Boolean(billingCheck.hasActivePayment);
    if (billingCheck.appSubscriptions && billingCheck.appSubscriptions.length > 0) {
      const activeSub = billingCheck.appSubscriptions[0];
      subscriptionId = activeSub.id || null;
      currentPlanName = activeSub.name || null;
      isAnnual = currentPlanName === ANNUAL_PLAN;
      isMonthly = currentPlanName === MONTHLY_PLAN || !isAnnual;
    }
  } catch (error) {
    console.error("Billing check error:", error);
    hasProPlan = false;
  }

  // Sync plan status to shop app metafield so checkout extension enforces limits
  if (shopId) {
    try {
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
    } catch (err) {
      console.error("Metafield sync error:", err);
    }
  }

  return json({
    shop: session.shop,
    hasProPlan,
    subscriptionId,
    currentPlanName,
    isAnnual,
    isMonthly,
    appHandle,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session, admin } = await authenticate.admin(request);
  const { shopId, appHandle, isPartnerDev } = await getAppDetails(admin);
  const formData = await request.formData();
  const intent = formData.get("_action");

  // Determine if charge should be in test mode:
  // Enabled if SHOPIFY_BILLING_TEST is true/unset, or in dev/non-production.
  const isTestBilling =
    process.env.SHOPIFY_BILLING_TEST !== "false" ||
    process.env.NODE_ENV !== "production" ||
    isPartnerDev;

  // Handle Cancellation (Downgrade to Free)
  if (intent === "cancel") {
    try {
      const billingCheck = await billing.check({
        plans: [MONTHLY_PLAN, ANNUAL_PLAN],
        isTest: true,
      });

      const subscription = billingCheck.appSubscriptions?.[0];
      if (subscription?.id) {
        await billing.cancel({
          subscriptionId: subscription.id,
          isTest: isTestBilling,
          prorate: true,
        });
      }

      // Sync metafield back to free
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
        currentPlanName: null,
        notice: "Your Pro Plan subscription has been cancelled. Your store is now on the Free Starter tier.",
        error: null,
      });
    } catch (err: any) {
      return json({
        hasProPlan: true,
        currentPlanName: null,
        notice: null,
        error: err?.message || "Failed to cancel subscription.",
      });
    }
  }

  // Handle Upgrade or Switch Plan (Monthly <-> Annual)
  if (intent === "upgrade" || intent === "switch_plan") {
    try {
      const selectedPlan = formData.get("plan");
      const targetPlan = selectedPlan === "annual" ? ANNUAL_PLAN : MONTHLY_PLAN;
      const cleanShop = session.shop.replace(".myshopify.com", "");

      return await billing.request({
        plan: targetPlan,
        isTest: isTestBilling,
        returnUrl: `https://admin.shopify.com/store/${cleanShop}/apps/${appHandle}`,
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
          currentPlanName: null,
          notice: null,
          error:
            "Shopify Billing API requirement: Go to your Shopify Partner Dashboard (partners.shopify.com) > Apps > Fieldy: Custom Checkout Fields > Distribution, and choose 'Public distribution'.",
        });
      }

      return json({
        hasProPlan: false,
        currentPlanName: null,
        notice: null,
        error: error?.message || "Failed to initiate Shopify billing charge.",
      });
    }
  }

  return json({ hasProPlan: false, currentPlanName: null, notice: null, error: "Invalid action" });
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
  const {
    shop,
    hasProPlan,
    isAnnual: loaderIsAnnual,
    isMonthly: loaderIsMonthly,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const isPro = actionData?.hasProPlan !== undefined ? actionData.hasProPlan : hasProPlan;
  const isAnnual = isPro && (actionData?.currentPlanName ? actionData.currentPlanName === ANNUAL_PLAN : loaderIsAnnual);
  const isMonthly = isPro && (actionData?.currentPlanName ? actionData.currentPlanName === MONTHLY_PLAN : loaderIsMonthly || !loaderIsAnnual);

  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const activePreset = PRESETS[selectedPresetIndex];
  const checkoutEditorUrl = `https://${shop}/admin/settings/checkout/editor`;

  const handleUpgrade = (plan: "monthly" | "annual") => {
    submit({ _action: "upgrade", plan }, { method: "POST" });
  };

  const handleSwitchPlan = (plan: "monthly" | "annual") => {
    submit({ _action: "switch_plan", plan }, { method: "POST" });
  };

  const handleCancel = () => {
    submit({ _action: "cancel" }, { method: "POST" });
    setIsCancelModalOpen(false);
  };

  return (
    <Page>
      <TitleBar title="Fieldy: Custom Checkout Fields Dashboard" />
      <BlockStack gap="500">
        {/* Top Notification Banner */}
        <Banner
          title="Checkout Extension Active"
          tone="success"
        >
          <p>
            Custom checkout fields, required blocking validation, and order note attributes are ready.
          </p>
        </Banner>

        {actionData?.notice && (
          <Banner tone="success" onDismiss={() => {}}>
            <p>{actionData.notice}</p>
          </Banner>
        )}
        {actionData?.error && (
          <Banner tone="critical" onDismiss={() => {}}>
            <p>{actionData.error}</p>
          </Banner>
        )}

        {/* Hero Welcome Card */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <InlineStack gap="300" blockAlign="center">
                  <Text as="h1" variant="headingLg">
                    Fieldy: Custom Checkout Fields
                  </Text>
                  <Badge tone={isPro ? "success" : "info"}>
                    {isPro
                      ? isAnnual
                        ? "Pro Plan Active (Annual)"
                        : "Pro Plan Active (Monthly)"
                      : "Free Starter Tier"}
                  </Badge>
                </InlineStack>
                <Text as="p" tone="subdued">
                  Add customizable gift notes, delivery instructions, tax IDs, and surveys to checkout.
                </Text>
              </BlockStack>

              <InlineStack gap="200" blockAlign="center">
                <Button onClick={() => setIsPlanModalOpen(true)}>
                  {isPro ? "Manage Plan" : "Upgrade to Pro"}
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
                        <BlockStack gap="100">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text as="p" fontWeight="semibold">
                              {isAnnual
                                ? "Annual Pro Plan ($99.99 / year)"
                                : "Monthly Pro Plan ($12.99 / month)"}
                            </Text>
                            <Badge tone="success">Active</Badge>
                          </InlineStack>
                          <Text as="p" variant="bodySm">
                            Unlimited fields and required validation are active on your store.
                          </Text>
                        </BlockStack>
                      </Banner>

                      {/* Requirement 1.2.3: In-App Plan Switcher */}
                      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                        <BlockStack gap="200">
                          <Text as="p" variant="bodySm" fontWeight="semibold">
                            {isAnnual ? "Need Monthly Billing?" : "Upgrade to Annual & Save 35%"}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {isAnnual
                              ? "Switch to flexible monthly billing at $12.99 / month."
                              : "Switch to Annual billing at $99.99 / year ($8.33/mo) and save $55.89/year."}
                          </Text>
                          <Button
                            variant="secondary"
                            loading={isSubmitting}
                            onClick={() => handleSwitchPlan(isAnnual ? "monthly" : "annual")}
                          >
                            {isAnnual
                              ? "Switch to Monthly ($12.99/mo)"
                              : "Switch to Annual ($99.99/yr — Save 35%)"}
                          </Button>
                        </BlockStack>
                      </Box>

                      <InlineStack gap="200" align="space-between" blockAlign="center">
                        <Button onClick={() => setIsPlanModalOpen(true)}>
                          Compare All Plans
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

                      {/* Requirement 1.2.3: Direct Annual vs Monthly Selection */}
                      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                        <BlockStack gap="200">
                          <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="050">
                              <Text as="span" fontWeight="semibold">
                                Annual Pro Plan
                              </Text>
                              <Text as="span" variant="bodySm" tone="subdued">
                                $99.99 / year ($8.33/mo) • Save 35%
                              </Text>
                            </BlockStack>
                            <Badge tone="success">Best Value</Badge>
                          </InlineStack>
                          <Button
                            variant="primary"
                            loading={isSubmitting}
                            onClick={() => handleUpgrade("annual")}
                          >
                            Start 7-Day Free Trial (Annual)
                          </Button>
                        </BlockStack>
                      </Box>

                      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                        <BlockStack gap="200">
                          <BlockStack gap="050">
                            <Text as="span" fontWeight="semibold">
                              Monthly Pro Plan
                            </Text>
                            <Text as="span" variant="bodySm" tone="subdued">
                              $12.99 / month • Flexible monthly billing
                            </Text>
                          </BlockStack>
                          <Button
                            loading={isSubmitting}
                            onClick={() => handleUpgrade("monthly")}
                          >
                            Start 7-Day Free Trial (Monthly)
                          </Button>
                        </BlockStack>
                      </Box>

                      <Button variant="plain" onClick={() => setIsPlanModalOpen(true)}>
                        View Feature Comparison Table
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
                      Select <strong>Fieldy: Custom Checkout Fields</strong> and drag it to your desired section (Contact, Delivery, Payment).
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

      {/* Plan Details & Upgrade / Switch Modal */}
      <Modal
        size="large"
        open={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title="Fieldy Plans & Pricing"
        primaryAction={{
          content: "Close",
          onAction: () => setIsPlanModalOpen(false),
        }}
        secondaryActions={
          isPro
            ? [
                {
                  content: "Cancel Subscription (Downgrade to Free)",
                  destructive: true,
                  onAction: () => {
                    setIsPlanModalOpen(false);
                    setIsCancelModalOpen(true);
                  },
                },
              ]
            : undefined
        }
      >
        <Modal.Section>
          <BlockStack gap="500">
            {/* 3 Tier Cards Side-by-Side */}
            <InlineGrid columns={["oneThird", "oneThird", "oneThird"]} gap="300">
              {/* Free Card */}
              <Box
                padding="400"
                background={!isPro ? "bg-surface-selected" : "bg-surface-secondary"}
                borderRadius="200"
                borderWidth="025"
                borderColor={!isPro ? "border-focus" : "border"}
              >
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingSm">
                      Free Starter
                    </Text>
                    {!isPro && <Badge tone="info">Current</Badge>}
                  </InlineStack>
                  <Text as="p" variant="headingLg">
                    $0 <Text as="span" variant="bodySm" tone="subdued">/ month</Text>
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Essential custom field for stores with basic checkout notes.
                  </Text>
                  <Divider />
                  <List type="bullet">
                    <List.Item>1 active checkout field</List.Item>
                    <List.Item>Text &amp; multiline inputs</List.Item>
                    <List.Item>Optional fields only</List.Item>
                    <List.Item>Native order note attributes</List.Item>
                  </List>
                  {isPro && (
                    <Button
                      tone="critical"
                      variant="plain"
                      onClick={() => {
                        setIsPlanModalOpen(false);
                        setIsCancelModalOpen(true);
                      }}
                    >
                      Downgrade to Free
                    </Button>
                  )}
                </BlockStack>
              </Box>

              {/* Monthly Pro Card */}
              <Box
                padding="400"
                background={isMonthly ? "bg-surface-selected" : "bg-surface-secondary"}
                borderRadius="200"
                borderWidth="025"
                borderColor={isMonthly ? "border-focus" : "border"}
              >
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingSm">
                      Monthly Pro
                    </Text>
                    {isMonthly && <Badge tone="success">Current</Badge>}
                  </InlineStack>
                  <Text as="p" variant="headingLg">
                    $12.99 <Text as="span" variant="bodySm" tone="subdued">/ month</Text>
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Flexible month-to-month billing with 7-day free trial.
                  </Text>
                  <Divider />
                  <List type="bullet">
                    <List.Item>Unlimited active fields</List.Item>
                    <List.Item>Mandatory required validation</List.Item>
                    <List.Item>Dropdown surveys &amp; checkboxes</List.Item>
                    <List.Item>Priority developer support</List.Item>
                  </List>
                  {isMonthly ? (
                    <Button disabled fullWidth>Current Plan</Button>
                  ) : (
                    <Button
                      variant={!isPro ? "primary" : "secondary"}
                      loading={isSubmitting}
                      fullWidth
                      onClick={() => {
                        setIsPlanModalOpen(false);
                        handleUpgrade("monthly");
                      }}
                    >
                      {isAnnual ? "Switch to Monthly ($12.99/mo)" : "Start 7-Day Free Trial"}
                    </Button>
                  )}
                </BlockStack>
              </Box>

              {/* Annual Pro Card */}
              <Box
                padding="400"
                background={isAnnual ? "bg-surface-selected" : "bg-surface-secondary"}
                borderRadius="200"
                borderWidth="025"
                borderColor={isAnnual ? "border-focus" : "border"}
              >
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingSm">
                      Annual Pro
                    </Text>
                    {isAnnual ? (
                      <Badge tone="success">Current</Badge>
                    ) : (
                      <Badge tone="success">Save 35%</Badge>
                    )}
                  </InlineStack>
                  <Text as="p" variant="headingLg">
                    $99.99 <Text as="span" variant="bodySm" tone="subdued">/ year ($8.33/mo)</Text>
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Billed annually ($55.89/year savings). Includes 7-day free trial.
                  </Text>
                  <Divider />
                  <List type="bullet">
                    <List.Item>Unlimited active fields</List.Item>
                    <List.Item>Mandatory required validation</List.Item>
                    <List.Item>Dropdown surveys &amp; checkboxes</List.Item>
                    <List.Item>Priority developer support</List.Item>
                  </List>
                  {isAnnual ? (
                    <Button disabled fullWidth>Current Plan</Button>
                  ) : (
                    <Button
                      variant="primary"
                      loading={isSubmitting}
                      fullWidth
                      onClick={() => {
                        setIsPlanModalOpen(false);
                        handleUpgrade("annual");
                      }}
                    >
                      {isMonthly ? "Upgrade to Annual (Save 35%)" : "Start 7-Day Free Trial"}
                    </Button>
                  )}
                </BlockStack>
              </Box>
            </InlineGrid>

            <Divider />

            {/* Detailed Comparison Table */}
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">
                Detailed Feature Matrix
              </Text>
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
                    PRO (MONTHLY / ANNUAL)
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
