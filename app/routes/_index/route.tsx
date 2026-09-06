import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.heading}>Fieldy Custom Checkout Fields</h1>
          <p className={styles.text}>
            Add customizable gift notes, delivery instructions, tax IDs, and surveys directly into your Shopify One-Page Checkout.
          </p>
        </header>

        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span className={styles.labelTitle}>Log in or Install with your store</span>
              <div className={styles.inputGroup}>
                <input
                  className={styles.input}
                  type="text"
                  name="shop"
                  placeholder="your-store.myshopify.com"
                  required
                />
                <button className={styles.button} type="submit">
                  Log in
                </button>
              </div>
              <span className={styles.hint}>e.g., store-name.myshopify.com</span>
            </label>
          </Form>
        )}

        <div className={styles.grid}>
          <div className={styles.featureCard}>
            <h3>Native Checkout Extension</h3>
            <p>
              Built on Shopify's official Checkout UI Extensibility. Seamlessly drag-and-drop fields anywhere in the Checkout Editor.
            </p>
          </div>

          <div className={styles.featureCard}>
            <h3>100% Native Shopify Storage</h3>
            <p>
              Customer input is saved directly to Order Note Attributes. Zero external databases, fully compatible with fulfillment apps.
            </p>
          </div>

          <div className={styles.featureCard}>
            <h3>Required Field Validation</h3>
            <p>
              Block checkout progression until mandatory fields (such as VAT numbers or terms checkboxes) are completed.
            </p>
          </div>
        </div>

        <footer className={styles.footer}>
          <p>CheckoutFields &bull; Built for Shopify One-Page Checkout</p>
        </footer>
      </div>
    </div>
  );
}
