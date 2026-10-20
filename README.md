# Mi Plata – Banco digital (frontend)

Trabajo de clase en **JavaScript puro** (HTML + CSS + JS, sin librerías). Todos los datos se guardan en el **localStorage** del navegador.

> Usuario administrador creado automáticamente: **admin** / **Admin123**

## Estructura
```
mi_plata_banco_frontend/
├── index.html                  Landing page (menú, presentación, footer con redes)
├── css/styles.css              Identidad visual compartida
├── view/
│   ├── auth.html               Inicio de sesión y registro
│   ├── dashboard.html          Panel del cajero (cliente)
│   └── admin-users.html        CRUD de usuarios (administrador)
├── js/
│   ├── app.js                  Utilidades + landing + login/registro
│   ├── dashboardApp.js         Interfaz del panel del cajero
│   ├── adminApp.js             Interfaz del CRUD de usuarios
│   └── models/
│       ├── Transaccion.js      Movimiento / transferencia
│       ├── cuenta.js           Clase base Cuenta
│       ├── CuentaAhorros.js    Hereda de Cuenta (interés 1.5% al retirar)
│       ├── CuentaCorriente.js  Hereda de Cuenta (sobregiro 20%)
│       ├── TarjetaCredito.js   Compras a cuotas con interés
│       └── Usuario.js          Usuario (rol cliente / admin) y sus productos
└── controllers/
    ├── AuthController.js       Registro, login, CRUD, perfil, contraseña
    └── BankController.js       Saldo, consignar, retirar, movimientos, transferir, tarjeta
```

## Reglas de negocio implementadas
- **Cuenta de ahorros:** consignar y retirar. El retiro no puede superar el saldo. Al retirar se calcula el interés mensual (saldo × 1.5%), se abona como movimiento "interés" y luego se descuenta el retiro.
- **Cuenta corriente:** sin intereses. Puedes retirar hasta saldo × 1.2 (ej.: saldo $1.000.000 → límite $1.200.000).
- **Tarjeta de crédito:** cupo de $3.000.000 por defecto. Cuotas ≤ 2 → 0%, 3–6 → 1.9% mensual, ≥ 7 → 2.3% mensual. Cuota = (Capital × tasa) / (1 − (1 + tasa)^−n). Cada compra muestra su pago mensual.
- **Transferencias:** entre productos propios o a otro usuario (por nombre de usuario). No se permite al mismo producto.
- **Movimientos:** cada operación se guarda en un Array con fecha/hora, tipo y valor; se muestran de más reciente a más antiguo.
- **Seguridad:** 3 intentos fallidos bloquean la cuenta; el contador se ve en pantalla. El administrador puede desbloquear editando el estado del usuario.

## Validaciones
| Campo | Regla |
|---|---|
| Identificación | 5–15 letras/números, única |
| Nombre | Nombre y apellido, solo letras |
| Celular | 10 dígitos, empieza por 3 |
| Usuario | 4–20 caracteres (letras, números, `.`, `_`), único |
| Contraseña | Mínimo 8, mayúscula, minúscula y número (+ confirmación) |

## Notas
- Al registrarse, cada cliente recibe automáticamente su cuenta de ahorros, su cuenta corriente y su tarjeta de crédito.
- Para pruebas, consigna dinero primero en el panel del cajero.
- Para empezar de cero: DevTools → Application → Local Storage → borrar `miplata_usuarios`.
- Aviso académico: las contraseñas se guardan en texto plano en localStorage porque es un ejercicio de clase; un banco real nunca debe hacerlo.

## Roles

| Rol | Descripción |
|---|---|
| Visitante | Persona que aún no ha iniciado sesión. |
| Cliente | Usuario registrado que opera sus productos bancarios. |
| Administrador | Usuario con permisos para gestionar a los demás usuarios del sistema. |

## Índice

| Módulo | Historias |
|---|---|
| Acceso y seguridad | HU-01, HU-02, HU-03 |
| Página de inicio | HU-04 |
| Panel de transacciones | HU-05 a HU-11, HU-16 |
| Tarjeta de crédito | HU-12, HU-13 |
| Perfil | HU-14, HU-15 |
| Administración de usuarios | HU-17, HU-18, HU-19 |
## Diagrama de Clases
![Diagrama de Clases](./docs/diagrama-uml.png)

---

## Acceso y seguridad

### HU-01: Registro de Nuevos Clientes

