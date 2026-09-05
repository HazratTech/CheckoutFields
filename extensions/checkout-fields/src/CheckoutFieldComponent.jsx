import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useApi,
  useSettings,
  useSubscription,
  BlockStack,
  TextField,
  Select,
  Checkbox,
  Text,
  Banner,
} from '@shopify/ui-extensions-react/checkout';

function sanitizeKey(key, fallback) {
  if (key && typeof key === 'string' && key.trim().length > 0) {
    return key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }
  if (fallback && typeof fallback === 'string') {
    return fallback.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }
  return 'checkout_custom_field';
}

export function CheckoutFieldComponent({ surface = 'checkout' }) {
  const api = useApi();
  const settings = useSettings();

  // Safely check capabilities from api
  const hasAttributes = Boolean(api && 'attributes' in api && api.attributes);
  const existingAttributes = hasAttributes ? useSubscription(api.attributes) : [];
  const applyAttributeChange = (api && 'applyAttributeChange' in api) ? api.applyAttributeChange : null;

  // Settings from Checkout Editor
  const title = String(settings?.field_title || 'Gift Message');
  const rawType = String(settings?.field_type || 'text').toLowerCase().trim();
  const placeholder = settings?.field_placeholder ? String(settings.field_placeholder) : '';
  const helpText = settings?.field_help_text ? String(settings.field_help_text) : '';
  const rawOptions = settings?.select_options ? String(settings.select_options) : '';

  // Determine attribute key
  const attributeKey = useMemo(() => {
    return sanitizeKey(settings?.attribute_key, title);
  }, [settings?.attribute_key, title]);

  // Find existing attribute value if already saved
  const initialValue = useMemo(() => {
    if (!existingAttributes || !Array.isArray(existingAttributes)) return '';
    const found = existingAttributes.find((attr) => attr.key === attributeKey);
    return found && found.value ? String(found.value) : '';
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

  // Parse select options
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

  // Save changes
  const handleValueChange = useCallback(
    async (newValue) => {
      const valStr = String(newValue ?? '');
      setValue(valStr);
      setError('');

      if (typeof applyAttributeChange === 'function') {
        try {
          const result = await applyAttributeChange({
            type: 'updateAttribute',
            key: attributeKey,
            value: valStr,
          });

          if (result && result.type === 'error') {
            setError(result.message || 'Unable to save field value.');
            setSavedSuccess(false);
          } else {
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 3000);
          }
        } catch (err) {
          console.error('Failed to update attribute:', err);
        }
      } else {
        // Post-purchase: attribute changes not applicable
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    },
    [applyAttributeChange, attributeKey]
  );

  return (
    <BlockStack spacing="tight">
      {rawType === 'checkbox' ? (
        <Checkbox
          id={attributeKey}
          name={attributeKey}
          checked={value === 'true'}
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
          onChange={(newVal) => handleValueChange(newVal)}
          onInput={(newVal) => setValue(newVal)}
          error={error}
        />
      ) : rawType === 'number' ? (
        <TextField
          label={title}
          type="number"
          value={value}
          onChange={(newVal) => handleValueChange(newVal)}
          onInput={(newVal) => setValue(newVal)}
          error={error}
        />
      ) : (
        <TextField
          label={title}
          value={value}
          onChange={(newVal) => handleValueChange(newVal)}
          onInput={(newVal) => setValue(newVal)}
          error={error}
        />
      )}

      {(helpText || placeholder) && !error ? (
        <Text size="small" appearance="subdued">
          {helpText || placeholder}
        </Text>
      ) : null}

      {savedSuccess && surface !== 'checkout' ? (
        <Banner status="success">
          Details saved to your order!
        </Banner>
      ) : null}
    </BlockStack>
  );
}
