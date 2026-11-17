# 🧹 iCleaning

**Español** · [English](README.en.md)

iCleaning es una herramienta gratuita y de código abierto (licencia MIT) para
revisar la fototeca de tu iPhone desde el ordenador, ordenada por lo que pesa,
elegir rápido qué quieres conservar y guardarlo en el PC. Después puedes borrar
del iPhone o de iCloud lo que ya no necesites para liberar espacio.

Está pensada para gente que tiene la fototeca llena y no quiere pasar horas
haciendo scroll en una pantalla de móvil. Todo ocurre en tu ordenador: tus fotos
no pasan por ningún servidor nuestro.

> Solo para iPhone. No funciona con Android.

## ✨ Qué puedes hacer

### Dos formas de conectar el iPhone

| Modo | Cómo funciona | Cuándo usarlo |
|---|---|---|
| **iCloud** | Inicias sesión con tu Apple ID en la propia página de la app: contraseña y código de verificación en dos pasos (2FA). | Tienes las fotos en iCloud y quieres verlas sin cables. |
| **Cable** | Conectas el iPhone por USB y la app lee directamente de él, sin escribir nada. No usa iCloud. | No usas iCloud, o tienes fotos que todavía no se han subido. Solo ves lo que está guardado en el propio iPhone (con «Optimizar almacenamiento», parte de las fotos solo está en iCloud). |

### Sugerencias de limpieza

- **Vídeos largos**, los que más espacio ocupan.
- **Capturas de pantalla** y **grabaciones de pantalla**.
- **WhatsApp y redes sociales**: fotos y vídeos recibidos o guardados desde apps.
- **Ráfagas sobrantes**: las fotos de una ráfaga que no son la elegida.
- **Duplicados**.
- **Fotos parecidas**, con la mejor candidata sugerida.
- **Probablemente fallidas**, según la nota estética que calcula el propio iPhone.

### Buscar y filtrar

- **Buscador estilo Fotos**: por personas, lugares, fechas, apps y tipos.
- **Personas y mascotas**.
- **Lugares**: país › ciudad, calculados por el iPhone, sin conexión a internet.
- **Tipos de contenido**: vídeos, selfies, Live Photos, retratos, panorámicas,
  cámara lenta, time-lapse, capturas y grabaciones de pantalla.
- **Línea de tiempo** para elegir un rango de fechas.
- **Filtros** de tamaño, duración, objetivo (frontal, gran angular, tele…) y cámara.
- **Mapa sin conexión**: tus fotos sobre un mapa del mundo que viene dentro de la app; tus ubicaciones no salen del ordenador.
- **Informe de almacenamiento**: qué ocupa más, por año, por tipo y por app.
- **Vista grande** con reproductor de vídeo.

### Seleccionar y guardar

- **Selección rápida**: clic, Mayús+clic para un rango, arrastrar para pintar y
  Ctrl/Cmd+A para seleccionar todo lo filtrado.
- **Guardar en la carpeta que elijas**, incluido un disco externo, y **organizado
  como quieras**: Año/Mes, Año, País/Ciudad, Persona, Tipo, App/Año, todo en una
  carpeta, o una plantilla propia con vista previa en vivo. Se conserva la fecha
  original.
- **Etiquetas XMP** opcionales junto a cada foto (personas, lugar y tipo), que
  leen Lightroom, digiKam y otros programas.
- Se guardan los **originales, sin editar**. Las ediciones hechas en el iPhone
  (recortes, filtros…) no se incluyen.
- **Interfaz en español e inglés** y **modo oscuro**.

## 🔌 Clasificación: conecta el iPhone una vez por cable

Las sugerencias por personas, lugares, apps, tipos y ráfagas se calculan a partir
de la base de datos de Fotos del iPhone. En el **modo cable** se hace sola. En el
**modo iCloud** hay que conectar el iPhone **por cable una vez** y dejar que la
app copie esa base de datos en modo solo lectura.

Sin ese paso siguen funcionando los filtros por **tamaño, fecha y tipo**, pero no
la clasificación automática.

## 🗑️ Borrar fotos

Antes de borrar, guarda lo que quieras conservar. La app pide **doble
confirmación** y el botón de borrar **se activa a los 7 segundos** para que te dé
tiempo a leer lo que vas a eliminar.

| Modo | Qué pasa al borrar |
|---|---|
| **iCloud** | Las fotos van a «Eliminado recientemente» durante 30 días. **Siguen ocupando espacio** en iCloud hasta que vacíes esa carpeta. |
| **Cable** | El borrado es **definitivo**. Solo funciona si en el iPhone está desactivado «Fotos en iCloud». Es una función **experimental**. |

## 🔒 Privacidad y seguridad

- **Todo pasa en tu ordenador.** La interfaz es una página que sirve la propia
  app en `127.0.0.1`, así que no es accesible desde la red local ni desde
  internet.
- Cada arranque genera un **token aleatorio** y la app comprueba las cabeceras
  `Host` y `Origin`, además de aplicar cabeceras CSP.
- **Sin telemetría ni analítica.** La app solo se conecta a Apple (iCloud) y, en
  modo cable, al iPhone.
- **La contraseña nunca se guarda.**
- La **sesión de iCloud se guarda cifrada**. La clave vive en el llavero del
  sistema (Llavero en macOS, Administrador de credenciales en Windows,
  Secret Service/llavero en Linux). Si no hay llavero disponible, se guarda en un
  fichero que solo puede leer tu usuario.
