export default function Docs() {
  return (
    <div data-test-id="api-docs">
      <h2>Integration Guide</h2>

      <h3>1. Create Order</h3>
      <pre>
{`curl -X POST http://localhost:8000/api/v1/payments \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: key_test_123" \\
  -d '{
    "amount": 50000,
    "currency": "INR"
  }'`}
      </pre>

      <h3>2. SDK Integration</h3>
      <pre>
{`<script src="http://localhost:3000/checkout.js"></script>
<script>
const checkout = new PaymentGateway({
  key: 'key_test_abc123',
  orderId: 'order_xyz',
  onSuccess: (res) => console.log(res)
});
checkout.open();
</script>`}
      </pre>

      <h3>3. Verify Webhook Signature</h3>
      <pre>
{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex') === signature;
}`}
      </pre>
    </div>
  );
}
