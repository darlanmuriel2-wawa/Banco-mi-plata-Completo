/**
 * dashboardApp.js - lógica de la interfaz del panel del cajero.
 * Usa AuthController y BankController; no calcula reglas de negocio aquí.
 */
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  // ---------- Guardia de sesión ----------
  const sesion = AuthController.usuarioActual();
  if (!sesion) { location.href = 'auth.html?modo=login'; return; }
  if (sesion.esAdmin()) { location.href = 'admin-users.html'; return; }

  // Siempre se trabaja con la versión más reciente guardada
  const U = () => AuthController.usuarioActual();

  const NOMBRES = BankController.NOMBRES;
  const ejecutar = (fn) => {
    try { return fn(); } catch (err) { toast(err.message, 'error'); return null; }
  };

  // ---------- Navegación ----------
  function mostrarSeccion(nombre) {
    document.querySelectorAll('.seccion').forEach((s) => s.classList.toggle('activa', s.id === 'sec-' + nombre));
    document.querySelectorAll('.menu-lateral [data-seccion]').forEach((b) => b.classList.toggle('activo', b.dataset.seccion === nombre));
    if (nombre === 'saldo') renderSaldos();
    if (nombre === 'retirar') renderPreviewRetiro();
    if (nombre === 'movimientos') renderMovimientos();
    if (nombre === 'tarjeta') renderTarjeta();
    if (nombre === 'perfil') renderPerfil();
  }
  document.querySelectorAll('.menu-lateral [data-seccion]').forEach((b) =>
    b.addEventListener('click', () => mostrarSeccion(b.dataset.seccion)));
  $('btnCerrarSesion').addEventListener('click', () => {
    AuthController.cerrarSesion();
    location.href = '../index.html';
  });

  function actualizarSaludo() {
    $('saludo').textContent = `Hola, ${U().nombre.split(' ')[0]} 👋`;
  }

  // ---------- Consultar saldo ----------
  function renderSaldos() {
    const r = BankController.consultarSaldos(U());
    const a = r.ahorros, c = r.corriente, t = r.tarjeta;
    $('tarjetasSaldo').innerHTML = `
      <div class="saldo-card">
        <small>Cuenta de Ahorros · ${escapar(a.numeroCuenta)}</small>
        <div class="monto">${formatoMoneda(a.saldo)}</div>
        <div class="detalle">Interés mensual: 1.5% (se aplica al retirar)</div>
      </div>
      <div class="saldo-card ${c.saldo < 0 ? 'rojo' : ''}">
        <small>Cuenta Corriente · ${escapar(c.numeroCuenta)}</small>
        <div class="monto">${formatoMoneda(c.saldo)}</div>
        <div class="detalle">Límite de retiro con sobregiro: ${formatoMoneda(c.disponible)}</div>
      </div>
      <div class="saldo-card tarjeta">
        <small>Tarjeta de Crédito · ${escapar(t.numeroCuenta)}</small>
        <div class="monto">${formatoMoneda(t.cupoDisponible)}</div>
        <div class="detalle">Cupo disponible de ${formatoMoneda(t.cupoTotal)} · Deuda: ${formatoMoneda(t.deuda)}</div>
      </div>`;
  }

  // ---------- Consignar ----------
  $('formConsignar').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = datosFormulario(e.target);
    const saldo = ejecutar(() => BankController.consignar(U(), d.cuenta, Number(d.monto)));
    if (saldo === null) return;
    toast(`Consignación exitosa. Nuevo saldo: ${formatoMoneda(saldo)}`);
    e.target.reset();
  });

  // ---------- Retirar ----------
  function renderPreviewRetiro() {
    const u = U();
    const tipo = $('retCuenta').value;
    const monto = Number($('retMonto').value);
    const cuenta = u.getCuenta(tipo);
    let html;
    if (tipo === 'ahorros') {
      const interes = cuenta.calcularInteres();
      html = `Saldo actual: <b>${formatoMoneda(cuenta.saldo)}</b>. Al retirar se abonará un interés del 1.5% (<b>${formatoMoneda(interes)}</b>).`;
      if (monto > 0 && monto <= cuenta.saldo) {
        html += ` Saldo después del retiro: <b>${formatoMoneda(cuenta.calcularRetiro(monto).saldoFinal)}</b>.`;
      }
    } else {
      html = `Saldo actual: <b>${formatoMoneda(cuenta.saldo)}</b>. Puedes retirar hasta <b>${formatoMoneda(cuenta.limiteRetiro())}</b> (saldo + 20% de sobregiro).`;
      if (monto > cuenta.saldo && monto <= cuenta.limiteRetiro()) {
        html += ` Este retiro usa <b>${formatoMoneda(cuenta.calcularRetiro(monto).sobregiro)}</b> de sobregiro.`;
      }
    }
    $('previewRetiro').innerHTML = html;
  }
  $('retCuenta').addEventListener('change', renderPreviewRetiro);
  $('retMonto').addEventListener('input', renderPreviewRetiro);
  $('formRetirar').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = datosFormulario(e.target);
    const r = ejecutar(() => BankController.retirar(U(), d.cuenta, Number(d.monto)));
    if (!r) return;
    const extra = r.interes > 0 ? ` (interés abonado: ${formatoMoneda(r.interes)})` : '';
    toast(`Retiro exitoso${extra}. Nuevo saldo: ${formatoMoneda(r.saldo)}`);
    e.target.reset();
    renderPreviewRetiro();
  });

  // ---------- Movimientos ----------
  function renderMovimientos() {
    const lista = BankController.movimientos(U(), $('filtroMov').value);
    $('tablaMov').innerHTML = lista.length
      ? lista.map((m) => `
        <tr>
          <td>${escapar(new Date(m.fecha).toLocaleString('es-CO'))}</td>
          <td>${escapar(m.productoNombre)}</td>
          <td>${escapar(m.tipo)}</td>
          <td>${escapar(m.descripcion)}</td>
          <td class="${m.sentido}">${m.sentido === 'entrada' ? '+' : '−'} ${formatoMoneda(m.valor)}</td>
        </tr>`).join('')
      : '<tr><td colspan="5" class="vacio">Aún no tienes movimientos.</td></tr>';
  }
  $('filtroMov').addEventListener('change', renderMovimientos);

  // ---------- Transferir ----------
  function actualizarDestinos() {
    const origen = $('trOrigen').value;
    const modo = document.querySelector('input[name="modo"]:checked').value;
    $('campoUsuarioDestino').hidden = modo !== 'otro';
    const opciones = ['ahorros', 'corriente'].filter((t) => modo === 'otro' || t !== origen);
    $('trDestino').innerHTML = opciones.map((t) => `<option value="${t}">${NOMBRES[t]}</option>`).join('');
  }
  $('trOrigen').addEventListener('change', actualizarDestinos);
  document.querySelectorAll('input[name="modo"]').forEach((r) => r.addEventListener('change', actualizarDestinos));
  $('formTransferir').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = datosFormulario(e.target);
    const destino = { modo: d.modo, tipo: d.destino, username: d.usuarioDestino };
    const r = ejecutar(() => BankController.transferir(U(), d.origen, destino, Number(d.monto)));
    if (!r) return;
    toast(`Transferencia exitosa a ${r.destinatario}. Saldo origen: ${formatoMoneda(r.saldoOrigen)}`);
    e.target.reset();
    actualizarDestinos();
  });

  // ---------- Tarjeta de crédito ----------
  function renderTarjeta() {
    const t = U().productos.tarjeta;
    $('resumenTarjeta').innerHTML = `
      <div class="saldo-card tarjeta"><small>Cupo total</small><div class="monto">${formatoMoneda(t.cupoTotal)}</div><div class="detalle">Tarjeta ${escapar(t.numTarjeta)}</div></div>
      <div class="saldo-card tarjeta"><small>Cupo disponible</small><div class="monto">${formatoMoneda(t.cupoDisponible())}</div></div>
      <div class="saldo-card tarjeta rojo"><small>Deuda actual</small><div class="monto">${formatoMoneda(t.deudaActual)}</div></div>`;
    $('tablaCompras').innerHTML = t.compras.length
      ? t.compras.map((c) => `
        <tr>
          <td>${escapar(new Date(c.fecha).toLocaleDateString('es-CO'))}</td>
          <td>${escapar(c.descripcion)}</td>
          <td>${formatoMoneda(c.capital)}</td>
          <td>${c.cuotas}</td>
          <td>${(c.tasa * 100).toFixed(1)}%</td>
          <td><b>${formatoMoneda(c.cuotaMensual)}</b></td>
          <td>${formatoMoneda(c.saldoCapital)}</td>
        </tr>`).join('')
      : '<tr><td colspan="7" class="vacio">Aún no tienes compras con tarjeta.</td></tr>';
    renderPreviewCompra();
  }

  function renderPreviewCompra() {
    const sim = BankController.simularCuota(Number($('compValor').value), Number($('compCuotas').value));
    $('previewCompra').innerHTML = sim
      ? `Tasa: <b>${(sim.tasa * 100).toFixed(1)}% mensual</b> · Pago mensual: <b>${formatoMoneda(sim.cuota)}</b> · Total a pagar: <b>${formatoMoneda(sim.total)}</b>`
      : 'Ingresa valor y cuotas para ver tu pago mensual.';
  }
  $('compValor').addEventListener('input', renderPreviewCompra);
  $('compCuotas').addEventListener('input', renderPreviewCompra);

  $('formCompra').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = datosFormulario(e.target);
    const compra = ejecutar(() => BankController.comprarConTarjeta(U(), Number(d.valor), Number(d.cuotas), d.descripcion));
    if (!compra) return;
    toast(`Compra registrada. Pago mensual: ${formatoMoneda(compra.cuotaMensual)} durante ${compra.cuotas} cuotas.`);
    e.target.reset();
    $('compCuotas').value = 1;
    renderTarjeta();
  });

  $('formPago').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = datosFormulario(e.target);
    const r = ejecutar(() => BankController.pagarTarjeta(U(), d.cuenta, Number(d.monto)));
    if (!r) return;
    toast(`Pago exitoso. Deuda restante: ${formatoMoneda(r.deuda)}`);
    e.target.reset();
    renderTarjeta();
  });

  // ---------- Perfil ----------
  function renderPerfil() {
    const u = U();
    $('perIdent').value = u.identificacion;
    $('perNombre').value = u.nombre;
    $('perCelular').value = u.celular;
    $('perUsuario').value = u.username;
    $('claveUsuario').value = '';
    mostrarErrores($('formPerfil'), {});
    mostrarErrores($('formClave'), {});
  }

  $('formPerfil').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = datosFormulario(e.target);
    const r = AuthController.actualizarPerfil(U().id, d);
    if (!r.ok) {
      mostrarErrores(e.target, r.errores || {});
      if (r.mensaje) toast(r.mensaje, 'error');
      return;
    }
    mostrarErrores(e.target, {});
    actualizarSaludo();
    toast('Perfil actualizado correctamente.');
  });

  $('formClave').addEventListener('submit', (e) => {
    e.preventDefault();
    const r = AuthController.cambiarPassword(U().id, datosFormulario(e.target));
    if (!r.ok) {
      mostrarErrores(e.target, r.errores || {});
      if (r.mensaje) toast(r.mensaje, 'error');
      return;
    }
    mostrarErrores(e.target, {});
    e.target.reset();
    toast('Contraseña cambiada correctamente.');
  });

  // ---------- Inicio ----------
  actualizarSaludo();
  actualizarDestinos();
  renderSaldos();
});
