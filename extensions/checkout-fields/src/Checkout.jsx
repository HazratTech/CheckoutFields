console.log('[Fieldy DEBUG] Custom Field & Note loaded for target purchase.checkout.block.render');

function getSignalValue(signal) {
  if (!signal) return null;
  if (typeof signal === 'object') {
    if ('value' in signal) return signal.value;
    if ('current' in signal) return signal.current;
    if ('_private_4_value' in signal) return signal._private_4_value;
  }
  return signal;
}

let isSettingsSubscribed = false;

export default function extension(...args) {
  console.log('[Fieldy DEBUG 2025-10] extension invoked for purchase.checkout.block.render! Args count:', args.length);

  if (typeof document === 'undefined' || !document.body) {
    console.warn('[Fieldy DEBUG 2025-10] document.body is missing!');
    return;
  }

  // Clear previous children
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }

  // Read merchant settings from shopify.settings Signal
  const rawSettings = typeof shopify !== 'undefined' ? getSignalValue(shopify.settings) : null;
  console.log('[Fieldy DEBUG 2025-10] Resolved settings:', rawSettings);

  // Setup reactive subscriptions once
  if (!isSettingsSubscribed && typeof shopify !== 'undefined' && shopify.settings && typeof shopify.settings.subscribe === 'function') {
    isSettingsSubscribed = true;
    shopify.settings.subscribe((newSettings) => {
      console.log('[Fieldy DEBUG 2025-10] Settings updated in Checkout Editor:', newSettings);
      extension(...args);
    });
  }

  // Custom Input Field
  const title = (rawSettings && rawSettings.field_title && String(rawSettings.field_title).trim()) || 'Custom Field';
  const placeholder = (rawSettings && rawSettings.field_placeholder && String(rawSettings.field_placeholder).trim()) || '';
  const helpText = (rawSettings && rawSettings.field_help_text && String(rawSettings.field_help_text).trim()) || '';
  const fieldType = (rawSettings && rawSettings.field_type && String(rawSettings.field_type).trim().toLowerCase()) || 'text';
  const selectOptions = (rawSettings && rawSettings.select_options && String(rawSettings.select_options)) || '';
  const isRequired = (rawSettings && (rawSettings.field_required === true || rawSettings.field_required === 'true')) || false;
  const maxChars = rawSettings && rawSettings.max_characters ? parseInt(String(rawSettings.max_characters), 10) : 0;
  const targetCountriesRaw = (rawSettings && rawSettings.target_countries && String(rawSettings.target_countries).trim()) || '';
  const targetCountries = targetCountriesRaw ? targetCountriesRaw.split(/[\s,]+/).map(c => c.trim().toUpperCase()).filter(Boolean) : [];

  const attributeKey = (rawSettings && rawSettings.attribute_key && String(rawSettings.attribute_key).trim()) ||
    title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'custom_field';

  // Check Pro plan
  const rawMetafields = typeof shopify !== 'undefined' ? getSignalValue(shopify.appMetafields) : [];
  let isPro = false;
  if (Array.isArray(rawMetafields)) {
    const planMetafield = rawMetafields.find(m => {
      const ns = m?.metafield?.namespace || m?.namespace;
      const k = m?.metafield?.key || m?.key;
      return ns === 'checkout_fields' && k === 'plan';
    });
    const planVal = planMetafield?.metafield?.value || planMetafield?.value || '';
    isPro = String(planVal).toLowerCase().trim() === 'pro';
  }

  // Country filtering
  const localization = typeof shopify !== 'undefined' ? getSignalValue(shopify.localization) : null;
  const currentCountry = localization?.country?.current?.isoCode || localization?.country?.isoCode || '';
  const isEditor = typeof shopify !== 'undefined' && Boolean(shopify.extension?.editor);

  if (targetCountries.length > 0 && currentCountry && !targetCountries.includes(currentCountry.toUpperCase())) {
    if (!isEditor) {
      console.log('[Fieldy DEBUG 2025-10] Hidden due to country targeting:', currentCountry, 'allowed:', targetCountries);
      return;
    }
  }

  console.log('[Fieldy DEBUG 2025-10] Rendering Fieldy block with title:', title, 'attributeKey:', attributeKey);

  // Create outer stack
  const stack = document.createElement('s-stack');
  stack.setAttribute('direction', 'block');
  stack.setAttribute('gap', 'tight');

  // Country filter banner in Editor preview
  if (targetCountries.length > 0 && currentCountry && !targetCountries.includes(currentCountry.toUpperCase()) && isEditor) {
    const banner = document.createElement('s-banner');
    banner.setAttribute('tone', 'info');
    banner.setAttribute('heading', 'Country Filter Active');
    const bText = document.createElement('s-text');
    bText.textContent = `This field will only display to buyers in: ${targetCountries.join(', ')}. (Preview country: ${currentCountry || 'Global'}).`;
    banner.appendChild(bText);
    stack.appendChild(banner);
  }

  // Read saved attribute value
  const rawAttributes = typeof shopify !== 'undefined' ? getSignalValue(shopify.attributes) : [];
  let savedValue = '';
  if (Array.isArray(rawAttributes)) {
    const existingAttr = rawAttributes.find(a => a && a.key === attributeKey);
    if (existingAttr && existingAttr.value) {
      savedValue = String(existingAttr.value);
    }
  }

  // Helper to persist attribute
  const saveAttribute = async (val) => {
    let finalVal = String(val != null ? val : '');
    if (maxChars > 0 && finalVal.length > maxChars) {
      finalVal = finalVal.slice(0, maxChars);
    }
    console.log('[Fieldy DEBUG 2025-10] Saving attribute change:', attributeKey, '=', finalVal);
    if (typeof shopify !== 'undefined' && typeof shopify.applyAttributeChange === 'function') {
      try {
        const res = await shopify.applyAttributeChange({
          type: 'updateAttribute',
          key: attributeKey,
          value: finalVal
        });
        console.log('[Fieldy DEBUG 2025-10] applyAttributeChange result:', res);
      } catch (err) {
        console.error('[Fieldy DEBUG 2025-10] Failed to save attribute:', err);
      }
    }
  };

  // Determine actual field type (gated by Pro plan)
  const isGatedType = !isPro && ['select', 'checkbox', 'number', 'date'].includes(fieldType);
  const activeType = isGatedType ? (fieldType === 'multiline' ? 'multiline' : 'text') : fieldType;

  if (isGatedType && isEditor) {
    const proBanner = document.createElement('s-banner');
    proBanner.setAttribute('tone', 'info');
    proBanner.setAttribute('heading', 'Pro Plan Feature');
    const pText = document.createElement('s-text');
    pText.textContent = `Advanced input types (${fieldType}) require the Pro Plan ($4.99/mo). On Free Starter, this defaults to text. Upgrade in Fieldy to enable.`;
    proBanner.appendChild(pText);
    stack.appendChild(proBanner);
  }

  // Render appropriate Polaris Web Component
  if (activeType === 'checkbox') {
    const checkbox = document.createElement('s-checkbox');
    checkbox.textContent = title;
    if (savedValue === 'true') checkbox.setAttribute('checked', 'true');
    checkbox.addEventListener('change', (e) => {
      const isChecked = Boolean(e?.target?.checked || e?.detail?.checked);
      saveAttribute(isChecked ? 'true' : 'false');
    });
    stack.appendChild(checkbox);
  } else if (activeType === 'select') {
    const select = document.createElement('s-select');
    select.setAttribute('label', title);
    if (savedValue) select.setAttribute('value', savedValue);

    const defaultOption = document.createElement('s-option');
    defaultOption.setAttribute('value', '');
    defaultOption.textContent = '-- Select an option --';
    select.appendChild(defaultOption);

    const individualOptions = [
      rawSettings?.option_1,
      rawSettings?.option_2,
      rawSettings?.option_3,
      rawSettings?.option_4,
      rawSettings?.option_5,
      rawSettings?.option_6,
    ].map(s => (s ? String(s).trim() : '')).filter(Boolean);

    const bulkOptions = selectOptions
      ? selectOptions.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
      : [];

    const optionsList = Array.from(new Set([...individualOptions, ...bulkOptions]));
    const finalOptions = optionsList.length > 0 ? optionsList : ['Option 1', 'Option 2', 'Option 3'];

    for (const opt of finalOptions) {
      const optEl = document.createElement('s-option');
      optEl.setAttribute('value', opt);
      optEl.textContent = opt;
      if (savedValue === opt) optEl.setAttribute('selected', 'true');
      select.appendChild(optEl);
    }

    select.addEventListener('change', (e) => {
      const val = e?.target?.value || e?.detail?.value || '';
      saveAttribute(val);
    });
    stack.appendChild(select);
  } else {
    // Text / Multiline / Number / Date
    const input = document.createElement('s-text-field');
    input.setAttribute('label', title);
    if (placeholder) input.setAttribute('placeholder', placeholder);
    if (helpText) input.setAttribute('help-text', helpText);
    if (savedValue) input.setAttribute('value', savedValue);
    if (maxChars > 0) input.setAttribute('maxlength', String(maxChars));
    if (isRequired && isPro) input.setAttribute('required', 'true');

    if (activeType === 'multiline') {
      input.setAttribute('multiline', '3');
    } else if (activeType === 'number') {
      input.setAttribute('type', 'number');
    } else if (activeType === 'date') {
      if (!placeholder) input.setAttribute('placeholder', 'YYYY-MM-DD');
    }

    input.addEventListener('change', (e) => {
      const val = e?.target?.value ?? e?.detail?.value ?? input.getAttribute('value') ?? '';
      saveAttribute(val);
    });

    input.addEventListener('input', (e) => {
      const val = e?.target?.value ?? e?.detail?.value;
      if (val !== undefined) input.setAttribute('value', String(val));
    });

    stack.appendChild(input);
  }

  // Character counter if maxChars configured
  if (maxChars > 0) {
    const charCount = document.createElement('s-text');
    charCount.setAttribute('size', 'small');
    charCount.setAttribute('tone', savedValue.length >= maxChars ? 'critical' : 'subdued');
    charCount.textContent = `${savedValue.length} / ${maxChars} characters`;
    stack.appendChild(charCount);
  }

  document.body.appendChild(stack);
  console.log('[Fieldy DEBUG 2025-10] Polaris web components mounted successfully to document.body! Children count:', document.body.children.length);
}
