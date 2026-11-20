const get = id => document.getElementById(id);
const report = message => { get('chat-status').textContent = message; };
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
  .catch(() => {
    report('Support could not load. Try refreshing this page.');
    throw new Error('Support client unavailable');
  });
const client = createClient('https://lokqdjucexiaxfsubdiw.supabase.co', 'sb_publishable_gM_7YJDOa3SoMNfKJCRmEg_7qBbMaX3');
const thread = get('chat-thread');
const log = get('chat-messages');
const form = get('chat-form');
let userId;
let poll;
let reading = false;
let lastIds = '';

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

async function updateThread() {
  const customer = thread.value;
  if (!customer || reading) return;
  reading = true;
  try {
    const query = columns => client.from('gt_support_messages').select(columns)
      .eq('customer_id', customer).order('id', { ascending: false }).limit(100);
    let result = await query('id,sender_id,body,is_automated');
    if (result.error?.code === '42703') result = await query('id,sender_id,body');
    const messages = unwrap(result).reverse();
    if (customer !== thread.value) return;
    const ids = messages.map(message => message.id).join(',');
    if (lastIds === ids) return;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 70;
    lastIds = ids;
    log.replaceChildren();
    for (const message of messages) {
      const item = document.createElement('li');
      const author = document.createElement('span');
      author.className = 'chat-author';
      author.textContent = message.is_automated ? 'Automated reply' : message.sender_id === userId ? 'You'
        : message.sender_id === customer ? 'Customer' : 'Support';
      item.classList.toggle('mine', !message.is_automated && message.sender_id === userId);
      item.append(author, document.createTextNode(message.body));
      log.append(item);
    }
    if (nearBottom) log.scrollTop = log.scrollHeight;
  } finally {
    reading = false;
    if (customer !== thread.value) void updateThread().catch(showError);
  }
}

function showError(error) {
  if (error.code === 'PGRST205' || error.code === '42P01') {
    report('Live chat is currently unavailable. Please use the Help Center.');
    get('chat-room').hidden = true;
    clearInterval(poll);
    return;
  }
  report('We could not connect to support. Try again in a moment.');
}

thread.addEventListener('change', () => {
  log.replaceChildren();
  lastIds = '';
  void updateThread().catch(showError);
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const input = get('chat-message');
  const body = input.value.trim();
  if (!body) return;
  const submit = form.querySelector('button');
  submit.disabled = true;
  try {
    unwrap(await client.from('gt_support_messages').insert({ customer_id: thread.value, body }));
    form.reset();
    report('Message sent. Replies appear here when staff respond.');
    await updateThread();
  } catch (error) {
    showError(error);
  } finally {
    submit.disabled = false;
  }
});

async function start() {
  const { session } = unwrap(await client.auth.getSession());
  if (!session) {
    report('Sign in to start or continue a support conversation.');
    get('chat-login').hidden = false;
    return;
  }
  userId = session.user.id;
  const adminRole = await client.rpc('gt_is_admin');
  if (adminRole.error && adminRole.error.code !== 'PGRST202') throw adminRole.error;
  const isAdmin = adminRole.data === true;
  const query = client.from('gt_customers').select('id,display_name').order('display_name');
  const customers = unwrap(await (isAdmin ? query.neq('id', userId) : query.eq('id', userId)));
  if (!customers.length) {
    report(isAdmin ? 'No customers are assigned to your staff profile.' : 'Sign in to Online Banking to finish setting up your account before opening chat.');
    get('chat-login').hidden = !isAdmin ? false : true;
    return;
  }
  for (const customer of customers) thread.add(new Option(customer.display_name, customer.id));
  thread.hidden = !isAdmin;
  get('chat-thread-label').hidden = !isAdmin;
  await updateThread();
  get('chat-room').hidden = false;
  report(isAdmin ? 'Select a customer conversation.' : 'Send a message to support. Reply times depend on staff availability.');
  poll = setInterval(() => {
    if (!document.hidden) void updateThread().catch(showError);
  }, 5000);
  window.addEventListener('pagehide', () => clearInterval(poll), { once: true });
}

start().catch(showError);
