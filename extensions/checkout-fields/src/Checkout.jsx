import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  reactExtension,
  useSettings,
  useApplyAttributeChange,
  useAttributes,
  useBuyerJourneyIntercept,
  BlockStack,
  TextField,
  Select,
  Checkbox,
  Text,
  Banner,
} from '@shopify/ui-extensions-react/checkout';

// Target 1: Core Checkout (Plus stores)
export default reactExtension(
  'purchase.checkout.block.render',
  () => <CheckoutFieldExtension isCheckoutStep={true} />
);

// Target 2: Thank You page (All plans: Basic, Shopify, Advanced, Plus)
export const thankYouBlock = reactExtension(
  'purchase.thank-you.block.render',
  () => <CheckoutFieldExtension isCheckoutStep={false} />
);

// Target 3: Order Status page (All plans)
export const orderStatusBlock = reactExtension(
  'customer-account.order-status.block.render',
  () => <CheckoutFieldExtension isCheckoutStep={false} />
);

function sanitizeKey(key, fallback) {
  if (key && typeof key === 'string' && key.trim().length > 0) {
    return key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }
  if (fallback && typeof fallback === 'string') {
    return fallback.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }
  return 'checkout_custom_field';
}

function CheckoutFieldExtension({ isCheckoutStep }) {
  const settings = useSettings();
  const applyAttributeChange = useApplyAttributeChange();
  const existingAttributes = useAttributes();

  // Settings from Checkout Editor
  const title = settings?.field_title || 'Additional Information';
  const rawType = (settings?.field_type || 'text').toLowerCase().trim();
  const placeholder = settings?.field_placeholder || 'Enter details here...';
  const helpText = settings?.field_help_text || '';
  const isRequired = Boolean(settings?.field_required);
  const rawOptions = settings?.select_options || '';

  // Determine attribute key
  const attributeKey = useMemo(() => {
    return sanitizeKey(settings?.attribute_key, title);
  }, [settings?.attribute_key, title]);

  // Find existing attribute value if already saved
  const initialValue = useMemo(() => {
    const found = existingAttributes?.find((attr) => attr.key === attributeKey);
    return found ? found.value : '';
  }, [existingAttributes, attributeKey]);

  const [value, setValue] = useState(initialValue || '');
  const [error, setError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if attribute changes externally
  useEffect(() => {
    if (initialValue && initialValue !== value) {
      setValue(initialValue);
    }
  }, [initialValue]);

  // Parse select options (handles comma-separated and newline-separated values)
  const selectOptions = useMemo(() => {
    if (!rawOptions) return [{ value: '', label: '-- Select an option --' }];
    const items = rawOptions
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    return [
      { value: '', label: '-- Select an option --' },
      ...items.map((item) => ({ value: item, label: item })),
    ];
  }, [rawOptions]);

  // Save changes to Order / Cart attributes
  const handleValueChange = useCallback(
    async (newValue) => {
      setValue(newValue);
      setError('');

      const result = await applyAttributeChange({
        type: 'updateAttribute',
        key: attributeKey,
        value: String(newValue),
      });

      if (result.type === 'error') {
        setError(result.message || 'Unable to save field value.');
        setSavedSuccess(false);
      } else {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    },
    [applyAttributeChange, attributeKey]
  );

  // Block progression during checkout if field is required and blank
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (!isCheckoutStep || !canBlockProgress || !isRequired) {
      return { behavior: 'allow' };
    }

    const isEmpty =
      value === undefined ||
      value === null ||
      String(value).trim() === '' ||
      value === false;

    if (isEmpty) {
      setError(`${title} is required.`);
      return {
        behavior: 'block',
        reason: `${title} is required.`,
        errors: [
          {
            message: `Please complete "${title}" to continue.`,
          },
        ],
      };
    }

    setError('');
    return { behavior: 'allow' };
  });

  return (
    <BlockStack spacing="tight">
      {rawType === 'checkbox' ? (
        <Checkbox
          id={attributeKey}
          name={attributeKey}
          checked={value === 'true' || value === true}
          onChange={(newChecked) => handleValueChange(newChecked ? 'true' : 'false')}
        >
          {title}
        </Checkbox>
      ) : rawType === 'select' ? (
        <Select
          label={title}
          value={value}
          options={selectOptions}
          onChange={(newVal) => handleValueChange(newVal)}
          error={error}
        />
      ) : rawType === 'multiline' ? (
        <TextField
          label={title}
          value={value}
          multiline={3}
          placeholder={placeholder}
          onChange={(newVal) => handleValueChange(newVal)}
          error={error}
        />
      ) : rawType === 'number' ? (
        <TextField
          label={title}
          type="number"
          value={value}
          placeholder={placeholder}
          onChange={(newVal) => handleValueChange(newVal)}
          error={error}
        />
      ) : (
        <TextField
          label={title}
          value={value}
          placeholder={placeholder}
          onChange={(newVal) => handleValueChange(newVal)}
          error={error}
        />
      )}

      {helpText && !error ? (
        <Text size="small" appearance="subdued">
          {helpText}
        </Text>
      ) : null}

      {!isCheckoutStep && savedSuccess ? (
        <Banner status="success">
          Details saved to your order!
        </Banner>
      ) : null}
    </BlockStack>
  );
}
