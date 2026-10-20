/**
 * AuthController (UML: Autenticacion)
 * Registro, inicio de sesión (3 intentos), CRUD de usuarios, perfil y
 * cambio de contraseña. Los datos viven en el localStorage del navegador.
 */
class AuthController {
  static MAX_INTENTOS = 3;
  static KEY_USUARIOS = 'miplata_usuarios';
  static KEY_SESION = 'miplata_sesion';

  // ================= Almacenamiento =================
  /** Crea el administrador por defecto la primera vez. */
  static inicializar() {
    if (!localStorage.getItem(AuthController.KEY_USUARIOS)) {
      const admin = new Usuario({
        identificacion: '0000000000', nombre: 'Administrador MiPlata', celular: '3000000000',
        username: 'admin', password: 'Admin123', rol: 'admin',
      });
      AuthController.guardarUsuarios([admin]);
    }
  }

  static cargarUsuarios() {
    try {
      const crudos = JSON.parse(localStorage.getItem(AuthController.KEY_USUARIOS) || '[]');
      return crudos.map((o) => Usuario.fromObject(o));
    } catch (e) {
      return [];
    }
  }

  static guardarUsuarios(lista) {
    localStorage.setItem(AuthController.KEY_USUARIOS, JSON.stringify(lista));
  }

  /** Reemplaza (o agrega) un usuario dentro de la lista guardada. */
  static guardarUsuario(usuario) {
    const lista = AuthController.cargarUsuarios();
    const i = lista.findIndex((u) => u.id === usuario.id);
    if (i >= 0) lista[i] = usuario; else lista.push(usuario);
    AuthController.guardarUsuarios(lista);
  }

  static buscarPorUsername(username) {
    const nombre = String(username || '').trim().toLowerCase();
    return AuthController.cargarUsuarios().find((u) => u.username.toLowerCase() === nombre) || null;
  }

  static buscarPorId(id) {
    return AuthController.cargarUsuarios().find((u) => u.id === id) || null;
  }

