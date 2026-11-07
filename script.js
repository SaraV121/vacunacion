const $ = id => document.getElementById(id);

// EDO: dy/dt = k (M - y)
const f = (P, y) => P.k * (P.M - y);
// Solución analítica: y(t) = M - (M - y0) e^(-kt)
const exacta = (P, t) => P.M - (P.M - P.y0) * Math.exp(-P.k * t);

// Método de Heun (Runge-Kutta de orden 2)
function heun(P, h, n) {
  let y = P.y0; const r = [y];
  for (let i = 0; i < n; i++) {
    const k1 = f(P, y);
    const k2 = f(P, y + h * k1);
    y += (h / 2) * (k1 + k2);
    r.push(y);
  }
  return r;
}

// Runge-Kutta clásico de orden 4
function rk4(P, h, n) {
  let y = P.y0; const r = [y];
  for (let i = 0; i < n; i++) {
    const k1 = f(P, y);
    const k2 = f(P, y + h * k1 / 2);
    const k3 = f(P, y + h * k2 / 2);
    const k4 = f(P, y + h * k3);
    y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    r.push(y);
  }
  return r;
}

function simular(P, h) {
  const n = Math.round(P.T / h);
  const H = heun(P, h, n), R = rk4(P, h, n);
  const rows = H.map((_, i) => {
    const t = i * h, e = exacta(P, t);
    return {
      t, e, H: H[i], R: R[i],
      eH: Math.abs(e - H[i]), eR: Math.abs(e - R[i]),
      rH: Math.abs(e - H[i]) / e * 100, rR: Math.abs(e - R[i]) / e * 100
    };
  });
  return {
    h, n, rows,
    maxH: Math.max(...rows.map(r => r.eH)),
    maxR: Math.max(...rows.map(r => r.eR))
  };
}

const fm = (x, d = 3) => x.toFixed(d);

