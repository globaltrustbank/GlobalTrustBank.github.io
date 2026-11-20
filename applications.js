const catalog = {
  "everyday-checking": {
    "name": "Everyday Checking",
    "detail": "For deposits, routine purchases, and transfers.",
    "form": "deposit",
    "category": "checking"
  },
  "student-checking": {
    "name": "Student Checking",
    "detail": "A checking option for managing school and everyday expenses.",
    "form": "deposit",
    "category": "checking"
  },
  "reserve-savings": {
    "name": "Reserve Savings",
    "detail": "Keep money available for a savings goal.",
    "form": "deposit",
    "category": "savings"
  },
  "fixed-term-cd": {
    "name": "Fixed-term CD",
    "detail": "Choose a term for a set-aside balance.",
    "form": "cd",
    "category": "savings"
  },
  "cash-back-card": {
    "name": "Cash Back Card",
    "detail": "Compare rewards for everyday purchases.",
    "form": "credit",
    "category": "credit-cards"
  },
  "travel-rewards-card": {
    "name": "Travel Rewards Card",
    "detail": "Explore points for travel spending.",
    "form": "credit",
    "category": "credit-cards"
  },
  "low-interest-card": {
    "name": "Low Interest Card",
    "detail": "Explore a card designed around interest costs.",
    "form": "credit",
    "category": "credit-cards"
  },
  "balance-transfer-card": {
    "name": "Balance Transfer Card",
    "detail": "Explore consolidating a balance onto one card.",
    "form": "credit",
    "category": "credit-cards"
  },
  "student-card": {
    "name": "Student Credit Card",
    "detail": "Explore a first credit card for students.",
    "form": "credit",
    "category": "credit-cards"
  },
  "secured-card": {
    "name": "Secured Credit Card",
    "detail": "Explore a card backed by a refundable deposit.",
    "form": "credit",
    "category": "credit-cards"
  },
  "business-rewards-card": {
    "name": "Business Rewards Card",
    "detail": "Explore rewards for business purchases.",
    "form": "credit",
    "category": "credit-cards"
  },
  "home-purchase": {
    "name": "Home purchase",
    "detail": "Plan the amount and term of a purchase loan.",
    "form": "mortgage",
    "category": "home-loans"
  },
  "home-refinance": {
    "name": "Mortgage refinance",
    "detail": "Compare a new mortgage term for an existing balance.",
    "form": "mortgage",
    "category": "home-loans"
  },
  "home-equity": {
    "name": "Home equity line of credit",
    "detail": "Explore borrowing against home equity.",
    "form": "credit",
    "category": "home-loans"
  },
  "new-auto": {
    "name": "New vehicle loan",
    "detail": "Plan financing for a new vehicle.",
    "form": "auto",
    "category": "auto"
  },
  "used-auto": {
    "name": "Used vehicle loan",
    "detail": "Plan financing for a used vehicle.",
    "form": "auto",
    "category": "auto"
  },
  "auto-refinance": {
    "name": "Vehicle refinance",
    "detail": "Compare a different term for an existing loan.",
    "form": "auto",
    "category": "auto"
  },
  "business-checking": {
    "name": "Business Checking",
    "detail": "Separate business receipts and expenses.",
    "form": "deposit",
    "category": "business"
  },
  "merchant-services": {
    "name": "Merchant services",
    "detail": "Choose how a business would accept payments.",
    "form": "merchant",
    "category": "business"
  },
  "business-credit": {
    "name": "Business line of credit",
    "detail": "Plan a credit amount for business expenses.",
    "form": "credit",
    "category": "business"
  },
  "travel-planning": {
    "name": "Trip planning",
    "detail": "Plan a budget and time frame for a trip.",
    "form": "travel",
    "category": "travel"
  },
  "travel-experiences": {
    "name": "Travel experiences",
    "detail": "Choose an activity and estimated budget.",
    "form": "travel",
    "category": "travel"
  },
  "travel-rewards": {
    "name": "Travel rewards",
    "detail": "Explore a card for earning travel points.",
    "form": "credit",
    "category": "travel"
  },
  "brokerage-account": {
    "name": "Brokerage account",
    "detail": "Explore a general-purpose investment account.",
    "form": "investing",
    "category": "investing"
  },
  "retirement-account": {
    "name": "Retirement account",
    "detail": "Explore a long-term retirement savings account.",
    "form": "investing",
    "category": "investing"
  },
  "investment-consultation": {
    "name": "Investment planning consultation",
    "detail": "Prepare a goal and time horizon for a planning conversation.",
    "form": "investing",
    "category": "investing"
  }
};
const amount = label => [label, 'number'];
const choices = (label, ...options) => [label, 'select', options];
const fields = {
  deposit: [amount('Illustrative opening deposit (USD)'), choices('Primary use', 'Everyday spending', 'Saving toward a goal', 'Business expenses')],
  cd: [amount('Illustrative opening deposit (USD)'), choices('Term', '6 months', '12 months', '24 months', '36 months', '60 months')],
  credit: [amount('Illustrative credit amount (USD)'), choices('Preferred use', 'Everyday purchases', 'Travel', 'Balance transfer', 'Business expenses')],
  mortgage: [amount('Illustrative loan amount (USD)'), choices('Loan term', '15 years', '20 years', '30 years')],
  auto: [amount('Illustrative loan amount (USD)'), choices('Loan term', '36 months', '48 months', '60 months', '72 months')],
  merchant: [choices('Payment channel', 'In person', 'Online', 'In person and online'), choices('Monthly volume range', 'Under $1,000', '$1,000–$10,000', 'Over $10,000')],
  travel: [amount('Illustrative budget (USD)'), choices('Time frame', 'Within 3 months', '3–6 months', '6–12 months', 'More than a year')],
  investing: [choices('Goal', 'Retirement', 'Long-term savings', 'Other financial goal'), choices('Time horizon', 'Up to 5 years', '5–10 years', 'More than 10 years')]
};
const get = id => document.getElementById(id);
const productId = new URLSearchParams(location.search).get('product');
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function setup(product) {
  const definitions = fields[product.form];
  const form = get('application-form');
  const review = get('application-review');
  const receipt = get('application-receipt');
  const status = get('application-status');
  let draft;

  get('application-title').textContent = product.name + ' application';
  get('application-description').textContent = product.detail;
  get('application-back').href = './' + product.category + '.html#applications';
  get('application-back').textContent = 'Back to product options';
  get('application-panel').hidden = false;
  definitions.forEach(([label, type, values], index) => {
    const wrapper = document.createElement('label');
    wrapper.textContent = label;
    let input;
    if (type === 'select') {
      input = document.createElement('select');
      input.add(new Option('Choose an option', ''));
      for (const value of values) input.add(new Option(value, value));
    } else {
      input = document.createElement('input');
      input.type = 'number';
      input.min = '0.01';
      input.max = '100000000';
      input.step = '0.01';
    }
    input.name = 'choice-' + index;
    input.required = true;
    wrapper.append(input);
    get('application-fields').append(wrapper);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(form);
    draft = definitions.map(([label, type], index) => {
      const raw = values.get('choice-' + index);
      return { label, value: type === 'number' ? usd.format(Number(raw)) : raw };
    });
    const details = get('application-choices');
    details.replaceChildren();
    for (const { label, value } of draft) {
      const term = document.createElement('dt');
      const definition = document.createElement('dd');
      term.textContent = label;
      definition.textContent = value;
      details.append(term, definition);
    }
    status.textContent = '';
    form.hidden = true;
    review.hidden = false;
    get('confirm-application').focus();
  });

  get('edit-application').addEventListener('click', () => {
    review.hidden = true;
    form.hidden = false;
    form.elements[0].focus();
  });
  get('confirm-application').addEventListener('click', () => {
    const reference = crypto.randomUUID().split('-')[0].toUpperCase();
    try {
      localStorage.setItem('globaltrust-last-application', JSON.stringify({ reference, product: productId, choices: draft }));
    } catch {
      status.textContent = 'This browser could not save the application. Your choices are still available to review.';
      return;
    }
    get('application-reference').textContent = product.name + ' · Reference ' + reference + '. Saved in this browser.';
    review.hidden = true;
    receipt.hidden = false;
    get('new-application').focus();
  });
  get('new-application').addEventListener('click', () => {
    form.reset();
    receipt.hidden = true;
    form.hidden = false;
    form.elements[0].focus();
  });
}

if (productId && Object.hasOwn(catalog, productId)) setup(catalog[productId]);
