const form = document.getElementById('payment-form');
const result = document.getElementById('payment-result');
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const monthsPerUnit = location.pathname.endsWith('/home-loans.html') ? 12 : 1;

function calculatePayment() {
  const amount = form.elements.amount.valueAsNumber;
  const monthlyRate = form.elements.rate.valueAsNumber / 1200;
  const months = form.elements.term.valueAsNumber * monthsPerUnit;
  const payment = monthlyRate === 0
    ? amount / months
    : amount * monthlyRate / -Math.expm1(-months * Math.log1p(monthlyRate));
  result.textContent = usd.format(payment) + ' per month';
}

form.addEventListener('submit', event => {
  event.preventDefault();
  calculatePayment();
});
form.addEventListener('input', () => { result.textContent = ''; });
calculatePayment();
