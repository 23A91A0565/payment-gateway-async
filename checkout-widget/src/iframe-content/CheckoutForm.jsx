import React from 'react';

export default function CheckoutForm() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order_id') || `order_${Date.now()}`;
  const targetOrigin = params.get('origin') || window.location.origin;

  const postToParent = (type, data = {}) => {
    window.parent.postMessage({ type, data }, targetOrigin);
  };

  const pay = async () => {
    const res = await fetch('http://localhost:8000/api/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': 'key_test_abc123',
        'X-Api-Secret': 'secret_test_xyz789',
        'Idempotency-Key': Date.now().toString()
      },
      body: JSON.stringify({
        amount: 50000,
        currency: 'INR',
        order_id: orderId,
        method: 'upi',
        vpa: 'user@paytm'
      })
    });

    const data = await res.json();

    if (!res.ok) {
      postToParent('payment_failed', data);
      return;
    }

    postToParent('payment_success', data);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Pay ₹500</h2>
      <button onClick={pay}>Pay Now</button>
      <button onClick={() => postToParent('close_modal')}>
        Cancel
      </button>
    </div>
  );
}
