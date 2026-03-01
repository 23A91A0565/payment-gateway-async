import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Webhooks() {
  const [logs, setLogs] = useState([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  const loadLogs = async () => {
    const res = await api.get('/webhooks?limit=50&offset=0');
    setLogs(res.data.data || []);
  };

  const loadConfig = async () => {
    const res = await api.get('/webhooks/config');
    setWebhookUrl(res.data.webhook_url || '');
    setWebhookSecret(res.data.webhook_secret || '');
  };

  useEffect(() => {
    loadConfig();
    loadLogs();
  }, []);

  const saveConfig = async (event) => {
    event.preventDefault();
    await api.post('/webhooks/config', { webhookUrl });
  };

  const regenerateSecret = async () => {
    const res = await api.post('/webhooks/config/regenerate-secret');
    setWebhookSecret(res.data.webhook_secret);
  };

  const sendTest = async () => {
    await api.post('/webhooks/test');
    loadLogs();
  };

  const retryWebhook = async (id) => {
    await api.post(`/webhooks/${id}/retry`);
    loadLogs();
  };

  const formatTimestamp = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  };

  return (
    <div data-testid="webhook-config">
      <h2>Webhook Configuration</h2>

      <form data-testid="webhook-config-form" onSubmit={saveConfig}>
        <div>
          <label>Webhook URL</label><br />
          <input
            data-testid="webhook-url-input"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://yoursite.com/webhook"
            style={{ width: 400 }}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Webhook Secret</label><br />
          <span data-testid="webhook-secret">{webhookSecret || '-'}</span>
          <button
            type="button"
            data-testid="regenerate-secret-button"
            onClick={regenerateSecret}
            style={{ marginLeft: 10 }}
          >
            Regenerate
          </button>
        </div>

        <button
          data-testid="save-webhook-button"
          type="submit"
          style={{ marginTop: 10 }}
        >
          Save Configuration
        </button>

        <button
          data-testid="test-webhook-button"
          type="button"
          onClick={sendTest}
          style={{ marginLeft: 10 }}
        >
          Send Test Webhook
        </button>
      </form>

      <h3 style={{ marginTop: 30 }}>Webhook Logs</h3>

      <table data-testid="webhook-logs-table" border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Event</th>
            <th>Status</th>
            <th>Attempts</th>
            <th>Last Attempt</th>
            <th>Response Code</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} data-testid="webhook-log-item" data-webhook-id={log.id}>
              <td data-testid="webhook-event">{log.event}</td>
              <td data-testid="webhook-status">{log.status}</td>
              <td data-testid="webhook-attempts">{log.attempts}</td>
              <td data-testid="webhook-last-attempt">{formatTimestamp(log.last_attempt_at)}</td>
              <td data-testid="webhook-response-code">{log.response_code || '-'}</td>
              <td>
                <button
                  data-testid="retry-webhook-button"
                  data-webhook-id={log.id}
                  onClick={() => retryWebhook(log.id)}
                >
                  Retry
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