- El modo iCloud usa la **API no oficial de iCloud** a través de la librería
  [pyicloud](https://github.com/timlaing/pyicloud). Apple puede cambiarla y
  hacer que deje de funcionar.
- iCleaning **no está afiliada a Apple**. iPhone e iCloud son marcas de
  Apple Inc.

### Si tienes «Protección avanzada de datos» activada

iCloud no permite acceder a las fotos desde fuera hasta que actives «Acceder a
los datos de iCloud en la web» en **Ajustes › tu nombre › iCloud**. Hazlo antes
de intentar iniciar sesión en el modo iCloud.

### Dónde guarda sus datos

| Sistema | Carpeta |
|---|---|
| Linux | `~/.local/share/iCleaning` |
| macOS | `~/Library/Application Support/iCleaning` |
| Windows | `%LOCALAPPDATA%\iCleaning` |

Ahí están la sesión cifrada, las miniaturas, la lista de la biblioteca y la copia
de la base de datos de Fotos.

Puedes **cerrar sesión y borrar los datos locales de la app** desde el menú de la
cuenta. Eso no toca las fotos que ya hayas guardado en el PC.

## ⬇️ Instalación

Descarga el fichero de la **página de Releases** del repositorio en GitHub.

| Plataforma | Fichero |
|---|---|
| Windows | `iCleaning-windows-x64.exe` |
| macOS (Apple Silicon) | `iCleaning-macos-arm64.zip` |
| macOS (Intel) | `iCleaning-macos-x64.zip` |
| Linux | `iCleaning-linux-x64` |

### Windows

1. Ejecuta `iCleaning-windows-x64.exe`.
2. La primera vez SmartScreen avisará de que la app no está firmada. Pulsa
   **«Más información» › «Ejecutar de todas formas»**.
3. Para el **modo cable** necesitas la app **«Dispositivos de Apple»** de
   Microsoft Store o iTunes instalado.

### macOS

1. Descomprime el ZIP que corresponda a tu Mac.
2. La app no está firmada por Apple. La primera vez macOS no te dejará abrirla:
   ve a **Ajustes del Sistema › Privacidad y seguridad** y pulsa **«Abrir
   igualmente»**.
3. Para el **modo cable** no hace falta instalar nada.
4. La app **no tiene ventana propia**: abre tu navegador. Para salir, usa
   **«Salir»** en el menú de la cuenta.

### Linux

1. Descarga `iCleaning-linux-x64` y dale permisos de ejecución:
   ```sh
   chmod +x iCleaning-linux-x64
   ```
2. Ejecútalo.
3. Para el **modo cable** necesitas `usbmuxd` instalado. Si al borrar por cable
   dice que el iPhone está ocupado, cierra el gestor de archivos (GNOME/KDE
   pueden quedarse con el dispositivo).

### Verificar la descarga

En la página de Releases también está `SHA256SUMS.txt`. Puedes comprobar la
integridad del fichero descargado:

```sh
# Windows
certutil -hashfile iCleaning-windows-x64.exe SHA256

# macOS
shasum -a 256 <fichero>

# Linux
sha256sum -c SHA256SUMS.txt --ignore-missing
```

### Al abrirla

- Se abre tu navegador con la interfaz.
- Si ya está abierta, volver a ejecutarla solo te lleva a la misma página.
- Se cierra sola si no hay ninguna pestaña abierta durante un rato y no hay
  trabajos en marcha.

## ❓ Preguntas frecuentes

**No me llega el código de verificación (2FA).**
En el iPhone, ve a **Ajustes › tu nombre › Inicio de sesión y seguridad › Obtener
código de verificación**.

**He borrado fotos y iCloud sigue lleno.**
Las fotos borradas van a «Eliminado recientemente» y siguen ocupando espacio
durante 30 días. Vacía esa carpeta en el iPhone para liberarlo de verdad.

**¿Se pierde calidad al guardar?**
No. Se guarda el original, sin recomprimir ni modificar.

**He editado una foto en el iPhone y no veo la edición.**
Se guarda el original sin la edición. Los cambios hechos en la app Fotos del
iPhone no se incluyen.

**¿Funciona con Android?**
No, solo con iPhone.

## 🛠️ Desarrollo

Requisitos: Python 3.11 o superior y [uv](https://github.com/astral-sh/uv).

```sh
uv venv .venv --python 3.12
VIRTUAL_ENV=$PWD/.venv uv pip install -r requirements.txt
python -m icleaning
```

Opciones útiles:

| Opción | Para qué |
|---|---|
| `--demo` | Datos inventados, para probar sin iCloud ni iPhone. |
| `--no-open` | No abre el navegador automáticamente. |
| `--port` | Elige el puerto local. |
| `--data` | Carpeta de datos de la app (por defecto, la del sistema). |
| `--no-auto-quit` | No se cierra al quedarse sin pestañas abiertas. |
| `--verbose` | Registro detallado. |

Tests:

```sh
pytest
```

### Estructura

```
icleaning/
├── main.py          punto de entrada
├── app.py           lógica de la aplicación
├── server.py        servidor local de la interfaz
├── photosdb.py      lectura de la base de datos de Fotos
├── organize.py      plantillas de carpetas y XMP
├── secure_store.py  almacenamiento cifrado y llavero
├── sources/
│   ├── icloud.py    modo iCloud (pyicloud)
│   ├── usb.py       modo cable
│   ├── ptp*.py      protocolo PTP del iPhone
│   └── demo.py      datos inventados para --demo
└── web/             interfaz
```

### Ejecutables

Los binarios se generan con PyInstaller:

```sh
pyinstaller packaging/icleaning.spec
```

El flujo de CI está en `.github/workflows/build.yml`: compila las versiones de
Windows, macOS y Linux y publica un **release en borrador** con `SHA256SUMS.txt`
para verificar las descargas.

## 📄 Licencia

MIT. Consulta [LICENSE](LICENSE).

iPhone e iCloud son marcas de Apple Inc. Este proyecto no está afiliado a Apple.
