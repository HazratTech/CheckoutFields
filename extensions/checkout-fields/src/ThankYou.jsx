import {
  reactExtension,
  useAttributeValues,
  useSettings,
  BlockStack,
  Text,
  Banner,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.thank-you.block.render',
  () => <ThankYouComponent />
);

function ThankYouComponent() {
  const settings = useSettings();

  const title = String(settings?.field_title || 'Custom Note');
  const attributeKey =
    settings?.attribute_key ||
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
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
