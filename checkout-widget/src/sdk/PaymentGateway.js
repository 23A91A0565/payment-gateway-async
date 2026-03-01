import './styles.css';

export default class PaymentGateway {
  constructor(options) {
    if (!options || !options.key || !options.orderId) {
      throw new Error('PaymentGateway requires key and orderId');
    }

    this.key = options.key;
    this.orderId = options.orderId;
    this.onSuccess = options.onSuccess;
    this.onFailure = options.onFailure;
    this.onClose = options.onClose;
    this.modalRoot = null;
    this.messageHandler = this.handleMessage.bind(this);
  }

  open() {
    if (this.modalRoot) {
      return;
    }

    this.createModal();
    window.addEventListener('message', this.messageHandler);
  }

  close() {
    window.removeEventListener('message', this.messageHandler);

    if (this.modalRoot) {
      document.body.removeChild(this.modalRoot);
      this.modalRoot = null;
    }

    if (typeof this.onClose === 'function') {
      this.onClose();
    }
  }
  createModal() {
    const parentOrigin = encodeURIComponent(window.location.origin);

    const modal = document.createElement('div');
    modal.id = 'payment-gateway-modal';
    modal.setAttribute('data-testid', 'payment-modal');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content';

    const iframe = document.createElement('iframe');
    iframe.className = 'payment-iframe';
    iframe.setAttribute('data-testid', 'payment-iframe');
    iframe.src = `http://localhost:3001/checkout?order_id=${encodeURIComponent(this.orderId)}&embedded=true&origin=${parentOrigin}`;

    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.setAttribute('data-testid', 'close-modal-button');
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => this.close());

    content.appendChild(iframe);
    content.appendChild(closeButton);
    overlay.appendChild(content);
    modal.appendChild(overlay);

    this.modalRoot = modal;
    document.body.appendChild(this.modalRoot);
  }

  handleMessage(event) {
    if (!event.data || !event.data.type) return;

    if (event.origin !== 'http://localhost:3001') {
      return;
    }

    if (event.data.type === 'payment_success') {
      this.onSuccess?.(event.data.data);
      this.close();
    }

    if (event.data.type === 'payment_failed') {
      this.onFailure?.(event.data.data);
    }

    if (event.data.type === 'close_modal') {
      this.close();
    }
  }
}

if (typeof window !== 'undefined') {
  window.PaymentGateway = PaymentGateway;
}