* Como visitante de la plataforma web,
* Quiero poder registrarme ingresando mis datos personales (número de identificación, nombre completo, celular, nombre de usuario y contraseña con confirmación),
* Para crear una cuenta en el sistema y poder acceder a los servicios bancarios digitales de "Mi Plata".
* Criterios de aceptación:
   * El formulario valida que todos los campos estén llenos y muestra el error debajo de cada campo inválido.
   * La identificación (cédula o pasaporte) tiene entre 5 y 15 letras o números y no puede repetirse.
   * El nombre completo incluye nombre y apellido, solo con letras.
   * El celular tiene 10 dígitos y comienza por 3.
   * El nombre de usuario es único en el sistema, tiene entre 4 y 20 caracteres (letras, números, punto o guion bajo).
   * La contraseña tiene mínimo 8 caracteres con mayúscula, minúscula y número, y coincide con su confirmación.
   * Se almacena el nuevo objeto de tipo `Usuario` (simulado con `localStorage`) con rol `cliente`.
   * Al registrarse, el sistema le crea automáticamente una cuenta de ahorros, una cuenta corriente y una tarjeta de crédito.
   * Muestra un mensaje de éxito y cambia automáticamente al formulario de inicio de sesión con el usuario ya escrito.

### HU-02: Inicio de Sesión

* Como cliente o administrador registrado,
* Quiero poder iniciar sesión con mi nombre de usuario y contraseña,
* Para acceder de forma segura a mis productos bancarios o a las herramientas de administración.
* Criterios de aceptación:
   * El formulario exige usuario y contraseña, y valida las credenciales contra los usuarios almacenados.
   * Si el usuario no existe, muestra el mensaje "El usuario no está registrado".
   * Si la contraseña es incorrecta, muestra un mensaje de error y cuántos intentos le quedan.
   * Si las credenciales son correctas, el sistema guarda la sesión y redirige al panel de transacciones (cliente) o a la administración de usuarios (administrador).
   * Un visitante que intenta abrir el panel sin sesión es redirigido a la página de inicio de sesión.

### HU-03: Bloqueo por Intentos Fallidos

* Como administrador del banco,
* Quiero que el sistema bloquee la cuenta tras tres intentos fallidos de inicio de sesión,
* Para proteger los productos de los clientes frente a accesos no autorizados.
* Criterios de aceptación:
   * El contador de intentos fallidos ("Intentos fallidos: X de 3") es visible durante todo el proceso de inicio de sesión.
   * Al tercer intento fallido, la cuenta cambia a estado `bloqueado` y se muestra un mensaje informativo.
   * Una cuenta bloqueada no puede ingresar, ni siquiera con la contraseña correcta.
   * El contador se reinicia a cero cuando el inicio de sesión es exitoso.
   * Un administrador puede desbloquear la cuenta desde la administración de usuarios (ver HU-18).

---

## Página de inicio

### HU-04: Página de Inicio (Landing Page)

* Como visitante de la plataforma web,
* Quiero ver una página principal atractiva con la presentación del banco y accesos claros a Iniciar Sesión y Registrarse,
* Para conocer a "Mi Plata", sus productos y decidir si abro una cuenta.
* Criterios de aceptación:
   * El menú de navegación incluye las opciones "Iniciar Sesión" y "Registrarse".
   * Presenta la información institucional del banco (misión, visión) y sus tres productos con sus condiciones.
   * Usa una identidad visual coherente con un banco (colores, logo y tipografía).
   * Incluye un pie de página con información corporativa y enlaces a redes sociales.
   * Las páginas de registro e inicio de sesión mantienen el mismo diseño visual que la página de inicio.
   * La página se adapta a pantallas de celular y de computador.

---

## Panel de transacciones

### HU-05: Consultar Saldo

* Como cliente autenticado,
* Quiero consultar el saldo de cada uno de mis productos,
* Para conocer cuánto dinero tengo disponible antes de realizar una operación.
* Criterios de aceptación:
   * Muestra el saldo de la cuenta de ahorros y de la cuenta corriente, con su número de cuenta.
   * Para la cuenta corriente muestra además el límite de retiro con sobregiro.
   * Para la tarjeta de crédito muestra el cupo total, el cupo disponible y la deuda actual.
   * Los valores se muestran en formato de moneda colombiana.

### HU-06: Consignar Dinero

* Como cliente autenticado,
* Quiero consignar dinero en mi cuenta de ahorros o en mi cuenta corriente,
* Para aumentar mi saldo disponible.
* Criterios de aceptación:
   * El cliente selecciona la cuenta destino e ingresa el monto.
   * El monto debe ser un número mayor a cero; de lo contrario, muestra un mensaje de error.
   * El saldo se actualiza y se muestra el nuevo valor.
   * La operación queda registrada como movimiento de tipo `consignación`.

