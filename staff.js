const get = id => document.getElementById(id);
const customerPortal = document.body.dataset.portal === 'customer';
const customerDashboard = customerPortal ? await import('./customer-dashboard.js') : null;
const report = message => { get('notice').textContent = message; };
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').catch(() => {
  report('Sign-in service could not be loaded. Reload this page to retry.');
  throw new Error('Supabase client unavailable');
});
const client = createClient(
  'https://lokqdjucexiaxfsubdiw.supabase.co',
  'sb_publishable_gM_7YJDOa3SoMNfKJCRmEg_7qBbMaX3'
);
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
let factorId;
let selection = 0;
let admin = false;
let requestAuthenticator = false;
let pendingAction;

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

function appendList(container, label, items) {
  const heading = document.createElement('h3');
  heading.textContent = label;
  const list = document.createElement('ul');
  for (const item of items) {
    const entry = document.createElement('li');
    entry.textContent = item;
    list.append(entry);
  }
  container.append(heading, list);
}

async function loadRecords() {
  const request = ++selection;
  const customer = get('customer').value;
  const records = get('records');
  records.replaceChildren();
  if (!customer) {
    records.textContent = 'No customers are assigned to this profile.';
    return;
  }
  records.textContent = 'Loading customer records…';
  const accountQuery = columns => client.from('gt_accounts').select(columns).eq('customer_id', customer).order('name');
  const basicColumns = 'name,last_four,balance_cents';
  const accountResults = async () => {
    if (!admin && !customerPortal) return accountQuery(basicColumns);
    const result = await accountQuery('id,suspended,' + basicColumns);
    if (customerPortal && result.error?.code === '42703') return accountQuery('id,' + basicColumns);
    return result;
  };
  const [accounts, transactions] = (await Promise.all([
    accountResults(),
    client.from('gt_transactions').select(admin ? 'id,posted_on,description,account_id,amount_cents,reversal_of' : 'posted_on,description,account_id,amount_cents').eq('customer_id', customer).order('posted_on', { ascending: false }).order('id', { ascending: false }).limit(100)
  ])).map(unwrap);
  if (request !== selection) return;
  records.replaceChildren();
  if (admin) {
    renderManagement(records, customer, accounts, transactions);
    return;
  }
  if (!customerPortal) {
    if (accounts.length) appendList(records, 'Accounts · USD', accounts.map(
      row => row.name + ' · ' + row.last_four + ' · ' + usd.format(row.balance_cents / 100) + (row.suspended ? ' · Suspended' : '')
    ));
    if (transactions.length) appendList(records, 'Transaction review · USD', transactions.map(
      row => row.posted_on + ' · ' + row.description + ' · ' + row.account_id + ' · ' + usd.format(row.amount_cents / 100)
    ));
    if (!accounts.length && !transactions.length) records.textContent = 'No records are available for this customer.';
    return;
  }
  customerDashboard.showCustomerDashboard(accounts, transactions);
  const active = accounts.filter(row => row.id && !row.suspended);
  get('transfer-form').hidden = active.length < 2;
  get('transfer-unavailable').hidden = active.length >= 2;
  for (const id of ['transfer-from', 'transfer-to']) {
    get(id).replaceChildren(...active.map(row => new Option(row.name + ' ••' + row.last_four, row.id)));
  }
  if (active.length > 1) get('transfer-to').selectedIndex = 1;
}

function renderManagement(records, customer, accounts, transactions) {
  function section(heading) {
    const title = document.createElement('h3');
    title.textContent = heading;
    const list = document.createElement('ul');
    list.className = 'management-list';
    records.append(title, list);
    return list;
  }

  function row(list, text, actions) {
    const item = document.createElement('li');
    const description = document.createElement('span');
    description.textContent = text;
    item.append(description);
    for (const [label, action, account, id] of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => openManagement(label, text, { customer, action, account, id }));
      item.append(button);
    }
    list.append(item);
  }

  if (accounts.length) {
    const list = section('Accounts · USD');
    for (const account of accounts) {
      const status = account.suspended ? 'Suspended' : 'Active';
      const actions = account.suspended
        ? [['Reactivate', 'reactivate', account.id]]
        : [['Fund', 'fund', account.id], ['Suspend', 'suspend', account.id]];
      row(list, account.name + ' ••' + account.last_four + ' · ' + usd.format(account.balance_cents / 100) + ' · ' + status, actions);
    }
  }
  if (transactions.length) {
    const list = section('Transaction review · USD');
    const reversed = new Set(transactions.map(entry => entry.reversal_of));
    for (const entry of transactions) {
      const canReverse = !entry.reversal_of && !reversed.has(entry.id);
      const text = entry.posted_on + ' · ' + entry.description + ' · ' + usd.format(entry.amount_cents / 100)
        + (reversed.has(entry.id) ? ' · Reversed' : '');
      row(list, text, canReverse ? [['Reverse', 'reverse', entry.account_id, entry.id]] : []);
    }
  }
  if (!accounts.length && !transactions.length) records.textContent = 'No records are available for this customer.';
}

