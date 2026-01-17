# Payment Gateway – Async Architecture

A simplified asynchronous payment gateway system with webhook handling, retries, dashboard, and checkout SDK    

---

## Tech Stack  

- Backend API: Node.js + Express 
- Worker: Node.js + Bull 
- Database: PostgreSQL  
- Queue: Redis  
- Dashboard: React  
- Checkout SDK: Vanilla JS + Webpack  
- Containerization: Docker + Docker Compose  

---

## Architecture Overview

- API handles payment & refund creation.  
- Worker processes async jobs (payment simulation, webhooks).  
- Webhooks support retries with exponential backoff.  
- Dashboard provides webhook configuration, logs, retries, and API docs.  
- Checkout SDK provides embeddable payment UI.  

---

## Ports Used

| Service                  | Port |
|---------------------------|------|
| API                       | 8000 |
| Dashboard                 | 3000 |
| Checkout SDK              | 3001 |
| PostgreSQL                | 5432 |
| Redis                     | 6379 |
| Webhook Test Server (local)| 4000 |

---

## Running the Project

```bash
docker-compose up -d --build
```

Verify:

```bash
docker ps
```

---

## API Health Check

```bash
curl http://localhost:8000/health
```

Expected:

```json
{ "status": "ok" }
```

---

## Create Payment

```bash
curl -X POST http://localhost:8000/api/v1/payments \
-H "Content-Type: application/json" \
-H "Idempotency-Key: key_test_123" \
-d '{
  "amount": 50000,
  "currency": "INR"
}'
```

---

## Create Refund

```bash
curl -X POST http://localhost:8000/api/v1/refunds \
-H "Content-Type: application/json" \
-d '{
  "paymentId": "<SUCCESS_PAYMENT_ID>",
  "amount": 10000
}'
```

---

## Webhooks

### List Logs

```bash
curl http://localhost:8000/api/v1/webhooks/logs
```

### Retry Webhook

```bash
curl -X POST http://localhost:8000/api/v1/webhooks/<WEBHOOK_ID>/retry
```

---

## Dashboard

Open:

```
http://localhost:3000
```

Features:

- Webhook URL & secret configuration  
- Webhook logs  
- Retry failed webhooks  
- API documentation  
- SDK integration guide  

---

## Checkout SDK

Load SDK:

```html
<script src="http://localhost:3001/checkout.js"></script>
<script>
  const checkout = new PaymentGateway({
    key: "key_test_abc123",
    orderId: "order_xyz",
    onSuccess: (res) => console.log(res),
    onFailure: (err) => console.error(err)
  });

  checkout.open();
</script>
```

---

## Webhook Signature Verification

```js
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex') === signature;
}
```

---
## Architecture Diagram
graph TD
    U[User / Browser]

    U -->|Access UI| D[Dashboard<br/>React • Port 3000]
    U -->|Initiate Payment| C[Checkout Widget<br/>JS SDK • Port 3001]

    D -->|REST API Calls| A[API Service<br/>Node.js • Port 8000]
    C -->|Create Payment| A

    A -->|Persist Data| P[(PostgreSQL<br/>Port 5432)]
    A -->|Enqueue Jobs| R[(Redis Queue<br/>Port 6379)]

    R --> W[Worker Service<br/>Async Processor]
    W -->|Update Status| P
    W -->|Send Events| H[Webhook Endpoint<br/>External/Test Server]

    H -->|200 OK / Retry Logic| W

    subgraph Monitoring
      M[Prometheus/Grafana]
      L[Structured Logs]
    end

    A --> M
    W --> M
    A --> L
    W --> L

---

## Notes.  
- All services start using `docker-compose up -d`.  

---