### HU-07: Retirar Dinero de la Cuenta de Ahorros

* Como cliente autenticado,
* Quiero retirar dinero de mi cuenta de ahorros,
* Para disponer de mi dinero en efectivo cuando lo necesite.
* Criterios de aceptación:
   * El monto a retirar no puede superar el saldo disponible; de lo contrario, muestra un mensaje de error y no modifica el saldo.
   * El sistema calcula el interés del 1.5% mensual sobre el saldo y lo abona en el momento del retiro.
   * Antes de confirmar, muestra una vista previa del interés y del saldo resultante.
   * El saldo se actualiza y se muestra el nuevo valor.
   * Quedan registrados dos movimientos: `interés` y `retiro`.

### HU-08: Retirar Dinero de la Cuenta Corriente con Sobregiro

* Como cliente autenticado,
* Quiero retirar dinero de mi cuenta corriente aprovechando el sobregiro permitido,
* Para cubrir pagos urgentes aunque mi saldo no alcance.
* Criterios de aceptación:
   * El cliente puede retirar hasta un 20% adicional sobre su saldo actual (ejemplo: con $1.000.000 el límite es $1.200.000).
   * Si el monto supera ese límite, muestra un mensaje de error y no modifica el saldo.
   * Cuando el retiro usa sobregiro, el sistema informa cuánto se está sobregirando.
   * La cuenta corriente no genera intereses.
   * El saldo se actualiza (puede quedar negativo) y el retiro queda registrado como movimiento.

### HU-09: Ver Movimientos

* Como cliente autenticado,
* Quiero consultar el historial de mis movimientos,
* Para llevar control de mis transacciones.
* Criterios de aceptación:
   * Cada movimiento almacena fecha y hora, tipo de transacción (retiro, consignación, transferencia, etc.) y valor.
   * Los movimientos se guardan en una estructura de tipo `Array`.
   * El historial se muestra de forma legible, ordenado por fecha descendente (del más reciente al más antiguo).
   * Las entradas se distinguen de las salidas por signo y color.
   * El cliente puede filtrar por producto (ahorros, corriente, tarjeta) o ver todos.
   * Si no hay movimientos, muestra un mensaje indicándolo.

### HU-10: Transferir entre Productos Propios

* Como cliente autenticado,
* Quiero transferir dinero entre mis propios productos (por ejemplo, de Ahorros a Corriente),
* Para organizar mi dinero según mis necesidades.
* Criterios de aceptación:
   * El cliente elige el producto de origen, el producto de destino y el monto.
   * No se permite transferir al mismo producto (por ejemplo, de Ahorros a Ahorros); el selector de destino excluye el producto de origen.
   * El monto respeta la regla de retiro del producto de origen (saldo disponible o saldo con sobregiro).
   * Los saldos de ambos productos se actualizan y la operación queda registrada como `transferencia` en los dos.

### HU-11: Transferir a Otros Usuarios

* Como cliente autenticado,
* Quiero transferir dinero a cuentas de otros usuarios del banco,
* Para pagar o enviar dinero a otras personas.
* Criterios de aceptación:
   * El cliente ingresa el nombre de usuario del destinatario, elige el producto destino (ahorros o corriente) y el monto.
   * Si el usuario destino no existe, muestra un mensaje de error.
   * No se permite transferir al mismo producto de la misma persona usando su propio nombre de usuario.
   * El saldo de origen disminuye y el del destinatario aumenta.
   * La transferencia queda registrada en el historial de ambos usuarios, con el nombre de la contraparte.

### HU-16: Cerrar Sesión

* Como cliente autenticado,
* Quiero cerrar mi sesión desde el panel,
* Para proteger mi información cuando termine de usar la plataforma.
* Criterios de aceptación:
   * El panel incluye un botón visible de "Cerrar sesión".
   * Al presionarlo, la sesión se elimina y el usuario es redirigido a la página de inicio.
   * Tras cerrar sesión, no se puede volver a ver el panel sin iniciar sesión de nuevo.

---

## Tarjeta de crédito

### HU-12: Comprar con Tarjeta de Crédito a Cuotas

