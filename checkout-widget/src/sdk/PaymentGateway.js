import './styles.css';

export default class PaymentGateway {
  constructor(options) {
    this.key = options.key;
    this.orderId = options.orderId;
    this.onSuccess = options.onSuccess;
    this.onFailure = options.onFailure;
  }

  open() {
    this.createModal();
  }

  close() {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
    }
  }

  createModal() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'pg-overlay';

    const iframe = document.createElement('iframe');
    iframe.src = 'http://localhost:3001/iframe.html';
    iframe.className = 'pg-iframe';

    this.overlay.appendChild(iframe);
    document.body.appendChild(this.overlay);

    window.addEventListener('message', this.handleMessage.bind(this));
  }

  handleMessage(event) {
    if (!event.data || !event.data.type) return;

    if (event.data.type === 'PAYMENT_SUCCESS') {
      this.onSuccess?.(event.data.payload);
      this.close();
    }

    if (event.data.type === 'PAYMENT_FAILURE') {
      this.onFailure?.(event.data.payload);
      this.close();
    }

    if (event.data.type === 'CLOSE_MODAL') {
      this.close();
    }
  }
}
