# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Instead, open a
private advisory through **GitHub Security Advisories** in this repository
("Security" tab › "Report a vulnerability"). That keeps the details private
until a fix is available.

Please include:

- What the issue is and why it matters.
- Steps to reproduce it, or a proof of concept.
- The affected version and platform (Windows, macOS or Linux).
- Any suggested fix, if you have one.

We will acknowledge the report, investigate it and keep you updated on the fix
and disclosure timeline.

## Scope

iCleaning is a local desktop application that serves its user interface on
`127.0.0.1` and talks to Apple's iCloud (through the unofficial
[pyicloud](https://github.com/timlaing/pyicloud) library) and, in cable mode,
to the iPhone.

In scope:

- The local web server and its browser interface (token handling, `Host` and
  `Origin` checks, CSP, request validation).
- Storage of the iCloud session and its encryption, including keychain
  integration.
- Handling of the copied Photos database.
- Saving files to disk and the delete flows in both modes.
- Any unintended network connection or data leak.

Out of scope:

- Vulnerabilities in iCloud, Apple's services, or the iPhone firmware.
- Vulnerabilities in third-party dependencies that are already publicly known
  and have an upstream fix.
- **A malicious program that is already running with your user account.** Such
  a program can read your data, your keychain entries or the app's local files.
  iCleaning does not protect against that.
- Someone with physical access to an unlocked computer and your user session.

## Threat model (summary)

- **Everything runs locally.** The UI is served by the app on `127.0.0.1`, so it
  is not reachable from the local network or the internet. Each launch uses a
  random token, and requests are checked against the expected `Host` and
  `Origin`, with CSP headers applied.
- **No telemetry or analytics.** The app only connects to Apple (iCloud) and, in
  cable mode, to the iPhone.
- **The password is never stored.** The iCloud session is stored encrypted; the
  key lives in the system keychain (Keychain on macOS, Credential Manager on
  Windows, Secret Service/keyring on Linux), or in a file readable only by your
  user if no keychain is available.
- **Local data** lives in `~/.local/share/iCleaning` on Linux,
  `~/Library/Application Support/iCleaning` on macOS and
  `%LOCALAPPDATA%\iCleaning` on Windows: encrypted session, thumbnails, the
  library list and a copy of the Photos database.
- **Trust boundary:** the app protects data at rest and keeps the local server
  private. It cannot protect you from malware, a compromised operating system,
  or someone who already controls your user session.

## Español

### Cómo reportar una vulnerabilidad

Por favor, **no abras un issue público** para problemas de seguridad. Abre un
**aviso privado con GitHub Security Advisories** en el repositorio (pestaña
"Security" › "Report a vulnerability"). Así los detalles quedan privados hasta
que haya una corrección.

Incluye, si puedes:

- Qué ocurre y por qué es importante.
- Pasos para reproducirlo o una prueba de concepto.
- La versión afectada y la plataforma (Windows, macOS o Linux).
- Una posible solución, si la tienes.

Confirmaremos la recepción, lo investigaremos y te mantendremos informado sobre
la corrección y los plazos de divulgación.

### Alcance

iCleaning es una aplicación de escritorio local que sirve su interfaz en
`127.0.0.1` y se comunica con iCloud de Apple (mediante la librería no oficial
[pyicloud](https://github.com/timlaing/pyicloud)) y, en modo cable, con el
iPhone.

Dentro del alcance:

- El servidor web local y su interfaz en el navegador (gestión del token,
  comprobación de `Host` y `Origin`, CSP, validación de peticiones).
- El almacenamiento de la sesión de iCloud y su cifrado, incluida la integración
  con el llavero.
- El tratamiento de la copia de la base de datos de Fotos.
- El guardado de ficheros en disco y los flujos de borrado en ambos modos.
- Cualquier conexión de red o fuga de datos no deseada.

Fuera del alcance:

- Vulnerabilidades en iCloud, en los servicios de Apple o en el firmware del
  iPhone.
- Vulnerabilidades de dependencias de terceros ya conocidas públicamente y con
  corrección disponible.
- **Un programa malicioso que ya se esté ejecutando con tu usuario.** Ese
  programa puede leer tus datos, las entradas de tu llavero o los ficheros
  locales de la app. iCleaning no protege contra eso.
- Alguien con acceso físico a un ordenador desbloqueado y a tu sesión de
  usuario.

### Modelo de amenazas (resumen)

- **Todo se ejecuta en local.** La interfaz la sirve la propia app en
  `127.0.0.1`, así que no es accesible desde la red local ni desde internet. Cada
  arranque usa un token aleatorio y las peticiones se comprueban contra el `Host`
  y el `Origin` esperados, con cabeceras CSP.
- **Sin telemetría ni analítica.** La app solo se conecta a Apple (iCloud) y, en
  modo cable, al iPhone.
- **La contraseña nunca se guarda.** La sesión de iCloud se guarda cifrada; la
  clave vive en el llavero del sistema (Llavero en macOS, Administrador de
  credenciales en Windows, Secret Service/llavero en Linux) o, si no hay
  llavero, en un fichero solo legible por tu usuario.
- **Los datos locales** están en `~/.local/share/iCleaning` en Linux,
  `~/Library/Application Support/iCleaning` en macOS y
  `%LOCALAPPDATA%\iCleaning` en Windows: sesión cifrada, miniaturas, lista de
  la biblioteca y una copia de la base de datos de Fotos.
- **Límite de confianza:** la app protege los datos en reposo y mantiene privado
  el servidor local. No puede protegerte frente a malware, un sistema operativo
  comprometido o alguien que ya controle tu sesión de usuario.
