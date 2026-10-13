import {
  reactExtension,
  useAttributeValues,
  useSettings,
  BlockStack,
  Text,
  Banner,
} from '@shopify/ui-extensions-react/checkout';

console.log('[Fieldy DEBUG] ThankYou.jsx module loaded and registering target purchase.thank-you.block.render');

export default reactExtension(
  'purchase.thank-you.block.render',
  (api) => {
    console.log('[Fieldy DEBUG] reactExtension render callback executing for purchase.thank-you.block.render. API:', api);
    return <ThankYouComponent />;
  }
);

function ThankYouComponent() {
  const settings = useSettings();

  const title = String(settings?.field_title || '').trim() || 'Custom Note';
  const attributeKey =
    (settings?.attribute_key && String(settings.attribute_key).trim()) ||
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') ||
    'custom_note';
  const [val] = useAttributeValues([attributeKey]);

  if (!val) {
    return (
      <Banner status="info" title={`Fieldy: ${title}`}>
        <BlockStack spacing="tight">
          <Text size="small">
            Order attribute: <strong>{attributeKey}</strong>
          </Text>
          <Text size="small" appearance="subdued">
            In live orders, customer entries from checkout will appear here.
          </Text>
        </BlockStack>
      </Banner>
    );
  }

  return (
    <BlockStack spacing="extraTight">
      <Text size="medium" emphasis="bold">
        {title}:
      </Text>
      <Text size="base">{val}</Text>
    </BlockStack>
  );
}
