/**
 * BankController
 * Operaciones del panel del cajero: saldo, consignar, retirar, movimientos,
 * transferencias y tarjeta de crédito. Todas guardan en localStorage.
 */
class BankController {
  static NOMBRES = { ahorros: 'Cuenta de Ahorros', corriente: 'Cuenta Corriente', tarjeta: 'Tarjeta de Crédito' };

  static guardar(...usuarios) {
    usuarios.forEach((u) => AuthController.guardarUsuario(u));
  }

  // ---------- Consultar saldo ----------
  static consultarSaldos(usuario) {
    const p = usuario.productos;
    return {
      ahorros: p.ahorros.obtenerResumen(),
      corriente: p.corriente.obtenerResumen(),
      tarjeta: p.tarjeta.obtenerResumen(),
    };
  }

  // ---------- Consignar ----------
  static consignar(usuario, tipo, monto) {
    const cuenta = usuario.getCuenta(tipo);
    cuenta.consignar(monto);
    BankController.guardar(usuario);
    return cuenta.saldo;
  }

  // ---------- Retirar ----------
  /** Ahorros: aplica 1.5% de interés al retirar. Corriente: permite sobregiro 20%. */
  static retirar(usuario, tipo, monto) {
    const cuenta = usuario.getCuenta(tipo);
    const { interes } = cuenta.retirar(monto);
    BankController.guardar(usuario);
    return { saldo: cuenta.saldo, interes };
  }

  // ---------- Movimientos ----------
  /** Historial ordenado por fecha descendente. filtro: todos | ahorros | corriente | tarjeta */
  static movimientos(usuario, filtro = 'todos') {
    const lista = [];
    Object.entries(usuario.productos).forEach(([clave, producto]) => {
      if (filtro !== 'todos' && filtro !== clave) return;
      producto.movimientos.forEach((m) => lista.push({ ...m, productoNombre: BankController.NOMBRES[clave] }));
    });
    return lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }

  // ---------- Transferencias ----------
  /**
   * destino = { modo: 'propio', tipo }  -> entre productos del mismo usuario
   * destino = { modo: 'otro', username, tipo } -> a otro usuario
   * No se permite transferir al mismo producto.
   */
  static transferir(usuario, origenTipo, destino, monto) {
    Cuenta.validarMonto(monto);
    const origen = usuario.getCuenta(origenTipo);
    let destUsuario = usuario;

    if (destino.modo === 'otro') {
      const encontrado = AuthController.buscarPorUsername(destino.username);
      if (!encontrado || encontrado.rol === 'admin') throw new Error('El usuario destino no existe.');
      destUsuario = encontrado.id === usuario.id ? usuario : encontrado;
    }

    if (destUsuario.id === usuario.id && destino.tipo === origenTipo) {
      throw new Error('No puedes transferir al mismo producto.');
    }

    const destCuenta = destUsuario.getCuenta(destino.tipo);
    const mismoUsuario = destUsuario.id === usuario.id;
    origen.debitar(
      monto, 'transferencia',
      mismoUsuario
        ? `Transferencia a mi ${destCuenta.nombreProducto}`
        : `Transferencia a ${destUsuario.nombre} (${destCuenta.nombreProducto})`
    );
    destCuenta.acreditar(
      monto, 'transferencia',
      mismoUsuario
        ? `Transferencia desde mi ${origen.nombreProducto}`
        : `Transferencia de ${usuario.nombre} (${origen.nombreProducto})`
    );
    BankController.guardar(usuario);
    if (!mismoUsuario) BankController.guardar(destUsuario);
    return { saldoOrigen: origen.saldo, destinatario: destUsuario.nombre };
  }

  // ---------- Tarjeta de crédito ----------
  static simularCuota(valor, cuotas) {
    if (!(valor > 0) || !Number.isInteger(cuotas) || cuotas < 1) return null;
    const tasa = TarjetaCredito.tasaPorCuotas(cuotas);
    const cuota = TarjetaCredito.calcularCuota(valor, cuotas);
    return { tasa, cuota, total: Cuenta.redondear(cuota * cuotas) };
  }

  static comprarConTarjeta(usuario, valor, cuotas, descripcion) {
    const compra = usuario.productos.tarjeta.registrarCompra(valor, cuotas, descripcion);
    BankController.guardar(usuario);
    return compra;
  }

  /** Paga la tarjeta con dinero de una cuenta de ahorros o corriente. */
  static pagarTarjeta(usuario, cuentaTipo, monto) {
    const tarjeta = usuario.productos.tarjeta;
    tarjeta.validarPago(monto);
    const cuenta = usuario.getCuenta(cuentaTipo);
    cuenta.debitar(monto, 'pago tarjeta', 'Pago a tarjeta de crédito');
    tarjeta.pagarTarjeta(monto);
    BankController.guardar(usuario);
    return { deuda: tarjeta.deudaActual, saldo: cuenta.saldo };
  }
}
