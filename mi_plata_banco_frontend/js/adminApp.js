/**
 * adminApp.js - CRUD de usuarios (solo para el rol administrador).
 */
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  const sesion = AuthController.usuarioActual();
  if (!sesion) { location.href = 'auth.html?modo=login'; return; }
  if (!sesion.esAdmin()) { location.href = 'dashboard.html'; return; }

  $('saludoAdmin').textContent = `Admin: ${sesion.nombre}`;
  $('btnSalirAdmin').addEventListener('click', () => {
    AuthController.cerrarSesion();
    location.href = '../index.html';
  });

  const form = $('formUsuario');

  function renderTabla() {
    const lista = AuthController.cargarUsuarios();
    $('tablaUsuarios').innerHTML = lista.map((u) => `
      <tr>
        <td>${escapar(u.identificacion)}</td>
        <td>${escapar(u.nombre)}</td>
        <td>${escapar(u.celular)}</td>
        <td>${escapar(u.username)}</td>
        <td><span class="badge ${u.rol}">${u.rol === 'admin' ? 'Administrador' : 'Cliente'}</span></td>
        <td><span class="badge ${u.estado}">${u.estado}</span></td>
        <td>
          <button class="btn btn-sm" data-editar="${u.id}">Editar</button>
          <button class="btn btn-sm btn-peligro" data-eliminar="${u.id}">Eliminar</button>
        </td>
      </tr>`).join('');
  }

  function abrirForm(usuario = null) {
    form.hidden = false;
    form.reset();
    mostrarErrores(form, {});
    $('usuarioId').value = usuario ? usuario.id : '';
    $('tituloForm').textContent = usuario ? 'Editar usuario' : 'Agregar usuario';
    $('labelPassword').textContent = usuario ? 'Nueva contraseña (vacía = no cambiar)' : 'Contraseña';
    if (usuario) {
      $('uIdent').value = usuario.identificacion;
      $('uNombre').value = usuario.nombre;
      $('uCelular').value = usuario.celular;
      $('uUsername').value = usuario.username;
      $('uRol').value = usuario.rol;
      $('uEstado').value = usuario.estado;
    }
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cerrarForm() {
    form.hidden = true;
    form.reset();
  }

  $('btnNuevo').addEventListener('click', () => abrirForm());
  $('btnCancelar').addEventListener('click', cerrarForm);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = datosFormulario(form);
    const id = $('usuarioId').value;
    const r = id ? AuthController.editarUsuario(id, d) : AuthController.crearUsuario(d);
    if (!r.ok) {
      mostrarErrores(form, r.errores || {});
      if (r.mensaje) toast(r.mensaje, 'error');
      return;
    }
    toast(id ? 'Usuario actualizado.' : 'Usuario creado.');
    cerrarForm();
    renderTabla();
  });

  $('tablaUsuarios').addEventListener('click', (e) => {
    const idEditar = e.target.dataset.editar;
    const idEliminar = e.target.dataset.eliminar;
    if (idEditar) abrirForm(AuthController.buscarPorId(idEditar));
    if (idEliminar) {
      const u = AuthController.buscarPorId(idEliminar);
      if (!u) return;
      if (!confirm(`¿Seguro que deseas eliminar a ${u.nombre} (${u.username})? Esta acción no se puede deshacer.`)) return;
      const r = AuthController.eliminarUsuario(idEliminar);
      if (!r.ok) { toast(r.mensaje, 'error'); return; }
      toast('Usuario eliminado.');
      renderTabla();
    }
  });

  renderTabla();
});