function openManagement(label, description, action) {
  pendingAction = action;
  get('manage-title').textContent = label + (action.action === 'reverse' ? ' transaction' : ' account');
  get('manage-account').textContent = description;
  get('manage-error').textContent = '';
  get('manage-form').reset();
  const funding = action.action === 'fund';
  get('fund-label').hidden = !funding;
  get('fund-amount').hidden = !funding;
  get('fund-amount').required = funding;
  get('manage-dialog').showModal();
}

async function refresh() {
  const { session } = unwrap(await client.auth.getSession());
  admin = false;
  get(customerPortal ? 'customer-mfa' : 'staff-mfa').hidden = true;
  get('skip-mfa').hidden = true;
  if (customerPortal) {
    get('registration').hidden = true;
    customerDashboard.clearCustomerDashboard();
  }
  get('sign-in').hidden = Boolean(session);
  get('logout').hidden = !session;
  get('mfa').hidden = true;
  get('portal').hidden = true;
  get('enrollment').hidden = true;
  get('qr').removeAttribute('src');
  ++selection;
  get('records').replaceChildren();
  get('customer').replaceChildren();
  if (!session) return;
  if (!customerPortal) {
    const result = await client.rpc('gt_is_admin');
    if (result.error && result.error.code !== 'PGRST202') throw result.error;
    admin = result.data === true;
  }
  const { currentLevel } = unwrap(await client.auth.mfa.getAuthenticatorAssuranceLevel());
  let optionalAuthenticator = admin;
  if (customerPortal && currentLevel !== 'aal2') {
    const result = await client.rpc('gt_customer_auth_ready');
    if (result.error && result.error.code !== 'PGRST202') throw result.error;
    optionalAuthenticator = result.data === true;
  }
  if (currentLevel !== 'aal2' && (!optionalAuthenticator || requestAuthenticator)) {
    if (optionalAuthenticator) get('skip-mfa').hidden = false;
    const factors = unwrap(await client.auth.mfa.listFactors());
    const verified = factors.totp.find(item => item.status === 'verified');
    if (verified) {
      factorId = verified.id;
    } else {
      for (const existing of factors.all.filter(item => item.factor_type === 'totp' && item.status === 'unverified')) {
        unwrap(await client.auth.mfa.unenroll({ factorId: existing.id }));
      }
      const enrollment = unwrap(await client.auth.mfa.enroll({ factorType: 'totp' }));
      factorId = enrollment.id;
      get('qr').src = enrollment.totp.qr_code;
      get('enrollment').hidden = false;
    }
    get('mfa').hidden = false;
    return;
  }
  if (optionalAuthenticator) get(customerPortal ? 'customer-mfa' : 'staff-mfa').hidden = currentLevel === 'aal2';
  const customerQuery = () => {
    const query = client.from('gt_customers').select('id,display_name').order('display_name');
    if (customerPortal) return query.eq('id', session.user.id);
    if (admin) return query.neq('id', session.user.id);
    return query;
  };
  let customers = unwrap(await customerQuery());
  if (customerPortal && !customers.length && session.user.user_metadata?.gt_customer_signup === true) {
    unwrap(await client.rpc('gt_open_demo_account'));
    customers = unwrap(await customerQuery());
  }
  if (customerPortal && !customers.length) {
    report('Your customer profile has not been set up yet.');
    return;
  }
  for (const customer of customers) {
    get('customer').add(new Option(customer.display_name, customer.id));
  }
  if (customerPortal) get('customer-heading').textContent = 'Welcome, ' + customers[0].display_name;
  get('customer').disabled = !customers.length;
  get('portal').hidden = false;
  await loadRecords();
}

