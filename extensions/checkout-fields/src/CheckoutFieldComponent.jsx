import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useSettings,
  useApplyAttributeChange,
  useAttributeValues,
  useBuyerJourneyIntercept,
  useAppMetafields,
  useExtensionEditor,
  useApi,
  BlockStack,
  TextField,
  Select,
  Checkbox,
  Text,
  Banner,
} from '@shopify/ui-extensions-react/checkout';

export function CheckoutFieldComponent() {
  const settings = useSettings();
  const applyAttributeChange = useApplyAttributeChange();
  const appMetafields = useAppMetafields() || [];
  const editor = useExtensionEditor();
  const isEditor = Boolean(editor);
  const api = useApi();

  // Subscription plan check: Strictly requires shop metafield checkout_fields.plan === 'pro'
  const planEntry = appMetafields.find(
    (m) =>
      (m.metafield?.namespace === 'checkout_fields' && m.metafield?.key === 'plan') ||
      (m.namespace === 'checkout_fields' && m.key === 'plan')
  );
  const rawPlanValue = planEntry?.metafield?.value ?? planEntry?.value;
  const isProStore = String(rawPlanValue || '').toLowerCase().trim() === 'pro';

  // Settings from Checkout Editor
  const title = String(settings?.field_title || 'Custom Field');
  const rawType = String(settings?.field_type || 'text').toLowerCase().trim();
  const placeholder = settings?.field_placeholder ? String(settings.field_placeholder) : '';
  const helpText = settings?.field_help_text ? String(settings.field_help_text) : '';
  const rawOptions = settings?.select_options ? String(settings.select_options) : '';
  const isRequired = Boolean(
    settings?.field_required === true || settings?.field_required === 'true'
  );

  // Character Limit Setting
  const rawMaxChars = settings?.max_characters;
  const maxChars = rawMaxChars ? parseInt(String(rawMaxChars), 10) : 0;

  // Country / Geo-Targeting Setting
  const targetCountriesRaw = String(settings?.target_countries || '').trim();
  const targetCountryList = useMemo(() => {
    if (!targetCountriesRaw) return [];
    return targetCountriesRaw
      .split(/[\s,]+/)
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
  }, [targetCountriesRaw]);

  // Field Type Gating:
  // Free Starter: text, multiline
  // Pro Plan: select, checkbox, number, date
  const isProFieldType =
    rawType === 'select' ||
    rawType === 'checkbox' ||
    rawType === 'number' ||
    rawType === 'date';
  const isGatedFieldType = !isProStore && isProFieldType;
  const effectiveType = isGatedFieldType
    ? rawType === 'multiline'
      ? 'multiline'
      : 'text'
    : rawType;

  // Required Field Gating: Pro Plan only
  const canEnforceRequired = isProStore && isRequired;

  // Determine attribute key
  const attributeKey = useMemo(() => {
    const key = settings?.attribute_key;
    if (key && typeof key === 'string' && key.trim().length > 0) {
      return key.trim();
    }
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'custom_field';
  }, [settings?.attribute_key, title]);

  // Pre-populate value from existing order attributes
  const [savedAttributeValue] = useAttributeValues([attributeKey]);
  const [value, setValue] = useState(savedAttributeValue ?? '');
  const [validationError, setValidationError] = useState('');

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
      let valStr = String(newValue ?? '');
      if (maxChars > 0 && valStr.length > maxChars) {
        valStr = valStr.slice(0, maxChars);
      }
      setValue(valStr);

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
    [applyAttributeChange, attributeKey, effectiveType, maxChars]
  );

  // Geo-Targeting Filter
  const buyerCountry = api?.localization?.country?.current?.isoCode?.toUpperCase();
  const isCountryExcluded =
    targetCountryList.length > 0 &&
    buyerCountry &&
    !targetCountryList.includes(buyerCountry);

  if (isCountryExcluded) {
    if (isEditor) {
      return (
        <Banner status="info" title="Country Filter Active">
          <Text size="small">
            This field is configured for: {targetCountryList.join(', ')}. (Current preview country: {buyerCountry})
          </Text>
        </Banner>
      );
    }
    return null;
  }

  const currentLength = (value || '').length;

  return (
    <BlockStack spacing="tight">
      {/* Notice in Editor if merchant selected a Pro field type on Free plan */}
      {isGatedFieldType && isEditor && (
        <Banner status="info" title="Pro Plan Feature">
          <Text size="small">
            {rawType === 'select'
              ? 'Dropdown select surveys require the Pro Plan ($4.99/mo).'
              : rawType === 'checkbox'
              ? 'Mandatory terms & conditions checkboxes require the Pro Plan ($4.99/mo).'
              : rawType === 'date'
              ? 'Date selection fields require the Pro Plan ($4.99/mo).'
              : 'Number input fields require the Pro Plan ($4.99/mo).'}
            {' '}On Free Starter, this field defaults to standard text. Upgrade in Fieldy to enable.
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
          required={canEnforceRequired}
          error={validationError || undefined}
          onChange={handleChange}
        />
      ) : effectiveType === 'multiline' ? (
        <TextField
          label={title}
          value={value}
          multiline={3}
          maxLength={maxChars > 0 ? maxChars : undefined}
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
      ) : effectiveType === 'date' ? (
        <TextField
          label={title}
          value={value}
          placeholder={placeholder || 'YYYY-MM-DD'}
          required={canEnforceRequired}
          error={validationError || undefined}
          onChange={handleChange}
        />
      ) : (
        <TextField
          label={title}
          value={value}
          placeholder={placeholder || undefined}
          maxLength={maxChars > 0 ? maxChars : undefined}
          required={canEnforceRequired}
          error={validationError || undefined}
          onChange={handleChange}
        />
      )}

      {/* Sub-label area: Help text or live character counter */}
      {(helpText || maxChars > 0) && (
        <BlockStack spacing="none">
          {helpText && (
            <Text size="small" appearance="subdued">
              {helpText}
            </Text>
          )}
          {maxChars > 0 && (
            <Text
              size="small"
              appearance={currentLength >= maxChars ? 'critical' : 'subdued'}
            >
              {currentLength} / {maxChars} characters
            </Text>
          )}
        </BlockStack>
      )}
    </BlockStack>
  );
}
