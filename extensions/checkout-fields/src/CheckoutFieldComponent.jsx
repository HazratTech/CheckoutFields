import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useSettings,
  useApplyAttributeChange,
  useAttributeValues,
  useBuyerJourneyIntercept,
  useAppMetafields,
  useExtensionEditor,
  BlockStack,
  TextField,
  Select,
  Checkbox,
  Text,
  Banner,
} from '@shopify/ui-extensions-react/checkout';

// Module-level registry tracking all CheckoutFields blocks rendered on the current checkout page
let instanceRegistry = [];
const registryListeners = new Set();

function registerInstance(id) {
  if (!instanceRegistry.includes(id)) {
    instanceRegistry.push(id);
    registryListeners.forEach((fn) => fn());
  }
}

function unregisterInstance(id) {
  instanceRegistry = instanceRegistry.filter((item) => item !== id);
  registryListeners.forEach((fn) => fn());
}

function getInstanceIndex(id) {
  return instanceRegistry.indexOf(id);
}

export function CheckoutFieldComponent({ surface = 'checkout' }) {
  const settings = useSettings();
  const applyAttributeChange = useApplyAttributeChange();
  const appMetafields = useAppMetafields() || [];
  const editor = useExtensionEditor();
  const isEditor = Boolean(editor);

  // Stable identifier for this component instance
  const [instanceId] = useState(() => Math.random().toString(36).substring(2, 11));
  const [instanceIndex, setInstanceIndex] = useState(() => getInstanceIndex(instanceId));

  useEffect(() => {
    registerInstance(instanceId);
    setInstanceIndex(getInstanceIndex(instanceId));

    const onRegistryChange = () => {
      setInstanceIndex(getInstanceIndex(instanceId));
    };
    registryListeners.add(onRegistryChange);

    return () => {
      registryListeners.delete(onRegistryChange);
      unregisterInstance(instanceId);
    };
  }, [instanceId]);

  // Subscription plan check: Strictly requires shop metafield checkout_fields.plan === 'pro'
  const planEntry = appMetafields.find(
    (m) =>
      (m.metafield?.namespace === 'checkout_fields' && m.metafield?.key === 'plan') ||
      (m.namespace === 'checkout_fields' && m.key === 'plan')
  );
  const rawPlanValue = planEntry?.metafield?.value ?? planEntry?.value;
  const isProStore = String(rawPlanValue || '').toLowerCase().trim() === 'pro';

  // Free Starter plan allows exactly 1 active field (index 0). Blocks at index >= 1 exceed the limit.
  const isOverFieldLimit = !isProStore && instanceIndex > 0;

  // Settings from Checkout Editor
  const title = String(settings?.field_title || 'Custom Field');
  const rawType = String(settings?.field_type || 'text').toLowerCase().trim();
  const placeholder = settings?.field_placeholder ? String(settings.field_placeholder) : '';
  const helpText = settings?.field_help_text ? String(settings.field_help_text) : '';
  const rawOptions = settings?.select_options ? String(settings.select_options) : '';
  const isRequired = Boolean(
    settings?.field_required === true || settings?.field_required === 'true'
  );

  // Field Type Gating:
  // Free Starter: text, multiline
  // Pro Plan: select (dropdown surveys), checkbox (legal consent), number
  const isProFieldType = rawType === 'select' || rawType === 'checkbox' || rawType === 'number';
  const isGatedFieldType = !isProStore && isProFieldType;
  // Fallback for gated types on Free tier: multiline stays multiline, otherwise single-line text
  const effectiveType = isGatedFieldType ? (rawType === 'multiline' ? 'multiline' : 'text') : rawType;

  // Required Field Gating:
  // Blocking validation is strictly gated to the Pro Plan
  const canEnforceRequired = isProStore && isRequired;

  // Determine attribute key
  const attributeKey = useMemo(() => {
    const key = settings?.attribute_key;
    if (key && typeof key === 'string' && key.trim().length > 0) {
      return key.trim();
    }
    // Fallback: derive from title
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }, [settings?.attribute_key, title]);

  // Pre-populate value from existing order attributes if returning to this step
  const [savedAttributeValue] = useAttributeValues([attributeKey]);
  const [value, setValue] = useState(savedAttributeValue ?? '');
  const [validationError, setValidationError] = useState('');

  // Sync value if saved attribute loads asynchronously or on page refresh
  useEffect(() => {
    if (savedAttributeValue !== undefined && savedAttributeValue !== null) {
      setValue((curr) => (curr === '' ? savedAttributeValue : curr));
    }
  }, [savedAttributeValue]);

  // Intercept checkout navigation if required field is empty (Pro Plan only)
  useBuyerJourneyIntercept(
    useCallback(
      ({ canBlockProgress }) => {
        if (!canBlockProgress || !canEnforceRequired) {
          return {
            behavior: 'allow',
            perform: () => {
              setValidationError('');
            },
          };
        }

        const trimmed = (value ?? '').trim();
        const isInvalid =
          effectiveType === 'checkbox' ? value !== 'true' : trimmed.length === 0;

        if (isInvalid) {
          const message = `${title} is required`;
          return {
            behavior: 'block',
            reason: message,
            errors: [
              {
                message,
              },
            ],
            perform: (result) => {
              if (result.behavior === 'block') {
                setValidationError(message);
              }
            },
          };
        }

        return {
          behavior: 'allow',
          perform: () => {
            setValidationError('');
          },
        };
      },
      [canEnforceRequired, value, effectiveType, title]
    )
  );

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

  // Save value to order attributes
  const handleChange = useCallback(
    async (newValue) => {
      const valStr = String(newValue ?? '');
      setValue(valStr);

      // Clear error immediately if user entered valid input
      const isValid =
        effectiveType === 'checkbox' ? valStr === 'true' : valStr.trim().length > 0;
      if (isValid) {
        setValidationError('');
      }

      try {
        await applyAttributeChange({
          type: 'updateAttribute',
          key: attributeKey,
          value: valStr,
        });
      } catch (err) {
        console.error('Failed to save attribute:', err);
      }
    },
    [applyAttributeChange, attributeKey, effectiveType]
  );

  // 1. ENFORCE FIELD LIMIT (Free: 1 field max)
  if (isOverFieldLimit) {
    if (isEditor) {
      return (
        <Banner status="warning" title="Free Plan Limit (1 Field)">
          <BlockStack spacing="tight">
            <Text size="small">
              The Free Starter plan is limited to 1 active checkout field.
            </Text>
            <Text size="small">
              To use multiple simultaneous fields (e.g., Gift Note + Delivery Instructions), upgrade to the Pro Plan ($12.99/mo) in the CheckoutFields app dashboard.
            </Text>
          </BlockStack>
        </Banner>
      );
    }
    // In live buyer checkout, do not render extra fields
    return null;
  }

  // 2. RENDER THE FIELD (with Pro notices in Editor if gated)
  return (
    <BlockStack spacing="tight">
      {/* Notice in Editor if merchant selected a Pro field type on Free plan */}
      {isGatedFieldType && isEditor && (
        <Banner status="info" title="Pro Plan Feature">
          <Text size="small">
            {rawType === 'select'
              ? 'Dropdown select surveys require the Pro Plan ($12.99/mo).'
              : rawType === 'checkbox'
              ? 'Mandatory terms & conditions checkboxes require the Pro Plan ($12.99/mo).'
              : 'Number input fields require the Pro Plan ($12.99/mo).'}
            {' '}On Free Starter, this field defaults to standard text. Upgrade in CheckoutFields to enable.
          </Text>
        </Banner>
      )}

      {/* Notice in Editor if merchant toggled Required on Free plan */}
      {!isProStore && isRequired && isEditor && (
        <Text size="small" appearance="subdued">
          (Required field blocking is a Pro feature. On the Free tier, this field remains optional.)
        </Text>
      )}

      {effectiveType === 'checkbox' ? (
        <Checkbox
          checked={value === 'true'}
          error={validationError || undefined}
          onChange={(checked) => handleChange(checked ? 'true' : 'false')}
        >
          {title}
        </Checkbox>
      ) : effectiveType === 'select' ? (
        <Select
          label={title}
          value={value}
          options={selectOptions}
          required={isRequired}
          error={validationError || undefined}
          onChange={handleChange}
        />
      ) : effectiveType === 'multiline' ? (
        <TextField
          label={title}
          value={value}
          multiline={3}
          required={canEnforceRequired}
          error={validationError || undefined}
          onChange={handleChange}
        />
      ) : effectiveType === 'number' ? (
        <TextField
          label={title}
          type="number"
          value={value}
          required={canEnforceRequired}
          error={validationError || undefined}
          onChange={handleChange}
        />
      ) : (
        <TextField
          label={title}
          value={value}
          required={canEnforceRequired}
          error={validationError || undefined}
          onChange={handleChange}
        />
      )}

      {(helpText || placeholder) ? (
        <Text size="small" appearance="subdued">
          {helpText || placeholder}
        </Text>
      ) : null}
    </BlockStack>
  );
}