* Como cliente autenticado,
* Quiero registrar una compra con mi tarjeta de crédito eligiendo el número de cuotas,
* Para financiar mis compras y conocer cuánto pagaré cada mes.
* Criterios de aceptación:
   * El cliente ingresa descripción, valor y número de cuotas (entre 1 y 36).
   * La compra no puede superar el cupo disponible; de lo contrario, muestra un mensaje de error.
   * La tasa de interés mensual depende de las cuotas: hasta 2 cuotas, 0%; de 3 a 6 cuotas, 1.9%; 7 o más cuotas, 2.3%.
   * La cuota mensual se calcula con la fórmula `(Capital × tasa) / (1 − (1 + tasa)^(−n))`; si la tasa es 0%, es el capital dividido entre las cuotas.
   * Antes de confirmar, se muestra la tasa, el pago mensual y el total a pagar.
   * Cada compra registrada muestra su pago mensual resultante en la tabla de compras.
   * La deuda de la tarjeta aumenta y el cupo disponible disminuye por el valor de la compra.

### HU-13: Pagar la Tarjeta de Crédito

* Como cliente autenticado,
* Quiero pagar mi tarjeta de crédito con dinero de mis cuentas,
* Para reducir mi deuda y recuperar cupo disponible.
* Criterios de aceptación:
   * El cliente elige la cuenta de la que se descuenta el pago (ahorros o corriente) e ingresa el monto.
   * No se permite pagar si la tarjeta no tiene deuda ni un monto mayor a la deuda actual.
   * El monto respeta la regla de retiro de la cuenta elegida.
   * La deuda disminuye, el cupo disponible aumenta y el pago queda registrado como movimiento.

---

## Perfil

### HU-14: Editar Perfil

* Como cliente autenticado,
* Quiero editar los datos que ingresé en el registro,
* Para mantener mi información personal actualizada.
* Criterios de aceptación:
   * El formulario se carga con los datos actuales (identificación, nombre completo, celular y nombre de usuario).
   * Se aplican las mismas validaciones del registro, incluida la unicidad de identificación y de nombre de usuario.
   * Al guardar, los cambios se almacenan en `localStorage` y se muestra un mensaje de éxito.
   * Si algún dato es inválido, los cambios no se guardan y se señala el campo con error.

### HU-15: Cambiar Contraseña

* Como cliente autenticado,
* Quiero cambiar mi contraseña,
* Para mantener segura mi cuenta.
* Criterios de aceptación:
   * El formulario solicita el usuario y la contraseña actual, luego la nueva contraseña y su confirmación.
   * El usuario debe coincidir con el de la sesión y la contraseña actual debe ser correcta.
   * La nueva contraseña cumple las reglas de seguridad (mínimo 8 caracteres, mayúscula, minúscula y número) y es distinta de la actual.
   * La nueva contraseña y su confirmación deben coincidir.
   * Al guardar, se muestra un mensaje de éxito y la nueva contraseña se usa en los siguientes inicios de sesión.

---

## Administración de usuarios

### HU-17: Agregar Usuarios

* Como administrador del banco,
* Quiero agregar nuevos usuarios desde una interfaz de gestión,
* Para dar de alta clientes u otros administradores sin que tengan que registrarse por sí mismos.
* Criterios de aceptación:
   * Solo un usuario con rol `admin` puede acceder a la pantalla de administración; los clientes son redirigidos a su panel.
   * El formulario captura los datos del registro más el rol y el estado del usuario.
   * Se aplican las mismas validaciones del registro (formato y unicidad).
   * El nuevo usuario aparece en la tabla de usuarios y puede iniciar sesión.

### HU-18: Editar Usuarios

* Como administrador del banco,
* Quiero editar los datos de los usuarios existentes,
* Para corregir su información, cambiar su rol o desbloquear una cuenta.
* Criterios de aceptación:
   * Cada fila de la tabla tiene un botón "Editar" que carga los datos del usuario en el formulario.
   * La contraseña es opcional: si se deja vacía, no se modifica.
   * Al cambiar el estado de `bloqueado` a `activo`, el contador de intentos fallidos se reinicia.
   * Las validaciones de formato y unicidad se mantienen, ignorando al propio usuario que se edita.
   * La tabla se actualiza y se muestra un mensaje de éxito.

### HU-19: Eliminar Usuarios

* Como administrador del banco,
* Quiero eliminar usuarios del sistema,
* Para dar de baja cuentas que ya no deben existir.
* Criterios de aceptación:
   * Antes de eliminar, el sistema solicita una confirmación que muestra el nombre y el usuario de la persona.
   * Si el administrador cancela, no se elimina nada.
   * Un administrador no puede eliminar su propia cuenta mientras tiene la sesión abierta.
   * Tras eliminarlo, el usuario desaparece de la tabla y ya no puede iniciar sesión.
