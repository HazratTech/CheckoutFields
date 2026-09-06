import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy - CheckoutFields" },
    { name: "description", content: "Privacy Policy for CheckoutFields Shopify App" },
  ];
};

export default function Privacy() {
  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      backgroundColor: "#0B0F19",
      color: "#E2E8F0",
      minHeight: "100vh",
      padding: "60px 20px",
      lineHeight: 1.7,
    }}>
      <div style={{
        maxWidth: "800px",
        margin: "0 auto",
        backgroundColor: "#111827",
        padding: "48px",
        borderRadius: "16px",
        border: "1px solid #1F2937",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
      }}>
        <div style={{ marginBottom: "32px", borderBottom: "1px solid #1F2937", paddingBottom: "24px" }}>
          <Link to="/" style={{ color: "#10B981", textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>
            &larr; Back to CheckoutFields
          </Link>
          <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#FFFFFF", marginTop: "16px", marginBottom: "8px" }}>
            Privacy Policy
          </h1>
          <p style={{ color: "#94A3B8", fontSize: "14px" }}>
            Last updated: September 2026
          </p>
        </div>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F8FAFC", marginBottom: "12px" }}>
            1. Overview
          </h2>
          <p style={{ color: "#CBD5E1", marginBottom: "12px" }}>
            CheckoutFields ("we", "our", or "the App") is committed to protecting the privacy of merchants and their customers. This Privacy Policy describes how we collect, use, and handle information when you install or use the App in connection with your Shopify-supported store.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F8FAFC", marginBottom: "12px" }}>
            2. Information We Collect
          </h2>
          <p style={{ color: "#CBD5E1", marginBottom: "12px" }}>
            When you install the App, we automatically access certain types of information from your Shopify account:
          </p>
          <ul style={{ color: "#CBD5E1", paddingLeft: "24px", marginBottom: "12px" }}>
            <li style={{ marginBottom: "8px" }}>
              <strong>Merchant Information:</strong> Store domain, shop ID, and primary contact email address, strictly to manage your subscription, settings, and authentication.
            </li>
            <li style={{ marginBottom: "8px" }}>
              <strong>Order Note Attributes:</strong> Custom field inputs entered by your customers during checkout (such as delivery instructions, gift messages, or date selections) are saved directly into your Shopify store's native order record via standard Shopify Note Attributes.
            </li>
          </ul>
          <p style={{ color: "#CBD5E1" }}>
            <strong>No External Customer Database:</strong> CheckoutFields does not store customer personal identifiable information (PII) on external proprietary databases. All custom checkout input data lives 100% natively within your Shopify store.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F8FAFC", marginBottom: "12px" }}>
            3. How We Use Information
          </h2>
          <p style={{ color: "#CBD5E1", marginBottom: "12px" }}>
            We use the information collected solely to:
          </p>
          <ul style={{ color: "#CBD5E1", paddingLeft: "24px" }}>
            <li style={{ marginBottom: "8px" }}>Provide the checkout extensibility fields and validate customer inputs.</li>
            <li style={{ marginBottom: "8px" }}>Verify your plan subscription status with Shopify Billing.</li>
            <li style={{ marginBottom: "8px" }}>Provide customer support and resolve technical inquiries.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F8FAFC", marginBottom: "12px" }}>
            4. Data Sharing & Third Parties
          </h2>
          <p style={{ color: "#CBD5E1" }}>
            We do not sell, rent, trade, or share any merchant or customer data with third parties or advertising networks. Information is processed strictly through the Shopify platform infrastructure.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F8FAFC", marginBottom: "12px" }}>
            5. Data Retention & Deletion (GDPR / CCPA Compliance)
          </h2>
          <p style={{ color: "#CBD5E1", marginBottom: "12px" }}>
            When you uninstall the App, our access to your store is immediately terminated by Shopify. Upon receipt of mandatory Shopify privacy webhooks (customers/redact, shop/redact, customers/data_request), any associated session records are deleted immediately.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F8FAFC", marginBottom: "12px" }}>
            6. Contact Us
          </h2>
          <p style={{ color: "#CBD5E1" }}>
            If you have questions about this Privacy Policy or our practices, please contact us at:{" "}
            <a href="mailto:support@relayworks.dev" style={{ color: "#10B981", textDecoration: "underline" }}>
              support@relayworks.dev
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
