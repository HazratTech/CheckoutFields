import { useState, type FormEvent } from "react";
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
  TextField,
  ProgressBar,
  Icon,
} from "@shopify/polaris";
import {
  ExternalIcon,
  TextBlockIcon,
  ShieldCheckMarkIcon,
  DeliveryIcon,
  PaymentIcon,
  CheckIcon,
  PlusIcon,
  ClipboardIcon,
  LockIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { MONTHLY_PLAN, ANNUAL_PLAN } from "../plans";

async function getAppDetails(admin: any, shopDomain?: string) {
  let isPartnerDev = false;
  let shopId: string | null = null;
  let appHandle = "checkoutfields-4";
  let metafieldTrialUsed = false;

  try {
    const res = await admin.graphql(`
      query {
        shop {
          id
          plan {
            partnerDevelopment
          }
          trialUsed: metafield(namespace: "checkout_fields", key: "trial_used") {
            value
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
    metafieldTrialUsed = data?.data?.shop?.trialUsed?.value === "true";
    if (data?.data?.currentAppInstallation?.app?.handle) {
      appHandle = data.data.currentAppInstallation.app.handle;
    }
  } catch (err) {
    console.error("Failed to query shop details:", err);
  }

  // Backup trial check from local database
  let dbTrialUsed = false;
  if (shopDomain) {
    try {
      const record = await (prisma as any).trialTracker?.findUnique({
        where: { shop: shopDomain },
      });
      dbTrialUsed = Boolean(record?.trialUsed);
    } catch (err) {
      console.error("Failed to check database trial status:", err);
    }
  }

  const hasUsedTrial = Boolean(metafieldTrialUsed || dbTrialUsed);

  return { shopId, isPartnerDev, appHandle, hasUsedTrial };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing, admin } = await authenticate.admin(request);
  const { shopId, appHandle, hasUsedTrial: initialTrialUsed } = await getAppDetails(admin, session.shop);

  let hasProPlan = false;
  let subscriptionId: string | null = null;
  let currentPlanName: string | null = null;
  let isAnnual = false;
  let isMonthly = false;

  try {
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

  const hasUsedTrial = initialTrialUsed || hasProPlan;

  if (shopId) {
    try {
      const metafields: any[] = [
        {
          namespace: "checkout_fields",
          key: "plan",
          type: "single_line_text_field",
          value: hasProPlan ? "pro" : "free",
          ownerId: shopId,
        },
      ];

      if (hasUsedTrial) {
        metafields.push({
          namespace: "checkout_fields",
          key: "trial_used",
          type: "single_line_text_field",
          value: "true",
          ownerId: shopId,
        });
      }

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
          variables: { metafields },
        }
      );
    } catch (err) {
      console.error("Metafield sync error:", err);
    }
  }

  if (hasUsedTrial && session.shop) {
    try {
      await (prisma as any).trialTracker?.upsert({
        where: { shop: session.shop },
        create: { shop: session.shop, trialUsed: true },
        update: { trialUsed: true },
      });
    } catch (err) {
      console.error("Database trial sync error in loader:", err);
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
    hasUsedTrial,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session, admin } = await authenticate.admin(request);
  const { shopId, appHandle, isPartnerDev, hasUsedTrial } = await getAppDetails(admin, session.shop);
  const formData = await request.formData();
  const intent = formData.get("_action");

  const isTestBilling =
    process.env.SHOPIFY_BILLING_TEST === "true" ||
    Boolean(isPartnerDev);

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
          prorate: true,
        });
      }

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

  if (intent === "upgrade" || intent === "switch_plan") {
    try {
      const selectedPlan = formData.get("plan");
      const targetPlan = selectedPlan === "annual" ? ANNUAL_PLAN : MONTHLY_PLAN;
      const cleanShop = session.shop.replace(".myshopify.com", "");
      const trialDaysToGrant = hasUsedTrial ? 0 : 7;

      if (shopId) {
        try {
          await admin.graphql(
            `#graphql
            mutation SetTrialUsedMetafield($metafields: [MetafieldsSetInput!]!) {
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
                    key: "trial_used",
                    type: "single_line_text_field",
                    value: "true",
                    ownerId: shopId,
                  },
                ],
              },
            }
          );
        } catch (e) {
          console.error("Failed to mark trial_used metafield in action:", e);
        }
      }

      if (session.shop) {
        try {
          await (prisma as any).trialTracker?.upsert({
            where: { shop: session.shop },
            create: { shop: session.shop, trialUsed: true },
            update: { trialUsed: true },
          });
        } catch (e) {
          console.error("Failed to mark trial_used in DB:", e);
        }
      }

      return await billing.request({
        plan: targetPlan,
        isTest: isTestBilling,
        trialDays: trialDaysToGrant,
        returnUrl: `https://admin.shopify.com/store/${cleanShop}/apps/${appHandle}`,
      } as any);
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
    feature: "Active Custom Checkout Fields",
    description: "Total number of custom inputs you can place in checkout simultaneously",
    free: "1 field total",
    pro: "Unlimited fields",
  },
  {
    feature: "One-Page Checkout & Thank You Placement",
    description: "Render anywhere in Contact, Delivery, Payment, or Thank You / Order Status sections",
    free: "Supported",
    pro: "Supported",
  },
  {
    feature: "Required Field Blocking Validation",
    description: "Block customer progression until mandatory fields are filled out",
    free: "Optional only",
    pro: "Enforced blocking",
  },
  {
    feature: "Supported Field Types",
    description: "Available field components in the Shopify Checkout Editor",
    free: "Text, Multiline",
    pro: "Text, Multiline, Select Dropdowns, Checkbox Consent, Number, Date Picker",
  },
  {
    feature: "Dropdown Tag & Option Builder",
    description: "Clean individual option slots (Option 1 to 6) without messy comma strings",
    free: "Not available",
    pro: "Full Tag & Option Slot Builder",
  },
  {
    feature: "Character Limit & Live Counter",
    description: "Enforce strict length limits for gift cards, packaging, and engraving",
    free: "Standard input",
    pro: "Live countdown & max character limit",
  },
  {
    feature: "Country / Geo-Targeting Filter",
    description: "Show fields only to customers shipping to specific destination countries",
    free: "All countries",
    pro: "Country-specific targeting (e.g. US, EU, UK)",
  },
  {
    feature: "Trust Badges & Guarantees Extension",
    description: "SSL, Money-Back, and Fast Delivery reassurance in 4 sleek layouts",
    free: "Included Free",
    pro: "Included Free",
  },
  {
    feature: "Free Shipping Progress Bar",
    description: "Real-time cart goal calculation and celebration unlocked banner with dynamic currency",
    free: "Included Free",
    pro: "Included Free",
  },
  {
    feature: "Payment & Courier Trust Badges",
    description: "Visa, Mastercard, Amex, Apple Pay, PayPal, DHL, FedEx, UPS badges with security lock",
    free: "Included Free",
    pro: "Included Free",
  },
  {
    feature: "Native Order Storage (Zero Third-Party DB)",
    description: "Saved in Order Note Attributes under Additional details (No external DB)",
    free: "100% Native",
    pro: "100% Native",
  },
  {
    feature: "Third-Party Shipping & ERP Sync",
    description: "Automatic sync with ShipStation, Klaviyo, warehouse ERPs, and WMS",
    free: "Supported",
    pro: "Supported",
  },
  {
    feature: "Technical Support",
    description: "Direct assistance with checkout setup and field configuration",
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
    placeholder: "Select an option",
    key: "attribution_source",
    badge: "Pro Plan (Dropdown Select)",
    tone: "attention" as const,
    description: "Zero-party attribution survey using custom dropdown choices to measure customer acquisition.",
  },
  {
    title: "Requested Delivery Date",
    type: "date",
    placeholder: "Select your desired delivery date",
    key: "delivery_date",
    badge: "Pro Plan (Date Selection)",
    tone: "attention" as const,
    description: "Allow customers to choose their preferred delivery, shipping, or event date.",
  },
  {
    title: "Custom Engraving / Monogram",
    type: "text",
    placeholder: "Max 30 characters (e.g. A.B.C.)",
    key: "engraving_text",
    badge: "Pro Plan (Character Limit)",
    tone: "attention" as const,
    description: "Collect personalization text with strict character limits and live character counter.",
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
    hasUsedTrial,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const isPro = actionData?.hasProPlan !== undefined ? actionData.hasProPlan : hasProPlan;
  const isAnnual = isPro && (actionData?.currentPlanName ? actionData.currentPlanName === ANNUAL_PLAN : loaderIsAnnual);
  const isMonthly = isPro && (actionData?.currentPlanName ? actionData.currentPlanName === MONTHLY_PLAN : loaderIsMonthly || !loaderIsAnnual);

  const [selectedFeatureTab, setSelectedFeatureTab] = useState(0);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Interactive Dropdown Tag Creator state
  const [tagList, setTagList] = useState<string[]>([
    "Instagram",
    "TikTok",
    "Google Search",
    "Friend / Family",
    "YouTube",
    "Other",
  ]);
  const [newTagInput, setNewTagInput] = useState("");
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // Free shipping simulator state
  const [simulatorGoal, setSimulatorGoal] = useState("100");
  const [simulatorSubtotal, setSimulatorSubtotal] = useState("29");

  const activePreset = PRESETS[selectedPresetIndex];
  const checkoutEditorUrl = `https://${shop}/admin/settings/checkout/editor`;

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !tagList.includes(trimmed)) {
      setTagList([...tagList, trimmed]);
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTagList(tagList.filter((t) => t !== tagToRemove));
  };

  const handleCopyOptions = () => {
    navigator.clipboard.writeText(tagList.join(", "));
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

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

  // Calculations for shipping simulator
  const numGoal = Math.max(1, Number(simulatorGoal) || 100);
  const numSubtotal = Math.max(0, Number(simulatorSubtotal) || 0);
  const simUnlocked = numSubtotal >= numGoal;
  const simRemaining = Math.max(0, numGoal - numSubtotal);
  const simPercent = Math.min(100, Math.round((numSubtotal / numGoal) * 100));

  const featureTabs = [
    { id: "custom-fields", content: "1. Custom Checkout Fields" },
    { id: "trust-badges", content: "2. Trust Badges & Guarantees" },
    { id: "free-shipping", content: "3. Free Shipping Progress Bar" },
    { id: "payment-icons", content: "4. Payment & Courier Badges" },
  ];

  return (
    <Page>
      <TitleBar title="Fieldy: Custom Checkout Fields Dashboard" />
      <BlockStack gap="500">
        {/* Top Status Notification */}
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

        {/* Hero Header */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center" wrap>
              <BlockStack gap="100">
                <InlineStack gap="300" blockAlign="center" wrap>
                  <Text as="h1" variant="headingLg">
                    Fieldy: Custom Checkout Fields &amp; Trust Suite
                  </Text>
                  <Badge tone={isPro ? "success" : "info"}>
                    {isPro
                      ? isAnnual
                        ? "Pro Plan Active (Annual)"
                        : "Pro Plan Active (Monthly)"
                      : "Free Starter Tier"}
                  </Badge>
                  <Badge tone="success">All 4 Checkout Extensions Ready</Badge>
                </InlineStack>
                <Text as="p" tone="subdued">
                  Customize Shopify Checkout with custom note attributes, trust security badges, dynamic free shipping goals, and payment icons.
                </Text>
              </BlockStack>

              <InlineStack gap="200" blockAlign="center" wrap>
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

        {/* 4 Core Features Status Grid */}
        <InlineGrid columns={{ xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" }} gap="300">
          {/* Card 1 */}
          <Box
            background={selectedFeatureTab === 0 ? "bg-surface-selected" : "bg-surface"}
            padding="400"
            borderRadius="200"
            borderWidth="025"
            borderColor={selectedFeatureTab === 0 ? "border-focus" : "border"}
          >
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Icon source={TextBlockIcon} tone="base" />
                <Badge tone="success">Active</Badge>
              </InlineStack>
              <Text as="h2" variant="headingSm">
                Custom Fields &amp; Notes
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Text, multiline notes, dropdowns with option slots, checkbox consent, character counters &amp; date pickers.
              </Text>
              <Button
                size="micro"
                variant={selectedFeatureTab === 0 ? "primary" : "secondary"}
                onClick={() => setSelectedFeatureTab(0)}
              >
                Configure Fields
              </Button>
            </BlockStack>
          </Box>

          {/* Card 2 */}
          <Box
            background={selectedFeatureTab === 1 ? "bg-surface-selected" : "bg-surface"}
            padding="400"
            borderRadius="200"
            borderWidth="025"
            borderColor={selectedFeatureTab === 1 ? "border-focus" : "border"}
          >
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Icon source={ShieldCheckMarkIcon} tone="base" />
                <Badge tone="success">Active</Badge>
              </InlineStack>
              <Text as="h2" variant="headingSm">
                Trust Badges &amp; Guarantees
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                256-Bit SSL, 30-Day Money-Back &amp; Fast Delivery in 4 layouts: Inline Strip, Cards, Grid, and List.
              </Text>
              <Button
                size="micro"
                variant={selectedFeatureTab === 1 ? "primary" : "secondary"}
                onClick={() => setSelectedFeatureTab(1)}
              >
                View Trust Styles
              </Button>
            </BlockStack>
          </Box>

          {/* Card 3 */}
          <Box
            background={selectedFeatureTab === 2 ? "bg-surface-selected" : "bg-surface"}
            padding="400"
            borderRadius="200"
            borderWidth="025"
            borderColor={selectedFeatureTab === 2 ? "border-focus" : "border"}
          >
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Icon source={DeliveryIcon} tone="base" />
                <Badge tone="success">Active</Badge>
              </InlineStack>
              <Text as="h2" variant="headingSm">
                Free Shipping Bar
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Live subtotal tracker, dynamic store currency matching ($), progress meter &amp; unlocked celebration banner.
              </Text>
              <Button
                size="micro"
                variant={selectedFeatureTab === 2 ? "primary" : "secondary"}
                onClick={() => setSelectedFeatureTab(2)}
              >
                Test Shipping Goal
              </Button>
            </BlockStack>
          </Box>

          {/* Card 4 */}
          <Box
            background={selectedFeatureTab === 3 ? "bg-surface-selected" : "bg-surface"}
            padding="400"
            borderRadius="200"
            borderWidth="025"
            borderColor={selectedFeatureTab === 3 ? "border-focus" : "border"}
          >
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Icon source={PaymentIcon} tone="base" />
                <Badge tone="success">Active</Badge>
              </InlineStack>
              <Text as="h2" variant="headingSm">
                Payment &amp; Courier Badges
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Official Visa, Mastercard, Apple Pay, Google Pay, PayPal, DHL &amp; FedEx icons with security lock header.
              </Text>
              <Button
                size="micro"
                variant={selectedFeatureTab === 3 ? "primary" : "secondary"}
                onClick={() => setSelectedFeatureTab(3)}
              >
                View Badges
              </Button>
            </BlockStack>
          </Box>
        </InlineGrid>

        <Layout>
          {/* Main Feature Showcase Area */}
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="400">
                  <Tabs
                    tabs={featureTabs}
                    selected={selectedFeatureTab}
                    onSelect={(index) => setSelectedFeatureTab(index)}
                  />

                  {/* TAB 0: Custom Checkout Fields */}
                  {selectedFeatureTab === 0 && (
                    <BlockStack gap="400">
                      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                        <InlineStack align="space-between" blockAlign="center">
                          <BlockStack gap="050">
                            <Text as="h3" variant="headingSm">
                              Field Type Dropdown &amp; Clean Option Slots
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              In the Checkout Editor, <strong>Field Type</strong> is now a native dropdown (Text, Multiline, Select, Checkbox, Number, Date).
                              For dropdowns, enter choices into clean individual slots (Option 1 to 6) — no weird comma typing needed!
                            </Text>
                          </BlockStack>
                          <Badge tone="info">New in Release v38</Badge>
                        </InlineStack>
                      </Box>

                      {/* Tag-Style Dropdown Option Builder */}
                      <Card>
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="050">
                              <Text as="h3" variant="headingSm">
                                Visual Dropdown Options (Tag Builder)
                              </Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Add choices easily like tags. Press Enter or click "+ Add Option".
                              </Text>
                            </BlockStack>
                            <Button
                              icon={ClipboardIcon}
                              size="slim"
                              onClick={handleCopyOptions}
                            >
                              {copiedFeedback ? "Copied!" : "Copy Choices"}
                            </Button>
                          </InlineStack>

                          {/* Add Tag Input */}
                          <form
                            onSubmit={(e: FormEvent) => {
                              e.preventDefault();
                              handleAddTag();
                            }}
                          >
                            <InlineStack gap="200" blockAlign="center">
                              <Box minWidth="280px">
                                <TextField
                                  label="Option Name"
                                  labelHidden
                                  placeholder="Type an option (e.g. TikTok, Podcast, Size M) and press Enter"
                                  value={newTagInput}
                                  onChange={(val) => setNewTagInput(val)}
                                  autoComplete="off"
                                />
                              </Box>
                              <Button
                                icon={PlusIcon}
                                variant="secondary"
                                submit
                              >
                                Add Option
                              </Button>
                            </InlineStack>
                          </form>

                          {/* Render Tag Chips */}
                          <InlineStack gap="150" wrap>
                            {tagList.map((tag) => (
                              <Tag key={tag} onRemove={() => handleRemoveTag(tag)}>
                                {tag}
                              </Tag>
                            ))}
                            {tagList.length === 0 && (
                              <Text as="p" tone="subdued" variant="bodySm">
                                No options added yet. Type an option above and click Add!
                              </Text>
                            )}
                          </InlineStack>

                          {/* Live Preview of Option Slots in Checkout Editor */}
                          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                            <BlockStack gap="200">
                              <Text as="span" variant="bodySm" fontWeight="semibold">
                                How this maps to the Shopify Checkout Editor:
                              </Text>
                              <InlineGrid columns={{ xs: "1fr", sm: "1fr 1fr" }} gap="200">
                                {tagList.slice(0, 6).map((opt, i) => (
                                  <Text key={i} as="p" variant="bodySm" tone="subdued">
                                    <strong>Option {i + 1}:</strong> {opt}
                                  </Text>
                                ))}
                                {tagList.length > 6 && (
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    <strong>Bulk / Paste field:</strong> +{tagList.length - 6} additional choices supported
                                  </Text>
                                )}
                              </InlineGrid>
                            </BlockStack>
                          </Box>
                        </BlockStack>
                      </Card>

                      {/* Ready-to-Use Presets */}
                      <BlockStack gap="300">
                        <Text as="h3" variant="headingSm">
                          Ready-to-Use Field Presets
                        </Text>
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
                              <Text as="h4" variant="headingSm">
                                {activePreset.title}
                              </Text>
                              <Badge tone={activePreset.tone}>{activePreset.badge}</Badge>
                            </InlineStack>
                            <Text as="p">{activePreset.description}</Text>
                            <Divider />
                            <InlineStack gap="400" wrap>
                              <Text as="p" tone="subdued">
                                <strong>Field Type:</strong> {activePreset.type}
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
                    </BlockStack>
                  )}

                  {/* TAB 1: Trust Badges & Guarantees */}
                  {selectedFeatureTab === 1 && (
                    <BlockStack gap="400">
                      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                        <BlockStack gap="100">
                          <Text as="h3" variant="headingSm">
                            Fieldy: Trust Badges &amp; Guarantees
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Boost buyer confidence and reduce abandoned checkouts with built-in security badges and guarantees.
                          </Text>
                        </BlockStack>
                      </Box>

                      {/* Layout Previews */}
                      <BlockStack gap="300">
                        <Text as="h3" variant="headingSm">
                          4 Native Layout Styles:
                        </Text>

                        {/* Style 1: Inline Security Strip */}
                        <Card>
                          <BlockStack gap="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="h4" variant="headingSm">
                                1. Inline Security Strip (Default - Most Popular)
                              </Text>
                              <Badge tone="success">Recommended</Badge>
                            </InlineStack>
                            <Text as="p" variant="bodySm" tone="subdued">
                              A sleek, compact single-line reassurance bar with bullet separators. Fits seamlessly under the "Pay now" button.
                            </Text>
                            <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                              <InlineStack gap="300" align="center" blockAlign="center">
                                <Text as="span" variant="bodySm" fontWeight="semibold">
                                  🔒 256-Bit SSL Secure
                                </Text>
                                <Text as="span" tone="subdued">•</Text>
                                <Text as="span" variant="bodySm" fontWeight="semibold">
                                  🔄 30-Day Money-Back
                                </Text>
                                <Text as="span" tone="subdued">•</Text>
                                <Text as="span" variant="bodySm" fontWeight="semibold">
                                  🚚 Fast Delivery
                                </Text>
                              </InlineStack>
                            </Box>
                          </BlockStack>
                        </Card>

                        {/* Style 2: 3-Column Card */}
                        <Card>
                          <BlockStack gap="200">
                            <Text as="h4" variant="headingSm">
                              2. 3-Column Card Layout
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Dedicated columns with headlines and explanatory subtitles for high-value merchandise.
                            </Text>
                            <InlineGrid columns="1fr 1fr 1fr" gap="200">
                              <Box padding="200" background="bg-surface-secondary" borderRadius="100">
                                <BlockStack gap="050" align="center">
                                  <Text as="p" variant="bodySm" fontWeight="semibold">🔒 256-Bit SSL</Text>
                                  <Text as="p" variant="bodyXs" tone="subdued">Bank-Grade Encryption</Text>
                                </BlockStack>
                              </Box>
                              <Box padding="200" background="bg-surface-secondary" borderRadius="100">
                                <BlockStack gap="050" align="center">
                                  <Text as="p" variant="bodySm" fontWeight="semibold">🔄 30-Day Returns</Text>
                                  <Text as="p" variant="bodyXs" tone="subdued">Hassle-Free Refunds</Text>
                                </BlockStack>
                              </Box>
                              <Box padding="200" background="bg-surface-secondary" borderRadius="100">
                                <BlockStack gap="050" align="center">
                                  <Text as="p" variant="bodySm" fontWeight="semibold">🚚 Fast Delivery</Text>
                                  <Text as="p" variant="bodyXs" tone="subdued">Tracked &amp; Insured</Text>
                                </BlockStack>
                              </Box>
                            </InlineGrid>
                          </BlockStack>
                        </Card>

                        {/* Style 3 & 4 */}
                        <InlineGrid columns={{ xs: "1fr", sm: "1fr 1fr" }} gap="200">
                          <Card>
                            <BlockStack gap="100">
                              <Text as="h4" variant="headingSm">3. Clean Grid</Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Balanced multi-column display ideal for the Order Summary section.
                              </Text>
                            </BlockStack>
                          </Card>
                          <Card>
                            <BlockStack gap="100">
                              <Text as="h4" variant="headingSm">4. Vertical List</Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Stacked layout with bullet icons for sidebars and mobile screens.
                              </Text>
                            </BlockStack>
                          </Card>
                        </InlineGrid>
                      </BlockStack>
                    </BlockStack>
                  )}

                  {/* TAB 2: Free Shipping Progress Bar */}
                  {selectedFeatureTab === 2 && (
                    <BlockStack gap="400">
                      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                        <BlockStack gap="100">
                          <Text as="h3" variant="headingSm">
                            Fieldy: Free Shipping Bar (AOV Booster)
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Motivate buyers to add more items to qualify for free shipping. Dynamically syncs with your store's live cart subtotal and active currency settings.
                          </Text>
                        </BlockStack>
                      </Box>

                      {/* Interactive Simulator */}
                      <Card>
                        <BlockStack gap="300">
                          <Text as="h3" variant="headingSm">
                            Live Progress &amp; Banner Simulator
                          </Text>
                          <InlineGrid columns={{ xs: "1fr", sm: "1fr 1fr" }} gap="300">
                            <TextField
                              label="Free Shipping Goal Amount ($)"
                              type="number"
                              value={simulatorGoal}
                              onChange={(v) => setSimulatorGoal(v)}
                              autoComplete="off"
                            />
                            <TextField
                              label="Current Cart Subtotal ($)"
                              type="number"
                              value={simulatorSubtotal}
                              onChange={(v) => setSimulatorSubtotal(v)}
                              autoComplete="off"
                            />
                          </InlineGrid>

                          {/* Live Simulation Banner */}
                          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                            {simUnlocked ? (
                              <Banner tone="success" title="🎉 Congratulations! You've unlocked FREE Shipping!">
                                <p>Free shipping has been automatically applied to your checkout!</p>
                              </Banner>
                            ) : (
                              <Banner
                                tone="info"
                                title={`You're only $${simRemaining.toFixed(2)} away from FREE Shipping!`}
                              >
                                <BlockStack gap="200">
                                  <ProgressBar progress={simPercent} size="small" tone="primary" />
                                  <InlineStack align="space-between">
                                    <Text as="span" variant="bodySm" tone="subdued">
                                      ${numSubtotal.toFixed(2)} of ${numGoal.toFixed(2)} ({simPercent}%)
                                    </Text>
                                    <Text as="span" variant="bodySm" tone="subdued">
                                      Add ${simRemaining.toFixed(2)} to qualify
                                    </Text>
                                  </InlineStack>
                                </BlockStack>
                              </Banner>
                            )}
                          </Box>

                          <InlineStack gap="200" blockAlign="center">
                            <Badge tone="success">Dynamic Currency Formatting</Badge>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Uses native <code>shopify.i18n.formatCurrency()</code> to automatically match your store's symbol ($71.00) and Shopify Markets currencies.
                            </Text>
                          </InlineStack>
                        </BlockStack>
                      </Card>
                    </BlockStack>
                  )}

                  {/* TAB 3: Payment & Courier Badges */}
                  {selectedFeatureTab === 3 && (
                    <BlockStack gap="400">
                      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                        <BlockStack gap="100">
                          <Text as="h3" variant="headingSm">
                            Fieldy: Payment &amp; Courier Badges
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Display trusted payment methods and carrier logos at checkout with clean SVG icons and a security lock header.
                          </Text>
                        </BlockStack>
                      </Box>

                      {/* Badges Grid */}
                      <Card>
                        <BlockStack gap="300">
                          <InlineStack gap="200" blockAlign="center">
                            <Icon source={LockIcon} tone="base" />
                            <Text as="h3" variant="headingSm">
                              Guaranteed Safe &amp; Secure Checkout
                            </Text>
                          </InlineStack>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Includes official icons for all major credit cards, digital wallets, and courier shipping partners:
                          </Text>

                          <InlineGrid columns={{ xs: "1fr 1fr", sm: "1fr 1fr 1fr", md: "1fr 1fr 1fr 1fr" }} gap="200">
                            {[
                              "Visa",
                              "Mastercard",
                              "American Express",
                              "Apple Pay",
                              "Google Pay",
                              "PayPal",
                              "Shop Pay",
                              "Discover",
                              "DHL Express",
                              "FedEx",
                              "UPS",
                              "USPS",
                            ].map((badge) => (
                              <Box key={badge} padding="200" background="bg-surface-secondary" borderRadius="100">
                                <InlineStack gap="150" align="center" blockAlign="center">
                                  <Icon source={CheckIcon} tone="success" />
                                  <Text as="span" variant="bodySm" fontWeight="semibold">
                                    {badge}
                                  </Text>
                                </InlineStack>
                              </Box>
                            ))}
                          </InlineGrid>

                          <Divider />
                          <InlineStack align="space-between" blockAlign="center" wrap>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Customizable: Configure between 2 to 8 badges per row (default 6).
                            </Text>
                            <Button
                              variant="plain"
                              icon={ExternalIcon}
                              url={checkoutEditorUrl}
                              target="_blank"
                            >
                              Open in Checkout Editor
                            </Button>
                          </InlineStack>
                        </BlockStack>
                      </Card>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

              {/* Native Storage Guarantee Card */}
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
                                ? "Annual Pro Plan ($39.99 / year)"
                                : "Monthly Pro Plan ($4.99 / month)"}
                            </Text>
                            <Badge tone="success">Active</Badge>
                          </InlineStack>
                          <Text as="p" variant="bodySm">
                            Unlimited fields, dropdown options &amp; required blocking validation are active on your store.
                          </Text>
                        </BlockStack>
                      </Banner>

                      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                        <BlockStack gap="200">
                          <Text as="p" variant="bodySm" fontWeight="semibold">
                            {isAnnual ? "Need Monthly Billing?" : "Upgrade to Annual & Save 33%"}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {isAnnual
                              ? "Switch to flexible monthly billing at $4.99 / month."
                              : "Switch to Annual billing at $39.99 / year ($3.33/mo) and save $19.89 each year."}
                          </Text>
                          <Button
                            variant="secondary"
                            loading={isSubmitting}
                            onClick={() => handleSwitchPlan(isAnnual ? "monthly" : "annual")}
                          >
                            {isAnnual
                              ? "Switch to Monthly ($4.99/mo)"
                              : "Switch to Annual ($39.99/yr — Save 33%)"}
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
                          1 checkout field included. Upgrade to enable unlimited fields, dropdown options, and required blocking validation.
                        </Text>
                      </Banner>

                      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                        <BlockStack gap="200">
                          <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="050">
                              <Text as="span" fontWeight="semibold">
                                Annual Pro Plan
                              </Text>
                              <Text as="span" variant="bodySm" tone="subdued">
                                $39.99 / year ($3.33/mo) • Save 33%
                              </Text>
                            </BlockStack>
                            <Badge tone="success">Best Value</Badge>
                          </InlineStack>
                          <Button
                            variant="primary"
                            loading={isSubmitting}
                            onClick={() => handleUpgrade("annual")}
                          >
                            {hasUsedTrial ? "Upgrade to Annual ($39.99/yr)" : "Start 7-Day Free Trial (Annual)"}
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
                              $4.99 / month • Flexible monthly billing
                            </Text>
                          </BlockStack>
                          <Button
                            loading={isSubmitting}
                            onClick={() => handleUpgrade("monthly")}
                          >
                            {hasUsedTrial ? "Upgrade to Monthly ($4.99/mo)" : "Start 7-Day Free Trial (Monthly)"}
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

              {/* How to Position Blocks in Checkout */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    How to Position Blocks
                  </Text>
                  <Text as="p" tone="subdued">
                    Shopify Checkout is modular. You drag and place blocks visually:
                  </Text>
                  <List type="number">
                    <List.Item>
                      Click <strong>"Open Checkout Editor"</strong> above.
                    </List.Item>
                    <List.Item>
                      In the left sidebar, click <strong>"+ Add block"</strong>.
                    </List.Item>
                    <List.Item>
                      Select any of the 4 Fieldy blocks:
                      <List type="bullet">
                        <List.Item><strong>Fieldy: Custom Field &amp; Note</strong></List.Item>
                        <List.Item><strong>Fieldy: Trust Badges &amp; Guarantees</strong></List.Item>
                        <List.Item><strong>Fieldy: Free Shipping Bar</strong></List.Item>
                        <List.Item><strong>Fieldy: Payment &amp; Courier Badges</strong></List.Item>
                      </List>
                    </List.Item>
                    <List.Item>
                      Drag to your preferred section (Contact, Delivery, Payment, or Order Summary) and configure settings.
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
                    Checkout blocks are available across all checkout steps on Shopify Plus, and on Thank You &amp; Order Status pages for standard Shopify plans.
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
        title="Fieldy Plans &amp; Pricing"
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
            <InlineGrid columns={{ xs: "1fr", sm: "1fr 1fr 1fr" }} gap="300">
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
                    <List.Item>Textbox &amp; multiline inputs</List.Item>
                    <List.Item>All 3 trust, shipping &amp; payment extensions</List.Item>
                    <List.Item>Native One-Page Checkout integration</List.Item>
                    <List.Item>Native Order Note Attributes (No external DB)</List.Item>
                    <List.Item>No watermark / zero app branding</List.Item>
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
                    $4.99 <Text as="span" variant="bodySm" tone="subdued">/ month</Text>
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {hasUsedTrial
                      ? "Flexible month-to-month billing."
                      : "Flexible month-to-month billing with 7-day free trial."}
                  </Text>
                  <Divider />
                  <List type="bullet">
                    <List.Item>Everything in Free Plan</List.Item>
                    <List.Item>Unlimited active checkout fields</List.Item>
                    <List.Item>Mandatory required blocking validation</List.Item>
                    <List.Item>Dropdown surveys with option slots</List.Item>
                    <List.Item>Terms &amp; conditions consent checkbox</List.Item>
                    <List.Item>Number &amp; delivery date pickers</List.Item>
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
                      {isAnnual
                        ? "Switch to Monthly ($4.99/mo)"
                        : hasUsedTrial
                        ? "Upgrade to Monthly ($4.99/mo)"
                        : "Start 7-Day Free Trial"}
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
                      <Badge tone="success">Save 33%</Badge>
                    )}
                  </InlineStack>
                  <Text as="p" variant="headingLg">
                    $39.99 <Text as="span" variant="bodySm" tone="subdued">/ year ($3.33/mo)</Text>
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {hasUsedTrial
                      ? "Billed annually ($19.89/year savings)."
                      : "Billed annually ($19.89/year savings). Includes 7-day free trial."}
                  </Text>
                  <Divider />
                  <List type="bullet">
                    <List.Item>Everything in Monthly Pro Plan</List.Item>
                    <List.Item>Billed annually ($19.89/yr savings)</List.Item>
                    <List.Item>Lowest monthly rate ($3.33/mo)</List.Item>
                    <List.Item>Unlimited active checkout fields</List.Item>
                    <List.Item>Mandatory required blocking validation</List.Item>
                    <List.Item>Dropdown surveys &amp; checkboxes</List.Item>
                    <List.Item>Priority setup &amp; developer support</List.Item>
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
                      {isMonthly
                        ? "Upgrade to Annual (Save 33%)"
                        : hasUsedTrial
                        ? "Upgrade to Annual ($39.99/yr)"
                        : "Start 7-Day Free Trial"}
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
