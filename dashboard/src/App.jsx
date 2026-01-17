import { useState } from 'react';
import Webhooks from './pages/Webhooks';
import Docs from './pages/Docs';

function App() {
  const [page, setPage] = useState('webhooks');

  return (
    <div style={{ padding: 20 }}>
      <nav style={{ marginBottom: 20 }}>
        <button onClick={() => setPage('webhooks')}>Webhooks</button>
        <button onClick={() => setPage('docs')} style={{ marginLeft: 10 }}>
          API Docs
        </button>
      </nav>

      {page === 'webhooks' && <Webhooks />}
      {page === 'docs' && <Docs />}
    </div>
  );
}

export default App;
