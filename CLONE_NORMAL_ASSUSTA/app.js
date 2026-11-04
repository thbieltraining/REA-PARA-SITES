const $ = (selector) => document.querySelector(selector);
const tabs = [$('#tab-calc'), $('#tab-z')];
const calcForm = $('#panel-calc');
const zForm = $('#panel-z');
const result = $('#result');
let lastZ = 0;

function numberFrom(input) {
  const raw = input.value.trim().replace(/\s/g, '').replace(',', '.');
  if (!raw || !Number.isFinite(Number(raw))) return null;
  return Number(raw);
}
function format(value, digits = 4) {
  return value.toFixed(digits).replace('.', ',');
}
// Abramowitz & Stegun 7.1.26 approximation of erf, more than accurate enough
// for the four decimal places shown in this teaching table.
function normalCDF(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return Math.max(0, Math.min(1, 0.5 * (1 + Math.sign(z || 1) * erf)));
}
function areaFromMean(z) { return Math.abs(normalCDF(z) - 0.5); }
function setError(id, message) {
  const input = document.getElementById(id);
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  document.getElementById(`${id}-error`).textContent = message;
}
function clearErrors() {
  ['mean', 'sd', 'x-value', 'z-value'].forEach(id => setError(id, ''));
}
function displayResult(z, description) {
  lastZ = z;
  const cdf = normalCDF(z);
  $('#result-z').textContent = `Z = ${format(z, 2)}`;
  $('#left-prob').textContent = format(cdf);
  $('#right-prob').textContent = format(1 - cdf);
  $('#mean-prob').textContent = format(areaFromMean(z));
  $('#result-description').textContent = description;
  result.classList.remove('hidden');
  $('#table-search').value = format(Math.abs(z), 2);
  showTableValue(Math.abs(z));
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function activateTab(index) {
  tabs.forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
    tab.setAttribute('aria-selected', String(i === index));
  });
  calcForm.classList.toggle('hidden', index !== 0);
  zForm.classList.toggle('hidden', index !== 1);
  result.classList.add('hidden');
}
tabs.forEach((tab, index) => tab.addEventListener('click', () => activateTab(index)));

calcForm.addEventListener('submit', event => {
  event.preventDefault(); clearErrors();
  const mean = numberFrom($('#mean'));
  const sd = numberFrom($('#sd'));
  const x = numberFrom($('#x-value'));
  let invalid = false;
  if (mean === null) { setError('mean', 'Informe uma média válida.'); invalid = true; }
  if (sd === null || sd <= 0) { setError('sd', 'O desvio padrão deve ser maior que zero.'); invalid = true; }
  if (x === null) { setError('x-value', 'Informe um valor válido para X.'); invalid = true; }
  if (invalid) return;
  const z = (x - mean) / sd;
  displayResult(z, `Padronização: Z = (X − μ) ÷ σ = (${format(x, 2)} − ${format(mean, 2)}) ÷ ${format(sd, 2)}.`);
});
zForm.addEventListener('submit', event => {
  event.preventDefault(); clearErrors();
  const z = numberFrom($('#z-value'));
  if (z === null) { setError('z-value', 'Informe um escore Z válido.'); return; }
  displayResult(z, 'O escore informado foi localizado na distribuição normal padronizada.');
});
[calcForm, zForm].forEach(form => form.addEventListener('reset', () => {
  requestAnimationFrame(() => { clearErrors(); result.classList.add('hidden'); clearTableHighlight(); });
}));
$('#recalculate').addEventListener('click', () => {
  activateTab(tabs[0].getAttribute('aria-selected') === 'true' ? 0 : 1);
  const visibleForm = tabs[0].getAttribute('aria-selected') === 'true' ? $('#mean') : $('#z-value');
  visibleForm.focus();
});
$('#show-table').addEventListener('click', () => $('#tabela').scrollIntoView({ behavior: 'smooth' }));
$('#back-top').addEventListener('click', () => $('#inicio').scrollIntoView({ behavior: 'smooth' }));

// Build an accessible standard normal table (0.0–3.9 by hundredth).
const head = $('#z-table thead tr');
for (let column = 0; column < 10; column++) {
  const th = document.createElement('th'); th.scope = 'col'; th.textContent = `0,0${column}`; head.append(th);
}
const body = $('#z-table tbody');
for (let row = 0; row < 40; row++) {
  const tr = document.createElement('tr');
  const label = document.createElement('th'); label.scope = 'row'; label.textContent = `${Math.floor(row / 10)},${row % 10}`; tr.append(label);
  for (let column = 0; column < 10; column++) {
    const hundredth = row / 10 + column / 100;
    const td = document.createElement('td'); td.dataset.z = hundredth.toFixed(2); td.textContent = format(areaFromMean(hundredth)); tr.append(td);
  }
  body.append(tr);
}
function clearTableHighlight() { document.querySelectorAll('#z-table td.match').forEach(cell => cell.classList.remove('match')); $('#table-message').textContent = ''; }
function showTableValue(value) {
  clearTableHighlight();
  if (!Number.isFinite(value) || value < 0 || value >= 4) {
    $('#table-message').textContent = value >= 4 ? 'Para |Z| ≥ 4, a área entre a média e Z é aproximadamente 0,5000.' : 'Informe um valor de Z não negativo.';
    return;
  }
  const rounded = (Math.round(value * 100) / 100).toFixed(2);
  const cell = document.querySelector(`#z-table td[data-z="${rounded}"]`);
  if (cell) {
    cell.classList.add('match');
    $('#table-message').textContent = `Z = ${format(value, 2)} · área entre a média e |Z| ≈ ${cell.textContent}`;
  }
}
$('#table-search').addEventListener('input', () => {
  const value = numberFrom($('#table-search'));
  if (value === null) { clearTableHighlight(); return; }
  showTableValue(Math.abs(value));
});

const credits = $('#credits');
$('#credits-button').addEventListener('click', () => credits.showModal());
$('#close-credits').addEventListener('click', () => credits.close());
$('.dialog-close').addEventListener('click', () => credits.close());
credits.addEventListener('click', event => { if (event.target === credits) credits.close(); });

// Start in the dark UNIVESP theme; remember the reader's preference when available.
const themeToggle = $('#theme-toggle');
const themeIcon = themeToggle.querySelector('.theme-icon');
const themeLabel = themeToggle.querySelector('.theme-label');
function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark';
  themeIcon.textContent = dark ? '☼' : '◐';
  themeLabel.textContent = dark ? 'Tema claro' : 'Tema escuro';
  const action = 'Alternar para tema ' + (dark ? 'claro' : 'escuro');
  themeToggle.setAttribute('aria-label', action);
  themeToggle.setAttribute('title', action);
  themeToggle.setAttribute('aria-pressed', String(dark));
  document.querySelector('meta[name="theme-color"]').content = dark ? '#111111' : '#ffffff';
  if (persist) {
    try { localStorage.setItem('normal-assusta-theme', theme); } catch (_) { /* storage may be unavailable on file URLs */ }
  }
}
let initialTheme = 'dark';
try {
  const savedTheme = localStorage.getItem('normal-assusta-theme');
  if (savedTheme === 'dark' || savedTheme === 'light') initialTheme = savedTheme;
} catch (_) { /* use the default theme when storage is unavailable */ }
setTheme(initialTheme, false);
themeToggle.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});