function bind(formId, action, review) {
  const form = get(formId);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (review && !(await review())) return;
    const buttons = form.querySelectorAll('button[type="submit"], button:not([type])');
    for (const button of buttons) button.disabled = true;
    report('');
    try { await action(); }
    catch (error) { report(error.message); }
    finally { for (const button of buttons) button.disabled = false; }
  });
}

bind('login', async () => {
  unwrap(await client.auth.signInWithPassword({ email: get('email').value.trim(), password: get('password').value }));
  get('login').reset();
  await refresh();
});
if (customerPortal) {
  bind('transfer-form', async () => {
    const from = get('transfer-from').value;
    const to = get('transfer-to').value;
    unwrap(await client.rpc('gt_transfer_usd', {
      source_account: from, destination_account: to,
      amount_cents: Math.round(get('transfer-amount').valueAsNumber * 100)
    }));
    get('transfer-form').reset();
    report('Transfer recorded.');
    await loadRecords();
  }, customerDashboard.reviewCustomerTransfer);
  function showRegistration(open) {
    get('registration').hidden = !open;
    get('sign-in').hidden = open;
    get(open ? 'login' : 'signup').reset();
    get(open ? 'signup-name' : 'email').focus();
    report('');
  }

  get('show-signup').addEventListener('click', () => showRegistration(true));
  get('show-signin').addEventListener('click', () => showRegistration(false));
  bind('signup', async () => {
    const displayName = get('signup-name').value.trim();
    if (!displayName) {
      report('Enter a display name.');
      get('signup-name').focus();
      return;
    }
    const email = get('signup-email').value.trim();
    const { session } = unwrap(await client.auth.signUp({
      email,
      password: get('signup-password').value,
      options: {
        emailRedirectTo: new URL('./customer.html', location.href).href,
        data: { gt_customer_signup: true, gt_display_name: displayName }
      }
    }));
    if (session) {
      get('signup').reset();
      await refresh();
      return;
    }
    showRegistration(false);
    get('email').value = email;
    report('Check your email for a confirmation link, then return to sign in.');
  });
}
bind('verify', async () => {
  const code = get('code').value;
  get('verify').reset();
  unwrap(await client.auth.mfa.challengeAndVerify({ factorId, code }));
  await refresh();
});
get('customer').addEventListener('change', () => loadRecords().catch(error => {
  get('records').textContent = '';
  report(error.message);
}));
get('logout').addEventListener('click', async () => {
  try {
    unwrap(await client.auth.signOut({ scope: 'local' }));
    requestAuthenticator = false;
    report('');
    await refresh();
  } catch (error) { report(error.message); }
});
get(customerPortal ? 'customer-mfa' : 'staff-mfa').addEventListener('click', () => {
    requestAuthenticator = true;
    refresh().catch(error => report(error.message));
  });
  get('skip-mfa').addEventListener('click', () => {
    requestAuthenticator = false;
    report('');
    refresh().catch(error => report(error.message));
  });
if (!customerPortal) {
  get('manage-cancel').addEventListener('click', () => get('manage-dialog').close());
  get('manage-form').addEventListener('submit', async event => {
    event.preventDefault();
    const { customer, account, action, id } = pendingAction;
    const submit = get('manage-submit');
    submit.disabled = true;
    get('manage-error').textContent = '';
    try {
      unwrap(await client.rpc('gt_manage_account', {
        target_customer: customer, target_account: account, action_name: action,
        credit_cents: action === 'fund' ? Math.round(get('fund-amount').valueAsNumber * 100) : null,
        original_id: id ?? null
      }));
      get('manage-dialog').close();
      report('Account update recorded.');
      await loadRecords();
    } catch (error) {
      if (get('manage-dialog').open) get('manage-error').textContent = error.message;
      else report(error.message);
    } finally {
      submit.disabled = false;
    }
  });
}
refresh().then(() => {
  if (get('notice').textContent === 'Connecting to Online Banking…') report('');
  if (customerPortal && location.hash === '#create-account' && !get('sign-in').hidden) {
    get('show-signup').click();
  }
}).catch(error => report(error.message));
