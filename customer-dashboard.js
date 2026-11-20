const get = id => document.getElementById(id);
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const pageSize = 8;
let accountNames = new Map();
let activity = [];
let filtered = [];
let page = 0;

function node(tag, content, className) {
  const element = document.createElement(tag);
  element.textContent = content;
  if (className) element.className = className;
  return element;
}

function renderActivity() {
  const account = get('activity-account').value;
  const direction = get('activity-direction').value;
  const search = get('activity-search').value.trim().toLowerCase();
  filtered = activity.filter(entry =>
    (!account || entry.account_id === account)
    && (!direction || (direction === 'in' ? entry.amount_cents > 0 : entry.amount_cents < 0))
    && (!search || [entry.description, entry.posted_on, accountNames.get(entry.account_id)]
      .some(value => value?.toLowerCase().includes(search)))
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(page, pages - 1);
  const rows = get('activity-rows');
  rows.replaceChildren();
  for (const entry of filtered.slice(page * pageSize, (page + 1) * pageSize)) {
    const row = document.createElement('tr');
    row.append(
      node('td', dateFormat.format(new Date(entry.posted_on + 'T00:00:00Z'))),
      node('td', entry.description),
      node('td', accountNames.get(entry.account_id) ?? entry.account_id),
      node('td', usd.format(entry.amount_cents / 100), entry.amount_cents > 0 ? 'credit-amount' : '')
    );
    rows.append(row);
  }
  get('activity-table').hidden = !filtered.length;
  get('activity-summary').textContent = filtered.length
    ? `Showing ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} of ${filtered.length}`
    : activity.length ? 'No transactions match the current filters.' : 'Transaction activity will appear here after your first transaction.';
  get('activity-previous').disabled = page === 0;
  get('activity-next').disabled = page >= pages - 1;
  get('activity-export').disabled = !filtered.length;
}

export function showCustomerDashboard(accounts, transactions) {
  activity = transactions;
  accountNames = new Map(accounts.filter(account => account.id).map(account => [account.id, account.name]));
  const records = get('records');
  records.replaceChildren();
  get('dashboard-total').textContent = usd.format(accounts.reduce((sum, account) => sum + account.balance_cents, 0) / 100);
  get('dashboard-count').textContent = accounts.length + (accounts.length === 1 ? ' account' : ' accounts');
  for (const account of accounts) {
    const card = node('article', '', 'bank-account-card');
    const headline = node('div', '', 'bank-account-title');
    headline.append(node('h3', account.name), node('span', account.suspended ? 'Suspended' : 'Active', account.suspended ? 'account-state suspended' : 'account-state'));
    card.append(headline, node('p', 'Account ending in ' + account.last_four, 'account-tail'),
      node('strong', usd.format(account.balance_cents / 100), 'account-balance'), node('span', 'Current balance', 'account-tail'));
    records.append(card);
  }
  if (!accounts.length) records.append(node('p', 'No accounts are available yet.'));
  const filter = get('activity-account');
  const selected = filter.value;
  filter.replaceChildren(new Option('All accounts', ''), ...Array.from(accountNames,
    ([id, name]) => new Option(name, id)
  ));
  if (accountNames.has(selected)) filter.value = selected;
  renderActivity();
}

export function clearCustomerDashboard() {
  activity = [];
  filtered = [];
  page = 0;
  get('activity-search').value = '';
  get('activity-direction').value = '';
  get('activity-account').replaceChildren(new Option('All accounts', ''));
  get('activity-rows').replaceChildren();
  get('dashboard-total').textContent = '';
  get('dashboard-count').textContent = '';
}

function csvText(value) {
  const text = String(value);
  const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

function exportActivity() {
  const lines = ['Date,Description,Account,Amount (USD)'];
  for (const entry of filtered) {
    lines.push([csvText(entry.posted_on), csvText(entry.description),
      csvText(accountNames.get(entry.account_id) ?? entry.account_id),
      (entry.amount_cents / 100).toFixed(2)].join(','));
  }
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'globaltrust-transactions.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

get('activity-search').addEventListener('input', () => { page = 0; renderActivity(); });
for (const id of ['activity-account', 'activity-direction']) {
  get(id).addEventListener('change', () => { page = 0; renderActivity(); });
}
get('activity-previous').addEventListener('click', () => { page -= 1; renderActivity(); });
get('activity-next').addEventListener('click', () => { page += 1; renderActivity(); });
get('activity-export').addEventListener('click', exportActivity);

export function reviewCustomerTransfer() {
  const dialog = get('transfer-review');
  const from = get('transfer-from');
  const to = get('transfer-to');
  const amount = get('transfer-amount').valueAsNumber;
  if (dialog.open) return false;
  if (from.value === to.value) {
    get('notice').textContent = 'Choose a different destination account.';
    to.focus();
    return false;
  }
  get('transfer-review-amount').textContent = usd.format(amount);
  get('transfer-review-from').textContent = from.selectedOptions[0].textContent;
  get('transfer-review-to').textContent = to.selectedOptions[0].textContent;
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => {
    resolve(dialog.returnValue === 'confirm');
  }, { once: true }));
}
