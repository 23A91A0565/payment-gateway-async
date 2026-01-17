import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Webhooks() {
  const [logs, setLogs] = useState([]);
  const [webhookUrl, setWebhookUrl] = useState('');

  const loadLogs = async () => {
    const res = await api.get('/webhooks/logs');
    setLogs(res.data);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const saveConfig = async () => {
    await api.post('/webhooks/config', { webhookUrl });
    alert('Webhook config saved');
  };

  const sendTest = async () => {
    await api.post('/webhooks/test');
    loadLogs();
  };

  const retryWebhook = async (id) => {
    await api.post(`/webhooks/${id}/retry`);
    loadLogs();
  };

  return (
    <div data-test-id="webhook-config">
      <h2>Webhook Configuration</h2>

      <div>
        <label>Webhook URL</label><br />
        <input
          data-test-id="webhook-url-input"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="http://host.docker.internal:4000/webhook"
          style={{ width: 400 }}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <label>Webhook Secret</label><br />
        <span data-test-id="webhook-secret">whsec_test_abc123</span>
      </div>

      <button
        data-test-id="save-webhook-button"
        onClick={saveConfig}
        style={{ marginTop: 10 }}
      >
        Save Configuration
      </button>

      <button
        data-test-id="test-webhook-button"
        onClick={sendTest}
        style={{ marginLeft: 10 }}
      >
        Send Test Webhook
      </button>

      <h3 style={{ marginTop: 30 }}>Webhook Logs</h3>

      <table data-test-id="webhook-logs-table" border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Event</th>
            <th>Status</th>
            <th>Attempts</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} data-test-id="webhook-log-item">
              <td>{log.event}</td>
              <td>{log.status}</td>
              <td>{log.attempts}</td>
              <td>
                <button
                  data-test-id="retry-webhook-button"
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