function grafica(P, s) {
  const W = 880, Hh = 300;
  const c = document.createElement('canvas');
  c.width = W * 2; c.height = Hh * 2;
  const g = c.getContext('2d'); g.scale(2, 2);
  const st = getComputedStyle(document.documentElement);
  const col = n => st.getPropertyValue(n).trim();
  const L = 55, B = Hh - 30, Tp = 10, R = W - 10, N = 400;
  const lo = Math.min(P.y0, ...s.rows.map(r => r.H));
  const hi = Math.max(P.M, ...s.rows.map(r => r.H));
  const X = t => L + (R - L) * t / P.T;
  const Y = y => B - (B - Tp) * (y - lo) / (hi - lo || 1);

  g.strokeStyle = col('--bd'); g.fillStyle = col('--mut'); g.font = '11px sans-serif';
  for (let i = 0; i <= 4; i++) {
    const y = lo + (hi - lo) * i / 4;
    g.beginPath(); g.moveTo(L, Y(y)); g.lineTo(R, Y(y)); g.stroke();
    g.fillText(Math.round(y), 5, Y(y) + 4);
  }
  for (let i = 0; i <= 5; i++) {
    const t = P.T * i / 5; g.fillText(fm(t, 0), X(t) - 6, Hh - 14);
  }
  g.fillText('t (días)', R - 45, Hh - 2);
  g.fillText('y (personas)', 5, 8);

  // analítica
  g.strokeStyle = col('--c1'); g.lineWidth = 2; g.beginPath();
  for (let i = 0; i <= N; i++) {
    const t = P.T * i / N, x = X(t), y = Y(exacta(P, t));
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();

  const linea = (k, color, dash) => {
    g.strokeStyle = col(color); g.setLineDash(dash); g.beginPath();
    s.rows.forEach((r, i) => i ? g.lineTo(X(r.t), Y(r[k])) : g.moveTo(X(r.t), Y(r[k])));
    g.stroke(); g.setLineDash([]); g.fillStyle = col(color);
    s.rows.forEach(r => { g.beginPath(); g.arc(X(r.t), Y(r[k]), 3, 0, 7); g.fill(); });
  };
  linea('H', '--c2', [6, 4]);
  linea('R', '--c3', [2, 3]);
  return c;
}

function bloque(P, s) {
  const d = document.createElement('div');
  d.innerHTML = `<h2>Resultados con h = ${s.h} días (${s.n} pasos)</h2>
    <div class="lg"><span>▬ Analítica</span>
    <span style="color:var(--c2)">● Heun</span>
    <span style="color:var(--c3)">● RK4</span></div>`;
  d.appendChild(grafica(P, s));
  const e = document.createElement('div'); e.className = 'sc';
  e.innerHTML = `<table><tr><th>i</th><th>t (d)</th><th>Analítica</th><th>Heun</th><th>RK4</th>
    <th>Err abs Heun</th><th>Err abs RK4</th><th>Err rel Heun %</th><th>Err rel RK4 %</th></tr>` +
    s.rows.map((r, i) => `<tr><td>${i}</td><td>${fm(r.t, 2)}</td><td>${fm(r.e)}</td>
      <td>${fm(r.H)}</td><td>${fm(r.R)}</td><td>${r.eH.toExponential(2)}</td>
      <td>${r.eR.toExponential(2)}</td><td>${fm(r.rH, 4)}</td><td>${fm(r.rR, 4)}</td></tr>`).join('') +
    `</table>`;
  d.appendChild(e);
  return d;
}

function ejecutar() {
  const P = { y0: +$('y0').value, M: +$('M').value, k: +$('k').value, T: +$('T').value };
  const hs = [+$('h1').value, +$('h2').value];
  const er = [];

  // Validación de entradas
  if (!(P.M > 0)) er.push('M debe ser > 0.');
  if (!(P.y0 >= 0 && P.y0 < P.M)) er.push('Se requiere 0 ≤ y₀ < M.');
  if (!(P.k > 0)) er.push('k debe ser > 0.');
  if (!(P.T > 0)) er.push('T debe ser > 0.');
  hs.forEach((h, i) => {
    if (!(h > 0 && h <= P.T)) er.push(`h${i + 1} debe estar entre 0 y T.`);
    else if (Math.abs(P.T / h - Math.round(P.T / h)) > 1e-9) er.push(`T/h${i + 1} debe ser entero.`);
    else if (P.T / h > 2000) er.push(`h${i + 1} genera demasiados pasos.`);
  });
  $('err').textContent = er.join(' ');
  if (er.length) return;

  const S = hs.map(h => simular(P, h));
  const o = $('out'); o.innerHTML = '';

  const sum = document.createElement('div'); sum.className = 'card';
  sum.innerHTML = `<b>Resumen de errores (máximo error absoluto, personas)</b>
    <div class="sc"><table><tr><th>h (días)</th><th>Heun</th><th>RK4</th><th>Menor error</th></tr>` +
    S.map(s => `<tr><td>${s.h}</td><td>${s.maxH.toExponential(3)}</td><td>${s.maxR.toExponential(3)}</td>
      <td>${s.maxR < s.maxH ? 'RK4' : 'Heun'}</td></tr>`).join('') + `</table></div>`;
  o.appendChild(sum);

  S.forEach(s => o.appendChild(bloque(P, s)));

  const meta = 0.8 * P.M;
  const tm = Math.log((P.M - P.y0) / (P.M - meta)) / P.k;
  const it = document.createElement('div'); it.className = 'card';
  it.innerHTML = `<b>Interpretación.</b> Según el modelo, la cobertura del 80 % (${fm(meta, 0)} personas)
    se alcanza en t = ln((M−y₀)/(M−0.8M))/k ≈ <b>${fm(tm, 1)} días</b>.
    Al final de ${P.T} días, la solución exacta da ${fm(exacta(P, P.T), 1)} personas vacunadas
    (${fm(exacta(P, P.T) / P.M * 100, 1)} %). RK4 reproduce la curva exacta con errores mucho menores
    que Heun, y al reducir h ambos métodos mejoran. Limitación: modelo simplificado con k constante y
    parámetros hipotéticos; no es una predicción comprobada con datos reales.`;
  o.appendChild(it);
}

$('btn').addEventListener('click', ejecutar);
ejecutar();