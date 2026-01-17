import React from 'react';

export default function CheckoutForm() {
  const pay = async () => {
    const res = await fetch('http://localhost:8000/api/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': Date.now().toString()
      },
      body: JSON.stringify({
        amount: 50000,
        currency: 'INR'
      })
    });

    const data = await res.json();

    window.parent.postMessage(
      {
        type: 'PAYMENT_SUCCESS',
        payload: data
      },
      '*'
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Pay ₹500</h2>
      <button onClick={pay}>Pay Now</button>
      <button onClick={() =>
        window.parent.postMessage({ type: 'CLOSE_MODAL' }, '*')
      }>
        Cancel
      </button>
    </div>
  );
}
