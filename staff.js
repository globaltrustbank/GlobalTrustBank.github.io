const get = id => document.getElementById(id);
const customerPortal = document.body.dataset.portal === 'customer';
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
  const [accounts, transactions] = (await Promise.all([
    client.from('gt_accounts').select('name,last_four,balance_cents').eq('customer_id', customer).order('name'),
    client.from('gt_transactions').select('posted_on,description,account_id,amount_cents').eq('customer_id', customer).order('posted_on', { ascending: false }).limit(100)
  ])).map(unwrap);
  if (request !== selection) return;
  records.replaceChildren();
  if (accounts.length) appendList(records, 'Accounts · USD', accounts.map(
    row => row.name + ' · ' + row.last_four + ' · ' + usd.format(row.balance_cents / 100)
  ));
  if (transactions.length) appendList(records, 'Transaction review · USD', transactions.map(
    row => row.posted_on + ' · ' + row.description + ' · ' + row.account_id + ' · ' + usd.format(row.amount_cents / 100)
  ));
  if (!accounts.length && !transactions.length) records.textContent = 'No records are available for this customer.';
}

async function refresh() {
  const { session } = unwrap(await client.auth.getSession());
  if (customerPortal) get('registration').hidden = true;
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
  const { currentLevel } = unwrap(await client.auth.mfa.getAuthenticatorAssuranceLevel());
  if (currentLevel !== 'aal2') {
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
  const customerQuery = () => {
    const query = client.from('gt_customers').select('id,display_name').order('display_name');
    return customerPortal ? query.eq('id', session.user.id) : query;
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

function bind(formId, action) {
  get(formId).addEventListener('submit', async event => {
    event.preventDefault();
    const buttons = document.querySelectorAll('button');
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
    report('');
    await refresh();
  } catch (error) { report(error.message); }
});
refresh().then(() => {
  if (get('notice').textContent === 'Connecting to Online Banking…') report('');
}).catch(error => report(error.message));