  // ================= Validaciones =================
  static validarPassword(clave) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(clave || '');
  }

  /**
   * Valida los datos de un usuario. Devuelve un objeto {campo: mensaje}
   * (vacío si todo está bien).
   */
  static validarDatos(datos, { idActual = null, passwordObligatoria = true } = {}) {
    const e = {};
    const lista = AuthController.cargarUsuarios();
    const ident = String(datos.identificacion || '').trim();
    const nombre = String(datos.nombre || '').trim();
    const celular = String(datos.celular || '').trim();
    const username = String(datos.username || '').trim();

    if (!/^[A-Za-z0-9]{5,15}$/.test(ident)) {
      e.identificacion = 'Cédula o pasaporte: entre 5 y 15 letras o números, sin espacios.';
    } else if (lista.some((u) => u.id !== idActual && u.identificacion.toLowerCase() === ident.toLowerCase())) {
      e.identificacion = 'Ya existe un usuario con esa identificación.';
    }

    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)+$/.test(nombre) || nombre.length < 5) {
      e.nombre = 'Escribe tu nombre completo (nombre y apellido, solo letras).';
    }

    if (!/^3\d{9}$/.test(celular)) {
      e.celular = 'El celular debe tener 10 dígitos y empezar por 3.';
    }

    if (!/^[A-Za-z0-9_.]{4,20}$/.test(username)) {
      e.username = 'Usuario de 4 a 20 caracteres: letras, números, punto o guion bajo.';
    } else if (lista.some((u) => u.id !== idActual && u.username.toLowerCase() === username.toLowerCase())) {
      e.username = 'Ese nombre de usuario ya está en uso.';
    }

    const clave = datos.password || '';
    if (clave || passwordObligatoria) {
      if (!AuthController.validarPassword(clave)) {
        e.password = 'Mínimo 8 caracteres con mayúscula, minúscula y número.';
      }
      if (datos.confirmar !== undefined && datos.confirmar !== clave) {
        e.confirmar = 'Las contraseñas no coinciden.';
      }
    }
    return e;
  }

  // ================= Registro / CRUD =================
  /** Crea un usuario (registro público o alta desde el administrador). */
  static crearUsuario(datos) {
    const errores = AuthController.validarDatos(datos, { passwordObligatoria: true });
    if (Object.keys(errores).length) return { ok: false, errores };
    const usuario = new Usuario({
      identificacion: datos.identificacion.trim(),
      nombre: datos.nombre.trim().replace(/\s+/g, ' '),
      celular: datos.celular.trim(),
      username: datos.username.trim(),
      password: datos.password,
      rol: datos.rol === 'admin' ? 'admin' : 'cliente',
      estado: datos.estado === 'bloqueado' ? 'bloqueado' : 'activo',
    });
    AuthController.guardarUsuario(usuario);
    return { ok: true, usuario };
  }

  static editarUsuario(id, datos) {
    const usuario = AuthController.buscarPorId(id);
    if (!usuario) return { ok: false, mensaje: 'El usuario no existe.' };
    const errores = AuthController.validarDatos(datos, { idActual: id, passwordObligatoria: false });
    if (Object.keys(errores).length) return { ok: false, errores };
    usuario.actualizarPerfil({
      identificacion: datos.identificacion.trim(),
      nombre: datos.nombre.trim().replace(/\s+/g, ' '),
      celular: datos.celular.trim(),
      username: datos.username.trim(),
    });
    if (datos.password) usuario.password = datos.password;
    if (datos.rol) usuario.rol = datos.rol === 'admin' ? 'admin' : 'cliente';
    if (datos.estado) {
      usuario.estado = datos.estado === 'bloqueado' ? 'bloqueado' : 'activo';
      if (usuario.estado === 'activo') usuario.intentosFallidos = 0; // desbloqueo
    }
    AuthController.guardarUsuario(usuario);
    return { ok: true, usuario };
  }

  static eliminarUsuario(id) {
    const sesion = AuthController.usuarioActual();
    if (sesion && sesion.id === id) {
      return { ok: false, mensaje: 'No puedes eliminar tu propia cuenta mientras tienes la sesión abierta.' };
    }
    const lista = AuthController.cargarUsuarios();
    if (!lista.some((u) => u.id === id)) return { ok: false, mensaje: 'El usuario no existe.' };
    AuthController.guardarUsuarios(lista.filter((u) => u.id !== id));
    return { ok: true };
  }

  // ================= Inicio de sesión =================
  /** Intentos fallidos actuales de un usuario (para el contador visible). */
  static intentosDe(username) {
    const u = AuthController.buscarPorUsername(username);
    return u ? u.intentosFallidos : 0;
  }

  static login(username, password) {
    if (!String(username || '').trim() || !password) {
      return { ok: false, mensaje: 'Ingresa tu usuario y tu contraseña.' };
    }
    const usuario = AuthController.buscarPorUsername(username);
    if (!usuario) return { ok: false, mensaje: 'El usuario no está registrado.' };

    if (usuario.estado === 'bloqueado') {
      return {
        ok: false, bloqueado: true, intentos: usuario.intentosFallidos,
        mensaje: 'Tu cuenta está bloqueada por superar 3 intentos fallidos. Comunícate con un administrador.',
      };
    }

    if (usuario.iniciarSesion(password)) {
      usuario.intentosFallidos = 0;
      AuthController.guardarUsuario(usuario);
      sessionStorage.setItem(AuthController.KEY_SESION, usuario.id);
      return { ok: true, usuario };
    }

    usuario.intentosFallidos += 1;
    if (usuario.intentosFallidos >= AuthController.MAX_INTENTOS) {
      usuario.estado = 'bloqueado';
      AuthController.guardarUsuario(usuario);
      return {
        ok: false, bloqueado: true, intentos: usuario.intentosFallidos,
        mensaje: 'Contraseña incorrecta. Tu cuenta quedó bloqueada tras el tercer intento fallido.',
      };
    }
    AuthController.guardarUsuario(usuario);
    const restantes = AuthController.MAX_INTENTOS - usuario.intentosFallidos;
    return {
      ok: false, intentos: usuario.intentosFallidos, restantes,
      mensaje: `Contraseña incorrecta. Te ${restantes === 1 ? 'queda 1 intento' : `quedan ${restantes} intentos`}.`,
    };
  }

  static usuarioActual() {
    const id = sessionStorage.getItem(AuthController.KEY_SESION);
    return id ? AuthController.buscarPorId(id) : null;
  }

  static cerrarSesion() {
    sessionStorage.removeItem(AuthController.KEY_SESION);
  }

  // ================= Perfil y seguridad =================
  static actualizarPerfil(id, datos) {
    const usuario = AuthController.buscarPorId(id);
    if (!usuario) return { ok: false, mensaje: 'Sesión no válida.' };
    const sinClave = { ...datos, password: '', confirmar: undefined };
    const errores = AuthController.validarDatos(sinClave, { idActual: id, passwordObligatoria: false });
    if (Object.keys(errores).length) return { ok: false, errores };
    usuario.actualizarPerfil({
      identificacion: datos.identificacion.trim(),
      nombre: datos.nombre.trim().replace(/\s+/g, ' '),
      celular: datos.celular.trim(),
      username: datos.username.trim(),
    });
    AuthController.guardarUsuario(usuario);
    return { ok: true, usuario };
  }

  /** Solicita usuario y clave actual, luego nueva clave y su confirmación. */
  static cambiarPassword(id, { username, actual, nueva, confirmar }) {
    const usuario = AuthController.buscarPorId(id);
    if (!usuario) return { ok: false, mensaje: 'Sesión no válida.' };
    const e = {};
    if (String(username || '').trim().toLowerCase() !== usuario.username.toLowerCase()) {
      e.username = 'El usuario no coincide con el de tu sesión.';
    }
    if (actual !== usuario.password) e.actual = 'La contraseña actual es incorrecta.';
    if (!AuthController.validarPassword(nueva)) {
      e.nueva = 'Mínimo 8 caracteres con mayúscula, minúscula y número.';
    } else if (nueva === actual) {
      e.nueva = 'La nueva contraseña debe ser diferente a la actual.';
    }
    if (nueva !== confirmar) e.confirmar = 'Las contraseñas no coinciden.';
    if (Object.keys(e).length) return { ok: false, errores: e };
    usuario.password = nueva;
    AuthController.guardarUsuario(usuario);
    return { ok: true };
  }
}
