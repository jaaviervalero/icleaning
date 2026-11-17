/* iCleaning — app shell, i18n, grid, selection, preview, jobs, screens.
   Plain vanilla JS. Exposes window.LF for filters.js and views.js. */
"use strict";

(function () {
  const LF = (window.LF = window.LF || {});
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad = (n) => String(n).padStart(2, "0");

  /* =============================================================== i18n */

  const STRINGS = { es: {}, en: {} };
  const initialLang = (navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en";
  LF.lang = initialLang;

  LF.addStrings = function (dict) {
    if (!dict) return;
    for (const lang of ["es", "en"]) {
      if (dict[lang]) Object.assign(STRINGS[lang], dict[lang]);
    }
  };

  function interpolate(text, params) {
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? String(params[k]) : m));
  }

  LF.t = function (key, params) {
    const table = STRINGS[LF.lang] || STRINGS.en;
    let s = table[key];
    if (s == null) s = STRINGS.en[key];
    if (s == null) return key;
    return interpolate(s, params);
  };

  LF.setLang = function (lang) {
    if (lang !== "es" && lang !== "en") return;
    if (LF.lang === lang) return;
    LF.lang = lang;
    document.documentElement.lang = lang;
    LF.emit("lang", lang);
  };

  const ERR_KEYS = [
    "login.appleId", "login.credentials", "login.locked", "login.rejected", "login.network",
    "login.expired", "login.codeFormat", "login.badCode", "login.securityKey", "login.2sa",
    "login.terms", "icloud.photosUnavailable", "usb.noDevice", "usb.noDriver", "usb.trust",
    "usb.locked", "usb.disconnected", "usb.other", "usb.unavailable", "ptp.notSupported",
    "ptp.noDevice", "ptp.icloudEnabled", "ptp.locked", "ptp.busy", "ptp.notFound", "ptp.other",
    "delete.nothing", "delete.ticket", "delete.wait", "save.nothing", "save.destination",
    "jobs.running", "app.busy", "app.path", "settings.path", "settings.notWritable",
    "template.levels", "template.empty", "template.token", "template.char", "library.read",
    "library.update", "mode", "route", "json", "internal",
  ];

  const S = {
    es: {
      "start.tagline": "Revisa tu fototeca por tamaño y libera espacio sin perder nada.",
      "mode.icloud": "iCloud",
      "mode.cable": "Cable",
      "login.appleId": "Apple ID",
      "login.password": "Contraseña",
      "login.signin": "Iniciar sesión",
      "login.privacy": "Tu contraseña solo va a Apple y no se guarda. La sesión se guarda cifrada en el llavero del sistema.",
      "login.cableTitle": "Modo cable",
      "login.cableNote": "Funciona sin iCloud. Borrar por cable es definitivo y solo funciona con Fotos de iCloud desactivado (experimental).",
      "login.connect": "Conectar iPhone",
      "login.demo": "Probar con datos de ejemplo",
      "connecting.title": "Conectando con iCloud…",
      "connecting.text": "Esto puede tardar unos segundos.",
      "connecting.cancel": "Cancelar",
      "twofa.title": "Verificación en dos pasos",
      "twofa.trusted": "Escribe el código que aparece en tus dispositivos Apple.",
      "twofa.sms": "Escribe el código que te hemos enviado por SMS.",
      "twofa.resend": "Reenviar código",
      "twofa.cancel": "Cancelar",
      "terms.title": "Condiciones de iCloud",
      "terms.text": "Apple pide aceptar las nuevas condiciones de iCloud para continuar.",
      "terms.link": "Leer las condiciones de iCloud",
      "terms.check": "He leído y acepto las condiciones",
      "terms.continue": "Continuar",
      "usb.title": "Conectar por cable",
      "usb.searching": "Conecta el iPhone con el cable y desbloquéalo.",
      "usb.copying": "Copiando la base de datos de Fotos (solo lectura)…",
      "usb.classifying": "Ordenando la biblioteca…",
      "usb.done": "Listo.",
      "usb.progress": "{done} de {total}",
      "usb.device": "iPhone detectado: {name}",
      "usb.retry": "Reintentar",
      "usb.back": "Volver",
      "usb.help.windows": "Instala la app «Dispositivos Apple» desde Microsoft Store o iTunes y vuelve a intentarlo.",
      "usb.help.mac": "Esto no debería pasar en macOS. Desconecta y vuelve a conectar el iPhone.",
      "usb.help.linux": "Instala usbmuxd (por ejemplo, `sudo pacman -S usbmuxd`) y vuelve a intentarlo.",
      "usb.help.other": "Comprueba el cable y vuelve a intentarlo.",
      "loading.title": "Leyendo tu fototeca…",
      "loading.reading": "{done} de {total}",
      "loading.updating": "Actualizando la lista… {done} de {total}",
      "loading.classifying": "Ordenando por personas, lugares y apps… {done} de {total}",
      "loading.hint": "La próxima vez se abre al instante.",
      "loading.thumbs": "Preparando miniaturas… {done} de {total}",
      "toolbar.summary": "{n} elementos · {size}",
      "toolbar.summary1": "1 elemento · {size}",
      "toolbar.zoom": "Tamaño de las miniaturas",
      "toolbar.jobs": "Trabajos",
      "toolbar.account": "Cuenta",
      "scope.all": "Todas las fotos",
      "empty.title": "Nada por aquí",
      "empty.text": "Prueba con otros filtros o cambia de sección.",
      "action.selected": "{n} seleccionados · {size}",
      "action.count": "{n} seleccionados · {size}",
      "action.save": "Guardar en el PC",
      "action.saveN": "Guardar en el PC ({n})",
      "action.delete": "Borrar…",
      "action.selectAll": "Seleccionar todo",
      "action.deselect": "Quitar selección",
      "banner.notInCloud": "Tu iPhone tiene {n} fotos y vídeos ({size}) que NO están en iCloud. Guárdalos en el PC con el cable.",
      "banner.useCable": "Usar modo cable",
      "banner.classifyTitle": "Conecta el iPhone una vez por cable para ordenar por personas, lugares, apps y más.",
      "banner.classify": "Clasificar",
      "banner.classifyProgress": "Clasificando… {done} de {total}",
      "banner.dismiss": "Descartar",
      "menu.account": "{name} · {mode}",
      "menu.noAccount": "Sin cuenta",
      "menu.settings": "Ajustes…",
      "menu.classify": "Clasificar con el iPhone…",
      "menu.switchCable": "Cambiar a modo cable",
      "menu.signout": "Cerrar sesión",
      "menu.disconnect": "Desconectar iPhone",
      "menu.leaveDemo": "Salir de la demo",
      "menu.deleteData": "Cerrar sesión y borrar los datos de esta app…",
      "menu.quit": "Salir de iCleaning",
      "mode.icloudLong": "iCloud",
      "mode.usbLong": "Cable",
      "mode.demoLong": "Demo",
      "data.title": "¿Borrar los datos de esta app?",
      "data.body": "Se borrarán la sesión, las miniaturas, la lista guardada y la copia de la base de datos de Fotos de esta cuenta. No se tocan las fotos que ya hayas guardado.",
      "data.keep": "Se conservan las fotos guardadas en {dir}.",
      "data.delete": "Borrar datos",
      "data.cancel": "Cancelar",
      "delete.title.icloud": "¿Mover {n} elementos a Eliminado recientemente?",
      "delete.title.permanent": "¿Borrar {n} elementos del iPhone para siempre?",
      "delete.size": "{n} elementos · {size}.",
      "delete.videos": "Incluye {n} vídeos.",
      "delete.unsaved": "{n} no están guardados en el PC.",
      "delete.explain.icloud": "Podrás recuperarlos durante 30 días en Fotos › Eliminado recientemente. Siguen ocupando espacio de iCloud hasta que vacíes ese álbum.",
      "delete.explain.permanent": "No se puede deshacer. Solo funciona con Fotos de iCloud desactivado y es experimental.",
      "delete.continue": "Continuar",
      "delete.continueWait": "Continuar ({s})",
      "delete.finalTitle": "Confirmación final",
      "delete.finalText.icloud": "Los elementos seleccionados se moverán a Eliminado recientemente en tu iPhone.",
      "delete.finalText.permanent": "Los elementos seleccionados se borrarán del iPhone de forma permanente.",
      "delete.move": "Mover a Eliminado recientemente",
      "delete.permanently": "Borrar para siempre",
      "delete.cancel": "Cancelar",
      "quit.title": "Hay trabajos en curso",
      "quit.body": "Si sales ahora, los guardados o borrados pendientes se interrumpirán. ¿Salir de todos modos?",
      "quit.force": "Salir de todos modos",
      "quit.cancel": "Cancelar",
      "quit.byeTitle": "iCleaning se ha cerrado",
      "quit.byeText": "Ya puedes cerrar esta pestaña.",
      "pv.selected": "✓ Seleccionada",
      "pv.select": "○ Seleccionar (Espacio)",
      "pv.position": "{i} / {n}",
      "pv.total": "{n} seleccionadas · {size}",
      "pv.none": "nada seleccionado",
      "pv.metaSaved": "guardada en el PC",
      "pv.videoQuality": "vista previa en calidad media; al guardar se baja el original",
      "pv.hints": "Espacio o clic en la foto: marcar · ← → pasar · Esc cerrar",
      "pv.close": "Cerrar",
      "pv.prev": "Anterior",
      "pv.next": "Siguiente",
      "jobs.title": "Trabajos",
      "jobs.none": "No hay trabajos.",
      "jobs.save": "Guardando en el PC",
      "jobs.delete": "Borrando del iPhone",
      "jobs.saved": "Guardado",
      "jobs.deleted": "Borrado",
      "jobs.errors": "{n} con error",
      "jobs.dest": "En {dir}",
      "toast.saveStarted": "Guardando en el PC…",
      "toast.deleteStarted": "Borrando del iPhone…",
      "toast.classifyStarted": "Clasificando con el iPhone…",
      "toast.codeSent": "Código reenviado",
      "toast.settingsUnavailable": "Los ajustes todavía no están disponibles.",
      "toast.genericError": "No se pudo completar la acción: {msg}",
      "toast.connectionLost": "Se perdió la conexión con iCleaning.",
      "fatal.title": "Esta pestaña ya no vale",
      "fatal.text": "Esta pestaña pertenece a una sesión anterior. Vuelve a abrir iCleaning.",
      "common.cancel": "Cancelar",
      "common.close": "Cerrar",
      "err.login.appleId": "Escribe tu Apple ID.",
      "err.login.credentials": "El Apple ID o la contraseña no son correctos.",
      "err.login.locked": "La cuenta está bloqueada. Desbloquéala en el iPhone o en iCloud.com.",
      "err.login.rejected": "Apple no ha aceptado el inicio de sesión.",
      "err.login.network": "No se pudo conectar con iCloud. Comprueba tu conexión.",
      "err.login.expired": "La sesión ha caducado. Vuelve a iniciar sesión.",
      "err.login.codeFormat": "El código debe tener 6 cifras.",
      "err.login.badCode": "El código no es correcto.",
      "err.login.securityKey": "Se necesita una llave de seguridad; no es compatible.",
      "err.login.2sa": "Apple pide verificación en dos pasos.",
      "err.login.terms": "Falta aceptar las condiciones de iCloud.",
      "err.icloud.photosUnavailable": "No se ve «Fotos» en esta cuenta. Dos causas habituales: la sesión guardada ya no vale (cierra sesión y entra de nuevo), o tienes activada la «Protección avanzada de datos» de iCloud sin «Acceder a los datos de iCloud en la web» (Ajustes del iPhone › tu nombre › iCloud).",
      "err.usb.noDevice": "No se encuentra el iPhone. Conéctalo y desbloquéalo.",
      "err.usb.noDriver": "Falta el controlador del iPhone en este sistema.",
      "err.usb.trust": "Toca «Confiar» en el iPhone y escribe tu código.",
      "err.usb.locked": "Desbloquea el iPhone para continuar.",
      "err.usb.disconnected": "El iPhone se ha desconectado.",
      "err.usb.other": "No se pudo leer el iPhone.",
      "err.usb.unavailable": "El modo cable no está disponible.",
      "err.ptp.notSupported": "Este iPhone no admite el borrado por cable.",
      "err.ptp.noDevice": "No se encuentra el iPhone.",
      "err.ptp.icloudEnabled": "Desactiva Fotos de iCloud en el iPhone para borrar por cable.",
      "err.ptp.locked": "Desbloquea el iPhone.",
      "err.ptp.busy": "El iPhone está ocupado. Espera un momento.",
      "err.ptp.notFound": "No se encontraron los elementos en el iPhone.",
      "err.ptp.other": "El iPhone rechazó la operación.",
      "err.delete.nothing": "No hay nada que borrar.",
      "err.delete.ticket": "La confirmación ha caducado. Vuelve a intentarlo.",
      "err.delete.wait": "Espera un momento antes de confirmar.",
      "err.save.nothing": "No hay nada que guardar.",
      "err.save.destination": "No se puede escribir en la carpeta de destino.",
      "err.jobs.running": "Hay trabajos en curso.",
      "err.app.busy": "iCleaning está ocupado. Espera un momento.",
      "err.app.path": "Ruta no válida.",
      "err.settings.path": "La carpeta no es válida.",
      "err.settings.notWritable": "La carpeta no se puede escribir.",
      "err.template.levels": "La plantilla tiene demasiados niveles.",
      "err.template.empty": "La plantilla está vacía.",
      "err.template.token": "La plantilla tiene un marcador desconocido.",
      "err.template.char": "La plantilla tiene caracteres no válidos.",
      "err.library.read": "No se pudo leer la biblioteca.",
      "err.library.update": "No se pudo actualizar la biblioteca.",
      "err.mode": "Ese modo no está disponible.",
      "err.route": "Ruta desconocida.",
      "err.json": "La petición no es válida.",
      "err.internal": "Algo ha fallado dentro de iCleaning.",
    },
    en: {
      "start.tagline": "Review your photo library by size and free up space without losing anything.",
      "mode.icloud": "iCloud",
      "mode.cable": "Cable",
      "login.appleId": "Apple ID",
      "login.password": "Password",
      "login.signin": "Sign in",
      "login.privacy": "Your password goes only to Apple and is never stored. The session is saved encrypted in your system keychain.",
      "login.cableTitle": "Cable mode",
      "login.cableNote": "Works without iCloud. Deleting by cable is permanent and only works with iCloud Photos turned off (experimental).",
      "login.connect": "Connect iPhone",
      "login.demo": "Try with sample data",
      "connecting.title": "Connecting to iCloud…",
      "connecting.text": "This may take a few seconds.",
      "connecting.cancel": "Cancel",
      "twofa.title": "Two-factor authentication",
      "twofa.trusted": "Enter the code shown on your Apple devices.",
      "twofa.sms": "Enter the code we sent you by SMS.",
      "twofa.resend": "Resend code",
      "twofa.cancel": "Cancel",
      "terms.title": "iCloud terms",
      "terms.text": "Apple asks you to accept the new iCloud terms to continue.",
      "terms.link": "Read the iCloud terms",
      "terms.check": "I have read and accept the terms",
      "terms.continue": "Continue",
      "usb.title": "Connect by cable",
      "usb.searching": "Connect your iPhone with the cable and unlock it.",
      "usb.copying": "Copying the Photos database (read-only)…",
      "usb.classifying": "Sorting your library…",
      "usb.done": "Done.",
      "usb.progress": "{done} of {total}",
      "usb.device": "iPhone detected: {name}",
      "usb.retry": "Retry",
      "usb.back": "Back",
      "usb.help.windows": "Install the “Apple Devices” app from the Microsoft Store or iTunes, then try again.",
      "usb.help.mac": "This should not happen on macOS. Unplug and reconnect the iPhone.",
      "usb.help.linux": "Install usbmuxd (for example, `sudo pacman -S usbmuxd`), then try again.",
      "usb.help.other": "Check the cable and try again.",
      "loading.title": "Reading your library…",
      "loading.reading": "{done} of {total}",
      "loading.updating": "Updating the list… {done} of {total}",
      "loading.classifying": "Sorting by people, places and apps… {done} of {total}",
      "loading.hint": "Next time it opens instantly.",
      "loading.thumbs": "Preparing thumbnails… {done} of {total}",
      "toolbar.summary": "{n} items · {size}",
      "toolbar.summary1": "1 item · {size}",
      "toolbar.zoom": "Thumbnail size",
      "toolbar.jobs": "Jobs",
      "toolbar.account": "Account",
      "scope.all": "All photos",
      "empty.title": "Nothing here",
      "empty.text": "Try other filters or pick another section.",
      "action.selected": "{n} selected · {size}",
      "action.count": "{n} selected · {size}",
      "action.save": "Save to PC",
      "action.saveN": "Save to PC ({n})",
      "action.delete": "Delete…",
      "action.selectAll": "Select all",
      "action.deselect": "Deselect",
      "banner.notInCloud": "Your iPhone has {n} photos and videos ({size}) that are NOT in iCloud. Save them to your PC with the cable.",
      "banner.useCable": "Use cable mode",
      "banner.classifyTitle": "Connect your iPhone once by cable to sort by people, places, apps and more.",
      "banner.classify": "Classify",
      "banner.classifyProgress": "Classifying… {done} of {total}",
      "banner.dismiss": "Dismiss",
      "menu.account": "{name} · {mode}",
      "menu.noAccount": "No account",
      "menu.settings": "Settings…",
      "menu.classify": "Classify with iPhone…",
      "menu.switchCable": "Switch to cable mode",
      "menu.signout": "Sign out",
      "menu.disconnect": "Disconnect iPhone",
      "menu.leaveDemo": "Leave demo",
      "menu.deleteData": "Sign out and delete this app’s data…",
      "menu.quit": "Quit iCleaning",
      "mode.icloudLong": "iCloud",
      "mode.usbLong": "Cable",
      "mode.demoLong": "Demo",
      "data.title": "Delete this app’s data?",
      "data.body": "The session, thumbnails, cached list and the copy of the Photos database for this account will be deleted. Photos you already saved are never touched.",
      "data.keep": "Photos saved in {dir} are kept.",
      "data.delete": "Delete data",
      "data.cancel": "Cancel",
      "delete.title.icloud": "Move {n} items to Recently Deleted?",
      "delete.title.permanent": "Permanently delete {n} items from your iPhone?",
      "delete.size": "{n} items · {size}.",
      "delete.videos": "Includes {n} videos.",
      "delete.unsaved": "{n} are not saved on your PC.",
      "delete.explain.icloud": "You can recover them for 30 days in Photos › Recently Deleted. They keep using iCloud storage until you empty that album.",
      "delete.explain.permanent": "This cannot be undone. Only works with iCloud Photos off, and it is experimental.",
      "delete.continue": "Continue",
      "delete.continueWait": "Continue ({s})",
      "delete.finalTitle": "Final confirmation",
      "delete.finalText.icloud": "The selected items will be moved to Recently Deleted on your iPhone.",
      "delete.finalText.permanent": "The selected items will be permanently deleted from your iPhone.",
      "delete.move": "Move to Recently Deleted",
      "delete.permanently": "Delete permanently",
      "delete.cancel": "Cancel",
      "quit.title": "Jobs are running",
      "quit.body": "If you quit now, pending saves or deletes will be interrupted. Quit anyway?",
      "quit.force": "Quit anyway",
      "quit.cancel": "Cancel",
      "quit.byeTitle": "iCleaning has quit",
      "quit.byeText": "You can close this tab.",
      "pv.selected": "✓ Selected",
      "pv.select": "○ Select (Space)",
      "pv.position": "{i} / {n}",
      "pv.total": "{n} selected · {size}",
      "pv.none": "nothing selected",
      "pv.metaSaved": "saved on the PC",
      "pv.videoQuality": "preview in medium quality; saving downloads the original",
      "pv.hints": "Space or click the photo: select · ← → move · Esc close",
      "pv.close": "Close",
      "pv.prev": "Previous",
      "pv.next": "Next",
      "jobs.title": "Jobs",
      "jobs.none": "No jobs.",
      "jobs.save": "Saving to the PC",
      "jobs.delete": "Deleting from the iPhone",
      "jobs.saved": "Saved",
      "jobs.deleted": "Deleted",
      "jobs.errors": "{n} with errors",
      "jobs.dest": "In {dir}",
      "toast.saveStarted": "Saving to the PC…",
      "toast.deleteStarted": "Deleting from the iPhone…",
      "toast.classifyStarted": "Classifying with the iPhone…",
      "toast.codeSent": "Code sent again",
      "toast.settingsUnavailable": "Settings are not available yet.",
      "toast.genericError": "Could not complete the action: {msg}",
      "toast.connectionLost": "Lost the connection to iCleaning.",
      "fatal.title": "This tab is out of date",
      "fatal.text": "This tab belongs to an old session: open iCleaning again.",
      "common.cancel": "Cancel",
      "common.close": "Close",
      "err.login.appleId": "Enter your Apple ID.",
      "err.login.credentials": "The Apple ID or the password is not correct.",
      "err.login.locked": "The account is locked. Unlock it on the iPhone or at iCloud.com.",
      "err.login.rejected": "Apple did not accept the sign-in.",
      "err.login.network": "Could not reach iCloud. Check your connection.",
      "err.login.expired": "The session expired. Sign in again.",
      "err.login.codeFormat": "The code must have 6 digits.",
      "err.login.badCode": "That code is not correct.",
      "err.login.securityKey": "A security key is required; it is not supported.",
      "err.login.2sa": "Apple asks for two-step verification.",
      "err.login.terms": "You need to accept the iCloud terms.",
      "err.icloud.photosUnavailable": "Photos is not visible on this account. Two usual causes: the saved session is no longer valid (sign out and sign in again), or iCloud Advanced Data Protection is on without \"Access iCloud Data on the Web\" (iPhone Settings › your name › iCloud).",
      "err.usb.noDevice": "The iPhone was not found. Connect it and unlock it.",
      "err.usb.noDriver": "The iPhone driver is missing on this system.",
      "err.usb.trust": "Tap Trust on the iPhone and enter your passcode.",
      "err.usb.locked": "Unlock the iPhone to continue.",
      "err.usb.disconnected": "The iPhone was disconnected.",
      "err.usb.other": "Could not read the iPhone.",
      "err.usb.unavailable": "Cable mode is not available.",
      "err.ptp.notSupported": "This iPhone does not support deleting by cable.",
      "err.ptp.noDevice": "The iPhone was not found.",
      "err.ptp.icloudEnabled": "Turn off iCloud Photos on the iPhone to delete by cable.",
      "err.ptp.locked": "Unlock the iPhone.",
      "err.ptp.busy": "The iPhone is busy. Wait a moment.",
      "err.ptp.notFound": "The items were not found on the iPhone.",
      "err.ptp.other": "The iPhone refused the operation.",
      "err.delete.nothing": "There is nothing to delete.",
      "err.delete.ticket": "The confirmation expired. Try again.",
      "err.delete.wait": "Wait a moment before confirming.",
      "err.save.nothing": "There is nothing to save.",
      "err.save.destination": "The destination folder cannot be written.",
      "err.jobs.running": "Jobs are running.",
      "err.app.busy": "iCleaning is busy. Wait a moment.",
      "err.app.path": "Invalid path.",
      "err.settings.path": "That folder is not valid.",
      "err.settings.notWritable": "That folder cannot be written.",
      "err.template.levels": "The template has too many levels.",
      "err.template.empty": "The template is empty.",
      "err.template.token": "The template has an unknown token.",
      "err.template.char": "The template has invalid characters.",
      "err.library.read": "Could not read the library.",
      "err.library.update": "Could not update the library.",
      "err.mode": "That mode is not available.",
      "err.route": "Unknown route.",
      "err.json": "The request is not valid.",
      "err.internal": "Something failed inside iCleaning.",
    },
  };
  LF.addStrings(S);

  function errText(code, detail) {
    if (!code) return detail || LF.t("err.internal");
    const key = "err." + code;
    const s = LF.t(key);
    if (s === key) return detail || code;
    return s;
  }

  /* =============================================================== icons */

  const ICONS = {
    photos: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-5 4 4 3-3 4 4"/>',
    sparkles: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
    people: '<circle cx="9" cy="9" r="3"/><path d="M3.5 19c.7-3 2.8-4.5 5.5-4.5S13.8 16 14.5 19"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 14.8c2.4.3 4 1.7 4.6 4.2"/>',
    person: '<circle cx="12" cy="8.5" r="3.2"/><path d="M5.5 20c1-3.6 3.4-5.4 6.5-5.4s5.5 1.8 6.5 5.4"/>',
    pin: '<path d="M12 21s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z"/><circle cx="12" cy="10.8" r="2.2"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
    selfie: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><circle cx="12" cy="9" r="2.2"/><path d="M8.5 16c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4"/>',
    live: '<circle cx="12" cy="12" r="3"/><path d="M6.6 6.6a7.6 7.6 0 000 10.8M17.4 6.6a7.6 7.6 0 010 10.8M3.8 3.8a11.6 11.6 0 000 16.4M20.2 3.8a11.6 11.6 0 010 16.4"/>',
    portrait: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="12" cy="10" r="2.5"/><path d="M7 18c1-2.2 2.8-3.3 5-3.3s4 1.1 5 3.3"/>',
    panorama: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/>',
    slomo: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/><path d="M4 4l2 2"/>',
    timelapse: '<circle cx="12" cy="12" r="8"/><path d="M12 12V8M12 12l3 2"/><path d="M12 2v2M22 12h-2M12 22v-2M2 12h2"/>',
    screenshot: '<rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M9 5.5h6"/><path d="M9 18.5h6"/>',
    screenrec: '<rect x="3" y="4.5" width="18" height="13" rx="2"/><path d="M9 21h6M12 17.5V21"/><circle cx="12" cy="11" r="2.2" fill="currentColor" stroke="none"/>',
    camera: '<path d="M4 8h3l2-2h6l2 2h3a1.5 1.5 0 011.5 1.5v8A1.5 1.5 0 0120 19H4a1.5 1.5 0 01-1.5-1.5v-8A1.5 1.5 0 014 8z"/><circle cx="12" cy="13.5" r="3.5"/>',
    chat: '<path d="M20.5 11.5a8 8 0 01-8 8H6l-3 2.5V11.5a8 8 0 018-8h1.5a8 8 0 018 8z"/>',
    social: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.9l7.6-3.8M8.2 13.1l7.6 3.8"/>',
    messaging: '<path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H9l-5 4V6a1 1 0 011-1z"/><path d="M8 9.5h8M8 13h5"/>',
    airdrop: '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 000 8.4M16.2 7.8a6 6 0 010 8.4M4.9 4.9a10 10 0 000 14.2M19.1 4.9a10 10 0 010 14.2"/>',
    apps: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    duplicate: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
    similar: '<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>',
    burst: '<rect x="7" y="3" width="12" height="14" rx="2"/><path d="M4 6v13a2 2 0 002 2h9"/>',
    poor: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 17l5-5 3 3M21 19L3 5"/>',
    heart: '<path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0112 8a4.2 4.2 0 017 2.7C19 15.6 12 20 12 20z"/>',
    hidden: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/><path d="M4 20L20 4"/>',
    saved: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.5 9"/>',
    notsaved: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12h7"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-5-5"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    sort: '<path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
    logout: '<path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    "chevron-left": '<path d="M15 5l-7 7 7 7"/>',
    "chevron-right": '<path d="M9 5l7 7-7 7"/>',
    "chevron-down": '<path d="M5 9l7 7 7-7"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    paw: '<circle cx="7" cy="9" r="1.8"/><circle cx="12" cy="7" r="1.8"/><circle cx="17" cy="9" r="1.8"/><path d="M12 11c2.6 0 4.5 2 4.5 4.2 0 1.8-1.3 2.8-2.7 2.8-.8 0-1.2-.4-1.8-.4s-1 .4-1.8.4c-1.4 0-2.7-1-2.7-2.8C7.5 13 9.4 11 12 11z"/>',
    folder: '<path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/>',
    drive: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="15" r="1.2"/><path d="M13 9h5"/>',
    warning: '<path d="M12 3L2.5 20h19L12 3z"/><path d="M12 9v5M12 17v.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10.5 18.5h3"/>',
    cable: '<path d="M8 4v5a4 4 0 008 0V4M8 4H6M16 4h2"/><path d="M12 13v7M9 20h6"/>',
    cloud: '<path d="M7 18a4 4 0 01-.6-7.9A6 6 0 0118 9.5a4.2 4.2 0 01.5 8.4H7z"/>',
    download: '<path d="M12 3v11M8 10l4 4 4-4M4 17v3h16v-3"/>',
    play: '<path d="M7 4l13 8-13 8V4z"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  };

  LF.icon = function (name) {
    const body = ICONS[name] || ICONS.info;
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + "</svg>"
    );
  };

  function iconNode(name, cls) {
    const s = el("span", "icon" + (cls ? " " + cls : ""));
    s.innerHTML = LF.icon(name);
    return s;
  }

  /* =============================================================== formats */

  const locale = () => (LF.lang === "es" ? "es-ES" : "en-US");

  LF.fmtBytes = function (n) {
    if (n == null || isNaN(n)) return "—";
    n = Number(n);
    if (n < 1000) return Math.round(n) + " B";
    const gb = n / 1e9;
    const mb = n / 1e6;
    if (gb >= 1) {
      const d = gb >= 100 ? 0 : gb >= 10 ? 1 : 2;
      return gb.toLocaleString(locale(), { minimumFractionDigits: 0, maximumFractionDigits: d }) + " GB";
    }
    if (mb >= 1) {
      const d = mb >= 100 ? 0 : mb >= 10 ? 0 : 1;
      return mb.toLocaleString(locale(), { minimumFractionDigits: 0, maximumFractionDigits: d }) + " MB";
    }
    return Math.max(1, Math.round(n / 1000)) + " KB";
  };

  LF.fmtNum = function (n) {
    return Number(n || 0).toLocaleString(locale());
  };

  LF.fmtDur = function (sec) {
    sec = Math.max(0, Math.round(Number(sec) || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0 ? h + ":" + pad(m) + ":" + pad(s) : m + ":" + pad(s);
  };

  LF.fmtDate = function (ts, opts) {
    const d = new Date((Number(ts) || 0) * 1000);
    try {
      return d.toLocaleString(locale(), opts || { dateStyle: "medium", timeStyle: "short" });
    } catch (e) {
      return d.toLocaleString();
    }
  };

  LF.fmtMonth = function (ts) {
    const d = new Date((Number(ts) || 0) * 1000);
    try {
      return d.toLocaleDateString(locale(), { month: "short", year: "numeric" });
    } catch (e) {
      return d.toDateString();
    }
  };

  /* =============================================================== token + api */

  let TOKEN = "";
  (function readToken() {
    let hash = "";
    try {
      hash = (location.hash || "").replace(/^#/, "");
    } catch (e) {
      hash = "";
    }
    if (hash) {
      TOKEN = hash;
      try {
        sessionStorage.setItem("lf-token", hash);
      } catch (e) {
        /* private mode */
      }
      try {
        history.replaceState(null, "", location.pathname + location.search);
      } catch (e) {
        /* ignore */
      }
    } else {
      try {
        TOKEN = sessionStorage.getItem("lf-token") || "";
      } catch (e) {
        TOKEN = "";
      }
    }
  })();

  LF.api = async function (path, body) {
    const opts = {
      method: body === undefined ? "GET" : "POST",
      headers: { "X-Token": TOKEN },
      cache: "no-store",
    };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(path, opts);
    } catch (e) {
      const err = new Error("network");
      err.code = "network";
      err.http = 0;
      throw err;
    }
    if (!res.ok) {
      let code = "";
      let detail = "";
      try {
        const j = await res.json();
        code = j.error || "";
        detail = j.detail || "";
      } catch (e) {
        try {
          detail = await res.text();
        } catch (e2) {
          detail = "";
        }
      }
      const err = new Error(code || "http-" + res.status);
      err.code = code;
      err.detail = detail;
      err.http = res.status;
      throw err;
    }
    if (res.status === 204) return {};
    try {
      return await res.json();
    } catch (e) {
      return {};
    }
  };

  LF.thumbUrl = (id) => "/thumb/" + encodeURIComponent(id) + "?t=" + encodeURIComponent(TOKEN);
  LF.previewUrl = (id) => "/preview/" + encodeURIComponent(id) + "?t=" + encodeURIComponent(TOKEN);
  LF.videoUrl = (id) => "/video/" + encodeURIComponent(id) + "?t=" + encodeURIComponent(TOKEN);

  /* =============================================================== events + state */

  const listeners = {};
  LF.on = function (ev, cb) {
    (listeners[ev] || (listeners[ev] = [])).push(cb);
  };
  LF.emit = function (ev, data) {
    const arr = listeners[ev] || [];
    for (const cb of arr.slice()) {
      try {
        cb(data);
      } catch (e) {
        console.error(e);
      }
    }
  };

  LF.items = [];
  LF.byId = new Map();
  LF.meta = { people: [], places: [], cameras: [], moments: [], source: "", permanent: false };
  LF.st = {};
  LF.sel = new Set();

  LF.select = function (ids, on) {
    if (on === undefined) on = true;
    const list = Array.isArray(ids) ? ids : [ids];
    let changed = false;
    for (const id of list) {
      if (on && !LF.sel.has(id)) {
        LF.sel.add(id);
        changed = true;
      } else if (!on && LF.sel.has(id)) {
        LF.sel.delete(id);
        changed = true;
      }
    }
    if (changed) LF.emit("selection");
  };

  LF.clearSelection = function () {
    if (!LF.sel.size) return;
    LF.sel.clear();
    LF.emit("selection");
  };

  /* =============================================================== views */

  const views = {};
  let currentView = null;
  let viewTitle = "";

  LF.registerView = function (name, def) {
    views[name] = def || {};
  };

  LF.registerSidebar = function (fn) {
    if (typeof fn === "function") fn($("#sidebar"));
  };

  LF.openSettings =
    LF.openSettings ||
    function () {
      LF.toast(LF.t("toast.settingsUnavailable"));
    };

  /* =============================================================== scopes + refine */

  LF.scope = { key: "all", title: "", filter: () => true, sort: "size" };
  LF.refine = {
    predicate: () => true,
    sort: null,
    count: 0,
    reset() {
      this.predicate = () => true;
      this.sort = null;
      this.count = 0;
      LF.emit("filters");
    },
  };

  function itemSort(a, b, key) {
    switch (key) {
      case "new":
        return b.d - a.d;
      case "old":
        return a.d - b.d;
      case "dur":
        return (b.dur || 0) - (a.dur || 0);
      case "quality":
        return (a.q == null ? 101 : a.q) - (b.q == null ? 101 : b.q);
      case "group": {
        const ga = a.g == null ? null : a.g;
        const gb = b.g == null ? null : b.g;
        if (ga !== gb) {
          if (ga == null) return 1;
          if (gb == null) return -1;
          return ga < gb ? -1 : 1;
        }
        if (ga != null) {
          if (!!a.best !== !!b.best) return a.best ? -1 : 1;
          return b.s - a.s;
        }
        return b.s - a.s;
      }
      case "size":
      default:
        return b.s - a.s;
    }
  }

  function computeVisible() {
    const scope = LF.scope || {};
    const filter = typeof scope.filter === "function" ? scope.filter : () => true;
    const pred = typeof LF.refine.predicate === "function" ? LF.refine.predicate : () => true;
    const sortKey = LF.refine.sort || scope.sort || "size";
    const list = [];
    for (const it of LF.items) {
      try {
        if (filter(it) && pred(it)) list.push(it);
      } catch (e) {
        /* a broken refinement must not take the grid down */
      }
    }
    list.sort((a, b) => itemSort(a, b, sortKey));
    return list;
  }

  let visible = [];

  LF.setScope = function (scope) {
    const s = scope || {};
    LF.scope = {
      key: s.key || "custom",
      title: s.title || "",
      subtitle: s.subtitle || "",
      filter: typeof s.filter === "function" ? s.filter : () => true,
      sort: s.sort || null,
      actions: Array.isArray(s.actions) ? s.actions : null,
    };
    if (previewIndex >= 0) closePreview();
    LF.showView(null);
    if (gridScroller) gridScroller.scrollTop = 0;
    renderGrid(false);
    LF.emit("scope", LF.scope);
  };

  LF.showView = function (name) {
    if (name && views[name]) {
      if (previewIndex >= 0) closePreview();
      if (currentView && views[currentView] && typeof views[currentView].unmount === "function") {
        try {
          views[currentView].unmount();
        } catch (e) {
          console.error(e);
        }
      }
      currentView = name;
      viewTitle = views[name].title || "";
      const host = $("#view");
      host.innerHTML = "";
      const doc = el("div", "view-doc");
      host.appendChild(doc);
      try {
        views[name].mount(doc);
      } catch (e) {
        console.error(e);
      }
      updateHeader();
      renderActionBar();
      return;
    }
    if (currentView && views[currentView] && typeof views[currentView].unmount === "function") {
      try {
        views[currentView].unmount();
      } catch (e) {
        console.error(e);
      }
    }
    currentView = null;
    viewTitle = "";
    $("#view").innerHTML = "";
    renderAll(false);
  };

  /* =============================================================== DOM refs */

  const appEl = $("#app");
  const sidebarEl = $("#sidebar");
  const viewEl = $("#view");
  const bannerEl = $("#banners");
  const actionbarEl = $("#actionbar");
  const jobsEl = $("#jobs");
  const toastsEl = $("#toasts");
  const previewEl = $("#preview");
  const screensEl = $("#screens");
  const zoomInput = $("#zoom");
  const toolbarTitle = $("#scope-title");
  const toolbarSubtitle = $("#scope-subtitle");
  const jobsBtn = $("#jobs-btn");
  const accountBtn = $("#account-btn");
  const accountInitial = $("#account-initial");

  let gridScroller = null;
  let gridSpace = null;
  let emptyEl = null;
  let gridPool = new Map();
  let gridRO = null;
  let colCount = 1;
  let tilePx = 150;
  let rowH = 152;
  const GAP = 2;
  const PAD = 2;

  /* =============================================================== helpers */

  function sumBytes(list) {
    let n = 0;
    for (const it of list) n += it.s || 0;
    return n;
  }

  function isVisibleNow(item) {
    const scope = LF.scope || {};
    const filter = typeof scope.filter === "function" ? scope.filter : () => true;
    const pred = typeof LF.refine.predicate === "function" ? LF.refine.predicate : () => true;
    try {
      return filter(item) && pred(item);
    } catch (e) {
      return false;
    }
  }

  function updateHeader() {
    if (currentView) {
      const def = views[currentView];
      toolbarTitle.textContent = (def && def.title) || viewTitle || "";
      toolbarSubtitle.textContent = "";
      return;
    }
    // titleKey keeps the title translated when the language changes
    toolbarTitle.textContent = (LF.scope.titleKey ? LF.t(LF.scope.titleKey) : LF.scope.title) || LF.t("scope.all");
    const n = visible.length;
    toolbarSubtitle.textContent = LF.t(visible.length === 1 ? "toolbar.summary1" : "toolbar.summary", {
      n: LF.fmtNum(n),
      size: LF.fmtBytes(sumBytes(visible)),
    });
  }

  function refreshVisible(resetScroll) {
    visible = computeVisible();
    updateHeader();
    renderGrid(resetScroll);
    renderActionBar();
    if (previewIndex >= 0) validatePreview();
  }

  function renderAll(resetScroll) {
    visible = computeVisible();
    updateHeader();
    if (currentView) {
      renderActionBar();
      return;
    }
    buildGrid();
    renderGrid(resetScroll);
    renderActionBar();
  }

  function errMessage(e) {
    if (!e) return LF.t("err.internal");
    if (e.code === "network") return LF.t("toast.connectionLost");
    return errText(e.code, e.detail);
  }

  /* =============================================================== toasts */

  LF.toast = function (text, kind) {
    if (!text) return;
    const t = el("div", "toast" + (kind === "error" ? " error" : ""), text);
    toastsEl.appendChild(t);
    setTimeout(() => {
      t.remove();
    }, kind === "error" ? 5200 : 3400);
  };

  /* =============================================================== sheets */

  let openSheets = [];

  LF.openSheet = function (opts) {
    opts = opts || {};
    const backdrop = el("div", "sheet-backdrop");
    const sheet = el("div", "sheet");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    const header = el("div", "sheet-header");
    const title = el("h2", null, opts.title || "");
    header.appendChild(title);
    const body = el("div", "sheet-body");
    if (opts.body instanceof Node) body.appendChild(opts.body);
    else if (opts.body != null) body.innerHTML = String(opts.body);
    const footer = el("div", "sheet-footer");
    sheet.appendChild(header);
    sheet.appendChild(body);
    sheet.appendChild(footer);
    backdrop.appendChild(sheet);
    document.body.appendChild(backdrop);

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      backdrop.remove();
      openSheets = openSheets.filter((s) => s !== handle);
      document.removeEventListener("keydown", onKey, true);
      if (typeof opts.onClose === "function") {
        try {
          opts.onClose();
        } catch (e) {
          console.error(e);
        }
      }
    }

    function onKey(e) {
      if (openSheets[openSheets.length - 1] !== handle) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === "Tab") {
        const focusables = Array.from(
          sheet.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter((n) => !n.disabled && n.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey, true);

    const handle = { close: close, el: sheet, body: body, footer: footer };
    openSheets.push(handle);

    const buttons = Array.isArray(opts.buttons) ? opts.buttons : [];
    for (const b of buttons) {
      const cls = "btn" + (b.kind === "primary" ? " primary" : b.kind === "danger" ? " danger" : b.kind === "plain" ? " plain" : "");
      const btn = el("button", cls, b.label || "");
      btn.type = "button";
      if (b.disabled) btn.disabled = true;
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        let keep = false;
        if (typeof b.run === "function") {
          try {
            const r = await b.run(handle);
            keep = r === false;
          } catch (e) {
            LF.toast(errMessage(e), "error");
          }
        }
        if (!keep) close();
      });
      footer.appendChild(btn);
      b.el = btn;
    }

    setTimeout(() => {
      const target = sheet.querySelector("input, select, textarea, button.primary, button.danger, button");
      if (target) target.focus();
    }, 30);
    return handle;
  };

  /* =============================================================== fatal + screens */

  let fatalShown = false;

  function showFatal(title, text) {
    fatalShown = true;
    appEl.hidden = true;
    screensEl.hidden = false;
    showScreen("fatal");
    $("#fatal-title").textContent = title;
    $("#fatal-text").textContent = text;
  }

  function fatalSession() {
    if (fatalShown) return;
    showFatal(LF.t("fatal.title"), LF.t("fatal.text"));
  }

  function showScreen(name) {
    screensEl.hidden = false;
    for (const s of $$(".screen", screensEl)) s.hidden = s.dataset.screen !== name;
  }

  function hideScreens() {
    screensEl.hidden = true;
  }

  /* =============================================================== start screen */

  let startMode = "icloud";
  let loginBusy = false;

  const tabIcloud = $("#tab-icloud");
  const tabUsb = $("#tab-usb");
  const loginForm = $("#login-form");
  const usbPane = $("#usb-pane");
  const appleIdInput = $("#apple-id");
  const passwordInput = $("#password");
  const loginError = $("#login-error");
  const signinBtn = $("#signin");
  const usbError = $("#usb-error");
  const connectUsbBtn = $("#connect-usb");

  function setupStartStatic() {
    $("#start-tagline").textContent = LF.t("start.tagline");
    tabIcloud.textContent = LF.t("mode.icloud");
    tabUsb.textContent = LF.t("mode.cable");
    $("#apple-id-label").textContent = LF.t("login.appleId");
    $("#password-label").textContent = LF.t("login.password");
    $("#privacy-note").textContent = LF.t("login.privacy");
    signinBtn.textContent = LF.t("login.signin");
    $("#usb-note").textContent = LF.t("login.cableNote");
    connectUsbBtn.textContent = LF.t("login.connect");
    $("#try-demo").textContent = LF.t("login.demo");
    $("#connecting-title").textContent = LF.t("connecting.title");
    $("#connecting-text").textContent = LF.t("connecting.text");
    $("#connecting-cancel").textContent = LF.t("connecting.cancel");
    $("#twofa-resend").textContent = LF.t("twofa.resend");
    $("#twofa-cancel").textContent = LF.t("twofa.cancel");
    $("#terms-title").textContent = LF.t("terms.title");
    $("#terms-text").textContent = LF.t("terms.text");
    $("#terms-link").textContent = LF.t("terms.link");
    $("#terms-check-label").textContent = LF.t("terms.check");
    $("#terms-continue").textContent = LF.t("terms.continue");
    $("#usb-title").textContent = LF.t("usb.title");
    $("#usb-retry").textContent = LF.t("usb.retry");
    $("#usb-back").textContent = LF.t("usb.back");
    $("#loading-title").textContent = LF.t("loading.title");
    $("#loading-hint").textContent = LF.t("loading.hint");
    $("#cable-art").innerHTML = "";
    $("#cable-art").appendChild(iconNode("phone"));
    $("#cable-art").appendChild(iconNode("cable"));
    $("#zoom-small").innerHTML = LF.icon("photos");
    $("#zoom-big").innerHTML = LF.icon("photos");
    $("#jobs-glyph").innerHTML = LF.icon("chart");
    $("#pv-close").innerHTML = LF.icon("close");
    $("#pv-prev").innerHTML = '<span aria-hidden="true" style="line-height:1">‹</span>';
    $("#pv-next").innerHTML = '<span aria-hidden="true" style="line-height:1">›</span>';
    $("#pv-prev").title = LF.t("pv.prev");
    $("#pv-next").title = LF.t("pv.next");
    $("#pv-close").title = LF.t("pv.close");
    jobsBtn.title = LF.t("toolbar.jobs");
    accountBtn.title = LF.t("toolbar.account");
    zoomInput.setAttribute("aria-label", LF.t("toolbar.zoom"));
    $("#zoom-wrap").title = LF.t("toolbar.zoom");
  }

  function setStartMode(mode) {
    startMode = mode === "usb" ? "usb" : "icloud";
    tabIcloud.classList.toggle("on", startMode === "icloud");
    tabUsb.classList.toggle("on", startMode === "usb");
    tabIcloud.setAttribute("aria-selected", String(startMode === "icloud"));
    tabUsb.setAttribute("aria-selected", String(startMode === "usb"));
    loginForm.hidden = startMode !== "icloud";
    usbPane.hidden = startMode !== "usb";
    loginError.textContent = "";
    usbError.textContent = "";
  }

  tabIcloud.addEventListener("click", () => setStartMode("icloud"));
  tabUsb.addEventListener("click", () => setStartMode("usb"));

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginBusy) return;
    const appleId = appleIdInput.value.trim();
    const password = passwordInput.value;
    if (!appleId) {
      loginError.textContent = errText("login.appleId");
      appleIdInput.focus();
      return;
    }
    loginError.textContent = "";
    loginBusy = true;
    signinBtn.disabled = true;
    try {
      await LF.api("/api/login", { appleId, password });
      passwordInput.value = "";
      scheduleState(50);
    } catch (err) {
      loginError.textContent = errMessage(err);
      passwordInput.select();
    } finally {
      passwordInput.value = "";
      loginBusy = false;
      signinBtn.disabled = false;
    }
  });

  connectUsbBtn.addEventListener("click", async () => {
    usbError.textContent = "";
    connectUsbBtn.disabled = true;
    try {
      await LF.api("/api/mode", { mode: "usb" });
      scheduleState(50);
    } catch (err) {
      usbError.textContent = errMessage(err);
    } finally {
      connectUsbBtn.disabled = false;
    }
  });

  $("#try-demo").addEventListener("click", async () => {
    loginError.textContent = "";
    usbError.textContent = "";
    try {
      await LF.api("/api/mode", { mode: "demo" });
      scheduleState(50);
    } catch (err) {
      if (startMode === "usb") usbError.textContent = errMessage(err);
      else loginError.textContent = errMessage(err);
    }
  });

  $("#connecting-cancel").addEventListener("click", async () => {
    try {
      await LF.api("/api/login/cancel", {});
    } catch (e) {
      /* the state poll will move us on */
    }
  });

  $("#terms-check").addEventListener("change", (e) => {
    $("#terms-continue").disabled = !e.target.checked;
  });

  $("#terms-continue").addEventListener("click", async () => {
    const btn = $("#terms-continue");
    btn.disabled = true;
    try {
      await LF.api("/api/login/terms", { accept: true });
      scheduleState(50);
    } catch (err) {
      LF.toast(errMessage(err), "error");
      btn.disabled = false;
    }
  });

  $("#usb-back").addEventListener("click", async () => {
    try {
      await LF.api("/api/account/close", { logout: false });
      scheduleState(50);
    } catch (err) {
      LF.toast(errMessage(err), "error");
    }
  });

  $("#usb-retry").addEventListener("click", connectByCableAgain);

  async function connectByCableAgain() {
    try {
      await LF.api("/api/mode", { mode: "usb" });
      scheduleState(50);
    } catch (err) {
      $("#usb-screen-error").textContent = errMessage(err);
    }
  }

  /* =============================================================== 2fa */

  const codeBoxes = $$(".code-box", $("#code-boxes"));
  const twofaError = $("#twofa-error");
  let twofaBusy = false;

  function codeValue() {
    return codeBoxes.map((b) => b.value.replace(/\D/g, "")).join("");
  }

  function resetCodeBoxes() {
    for (const b of codeBoxes) b.value = "";
    twofaError.textContent = "";
    twofaBusy = false;
  }

  function fillCode(digits) {
    for (let i = 0; i < codeBoxes.length; i++) codeBoxes[i].value = digits[i] || "";
    const next = Math.min(digits.length, codeBoxes.length - 1);
    codeBoxes[next].focus();
    maybeSubmitCode();
  }

  async function maybeSubmitCode() {
    const code = codeValue();
    if (code.length !== 6 || twofaBusy) return;
    twofaBusy = true;
    try {
      await LF.api("/api/login/code", { code });
      scheduleState(50);
    } catch (err) {
      const boxes = $("#code-boxes");
      boxes.classList.remove("shake");
      void boxes.offsetWidth;
      boxes.classList.add("shake");
      twofaError.textContent = errMessage(err);
      resetCodeBoxes();
      codeBoxes[0].focus();
    }
  }

  codeBoxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      twofaError.textContent = "";
      let v = box.value.replace(/\D/g, "");
      if (v.length > 1) {
        fillCode(v.slice(0, 6));
        return;
      }
      box.value = v;
      if (v && i < codeBoxes.length - 1) codeBoxes[i + 1].focus();
      maybeSubmitCode();
    });
    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && i > 0) {
        codeBoxes[i - 1].focus();
        codeBoxes[i - 1].value = "";
        e.preventDefault();
      } else if (e.key === "ArrowLeft" && i > 0) {
        codeBoxes[i - 1].focus();
        e.preventDefault();
      } else if (e.key === "ArrowRight" && i < codeBoxes.length - 1) {
        codeBoxes[i + 1].focus();
        e.preventDefault();
      } else if (e.key === "Enter") {
        maybeSubmitCode();
      }
    });
    box.addEventListener("paste", (e) => {
      const text = (e.clipboardData || window.clipboardData).getData("text") || "";
      const digits = text.replace(/\D/g, "").slice(0, 6);
      if (!digits) return;
      e.preventDefault();
      fillCode(digits);
    });
  });

  $("#twofa-resend").addEventListener("click", async () => {
    try {
      await LF.api("/api/login/resend", {});
      LF.toast(LF.t("toast.codeSent"));
    } catch (err) {
      twofaError.textContent = errMessage(err);
    }
  });

  $("#twofa-cancel").addEventListener("click", async () => {
    try {
      await LF.api("/api/login/cancel", {});
    } catch (e) {
      /* ignore */
    }
  });

  /* =============================================================== usb screen */

  let usbRetryTimer = null;
  let usbRetryBusy = false;

  function clearUsbRetry() {
    if (usbRetryTimer) {
      clearInterval(usbRetryTimer);
      usbRetryTimer = null;
    }
  }

  function osHelp() {
    const ua = (navigator.userAgent || "").toLowerCase();
    if (ua.includes("windows")) return LF.t("usb.help.windows");
    if (ua.includes("mac os") || ua.includes("macintosh")) return LF.t("usb.help.mac");
    if (ua.includes("linux")) return LF.t("usb.help.linux");
    return LF.t("usb.help.other");
  }

  function renderUsbScreen(state) {
    const usb = state.usb || {};
    const stage = usb.stage || "searching";
    const stageText = $("#usb-stage-text");
    const detail = $("#usb-detail");
    const errEl = $("#usb-screen-error");
    const progressWrap = $("#usb-progress");
    const bar = $("#usb-progress-bar");
    const retryBtn = $("#usb-retry");
    errEl.textContent = "";
    retryBtn.hidden = true;
    progressWrap.hidden = true;
    detail.textContent = "";

    if (usb.device && (stage === "copying" || stage === "classifying" || stage === "done")) {
      detail.textContent = LF.t("usb.device", { name: usb.device.name || usb.device.model || "" });
    }

    if (stage === "searching") {
      stageText.textContent = LF.t("usb.searching");
    } else if (stage === "copying") {
      stageText.textContent = LF.t("usb.copying");
      progressWrap.hidden = false;
      const pct = usb.total ? Math.min(100, Math.round((100 * (usb.done || 0)) / usb.total)) : 0;
      bar.style.width = pct + "%";
      detail.textContent = [detail.textContent, LF.t("usb.progress", { done: LF.fmtNum(usb.done || 0), total: LF.fmtNum(usb.total || 0) })]
        .filter(Boolean)
        .join(" · ");
    } else if (stage === "classifying") {
      stageText.textContent = LF.t("usb.classifying");
    } else if (stage === "done") {
      stageText.textContent = LF.t("usb.done");
    } else if (stage === "error") {
      const code = usb.code || "usb.other";
      stageText.textContent = LF.t("usb.title");
      errEl.textContent = errText(code);
      retryBtn.hidden = false;
      if (code === "usb.noDriver") detail.textContent = osHelp();
      if (code === "usb.trust" && !usbRetryTimer) {
        usbRetryTimer = setInterval(async () => {
          if (usbRetryBusy) return;
          usbRetryBusy = true;
          try {
            await LF.api("/api/mode", { mode: "usb" });
          } catch (e) {
            /* keep waiting for the user to tap Trust */
          } finally {
            usbRetryBusy = false;
          }
        }, 3000);
      }
    }
    if (stage !== "error") clearUsbRetry();
    else if ((usb.code || "") !== "usb.trust") clearUsbRetry();
  }

  /* =============================================================== loading screen */

  function renderLoadingScreen(state) {
    const p = state.progress || {};
    const stage = p.stage || "reading";
    const done = LF.fmtNum(p.done || 0);
    const total = LF.fmtNum(p.total || 0);
    let text;
    if (stage === "updating") text = LF.t("loading.updating", { done, total });
    else if (stage === "classifying") text = LF.t("loading.classifying", { done, total });
    else text = LF.t("loading.reading", { done, total });
    $("#loading-text").textContent = text;
    const pct = p.total ? Math.min(100, Math.round((100 * (p.done || 0)) / p.total)) : 0;
    $("#loading-bar").style.width = pct + "%";
    let hint = LF.t("loading.hint");
    if (state.thumbs && state.thumbs[1]) {
      hint = LF.t("loading.thumbs", { done: LF.fmtNum(state.thumbs[0]), total: LF.fmtNum(state.thumbs[1]) });
    }
    $("#loading-hint").textContent = hint;
  }

  /* =============================================================== state loop */

  let stateTimer = null;
  let stateFailures = 0;
  let loadedVersion = null;
  let settingsLangLoaded = false;
  let itemsLoading = false;
  let lastPhase = "";

  function scheduleState(ms) {
    clearTimeout(stateTimer);
    stateTimer = setTimeout(pollState, ms);
  }

  async function pollState() {
    if (fatalShown) return;
    let state;
    try {
      state = await LF.api("/api/state");
    } catch (e) {
      if (e.http === 403 && !e.code) {
        fatalSession();
        return;
      }
      stateFailures += 1;
      if (stateFailures === 3) LF.toast(LF.t("toast.connectionLost"), "error");
      scheduleState(2000);
      return;
    }
    stateFailures = 0;
    try {
      await handleState(state);
    } catch (e) {
      console.error(e);
    }
    scheduleState(state.phase === "ready" ? 3000 : 1500);
  }

  async function handleState(state) {
    LF.st = state || {};
    const phase = LF.st.phase || "start";
    const phaseChanged = phase !== lastPhase;
    applyLanguageFromSettingsOnce();
    LF.emit("state", LF.st);
    updateAccountButton();
    updateJobsIndicator();
    renderBanners();

    if (phase !== "usb") clearUsbRetry();

    if (phase === "ready") {
      hideScreens();
      appEl.hidden = false;
      if (loadedVersion !== LF.st.version) await loadItems();
      if (!LF.scope.title) LF.scope.title = LF.t("scope.all");
      if (!gridScroller && !currentView) renderAll(false);
      updateHeader();
      if (LF.st.jobsActive) pollJobs();
      lastPhase = phase;
      return;
    }

    // Leaving the main window: close anything that floats over it.
    if (previewIndex >= 0) closePreview();
    closeAccountMenu();
    actionbarEl.hidden = true;
    appEl.hidden = true;
    screensEl.hidden = false;
    showScreen(phase);

    if (phaseChanged) {
      if (phase === "2fa") {
        resetCodeBoxes();
      } else if (phase === "terms") {
        const check = $("#terms-check");
        check.checked = false;
        $("#terms-continue").disabled = true;
      } else if (phase === "usb") {
        $("#usb-screen-error").textContent = "";
      }
    }

    if (phase === "start") {
      setStartMode(startMode || "icloud");
      const saved = LF.st.savedAccount || "";
      if (saved && !appleIdInput.value) appleIdInput.value = saved;
      const err = LF.st.error;
      const msg = err ? errText(err.code, err.detail) : "";
      if (startMode === "usb") {
        usbError.textContent = msg;
        loginError.textContent = "";
      } else {
        loginError.textContent = msg;
        usbError.textContent = "";
      }
    } else if (phase === "2fa") {
      const method = LF.st.twoFactorMethod || "trusted_device";
      $("#twofa-title").textContent = LF.t("twofa.title");
      $("#twofa-text").textContent = method === "sms" ? LF.t("twofa.sms") : LF.t("twofa.trusted");
      if (document.activeElement !== codeBoxes[0] && !codeValue()) codeBoxes[0].focus();
      const err = LF.st.error;
      if (err && err.code) twofaError.textContent = errText(err.code, err.detail);
    } else if (phase === "terms") {
      const urls = LF.st.termsUrl || {};
      $("#terms-link").href = urls[LF.lang] || urls.en || "#";
    } else if (phase === "usb") {
      renderUsbScreen(LF.st);
    } else if (phase === "loading") {
      renderLoadingScreen(LF.st);
    } else if (phase === "connecting") {
      /* static text is already set */
    }
    lastPhase = phase;
  }

  async function applyLanguageFromSettingsOnce() {
    if (settingsLangLoaded) return;
    settingsLangLoaded = true;
    try {
      const s = await LF.api("/api/settings");
      let lang = s.lang;
      if (!lang || lang === "auto") lang = initialLang;
      if (lang === "es" || lang === "en") {
        if (LF.lang !== lang) {
          LF.lang = lang;
          document.documentElement.lang = lang;
          setupStartStatic();
          LF.emit("lang", lang);
        }
      }
    } catch (e) {
      // settings may not be ready yet; retry on the next state poll
      settingsLangLoaded = false;
    }
  }

  function updateAccountButton() {
    const name = (LF.st.account || LF.st.savedAccount || "").trim();
    accountInitial.textContent = name ? name[0] : "L";
  }

  /* =============================================================== items */

  async function loadItems() {
    if (itemsLoading) return;
    itemsLoading = true;
    const keepTop = gridScroller ? gridScroller.scrollTop : 0;
    try {
      const data = await LF.api("/api/items");
      loadedVersion = data.version != null ? data.version : LF.st.version;
      LF.items = Array.isArray(data.items) ? data.items : [];
      LF.meta = Object.assign({ people: [], places: [], cameras: [], moments: [], source: "", permanent: false }, data.meta || {});
      LF.byId = new Map(LF.items.map((it) => [it.id, it]));
      for (const id of Array.from(LF.sel)) {
        if (!LF.byId.has(id)) LF.sel.delete(id);
      }
      if (!LF.scope.title) LF.scope.title = LF.t("scope.all");
      LF.emit("items", LF.items);
      LF.emit("selection");
      renderBanners();
      if (!currentView) {
        const hadScroller = !!gridScroller;
        buildGrid();
        renderGrid(false);
        if (hadScroller && gridScroller) gridScroller.scrollTop = keepTop;
      }
      renderActionBar();
    } catch (e) {
      if (e.http === 403 && !e.code) fatalSession();
      else LF.toast(errMessage(e), "error");
    } finally {
      itemsLoading = false;
    }
  }

  /* =============================================================== banners */

  let dismissedError = "";

  function bannerRow(kind, iconName, text, buttons, closable) {
    const b = el("div", "banner " + kind);
    b.appendChild(iconNode(iconName));
    b.appendChild(el("div", "banner-text", text));
    for (const btn of buttons || []) {
      const x = el("button", "btn" + (btn.kind === "primary" ? " primary" : ""), btn.label);
      x.type = "button";
      x.addEventListener("click", async () => {
        try {
          await btn.run();
        } catch (e) {
          LF.toast(errMessage(e), "error");
        }
      });
      b.appendChild(x);
    }
    if (closable) {
      const close = el("button", "btn icon plain banner-close");
      close.type = "button";
      close.setAttribute("aria-label", LF.t("banner.dismiss"));
      close.innerHTML = LF.icon("close");
      close.addEventListener("click", () => {
        dismissedError = closable;
        b.remove();
      });
      b.appendChild(close);
    }
    return b;
  }

  function renderBanners() {
    if (!bannerEl) return;
    const st = LF.st || {};
    bannerEl.innerHTML = "";

    if (st.notInCloud && st.notInCloud.n > 0) {
      bannerEl.appendChild(
        bannerRow(
          "warn-banner",
          "cloud",
          LF.t("banner.notInCloud", { n: LF.fmtNum(st.notInCloud.n), size: LF.fmtBytes(st.notInCloud.bytes) }),
          [{ label: LF.t("banner.useCable"), run: switchToCable }]
        )
      );
    }

    const imp = st.import;
    if (st.mode === "icloud" && st.classification == null) {
      if (imp && imp.stage && imp.stage !== "done" && imp.stage !== "error") {
        const text = LF.t("banner.classifyProgress", {
          done: LF.fmtNum(imp.done || 0),
          total: LF.fmtNum(imp.total || 0),
        });
        const row = bannerRow("info", "sparkles", text, []);
        const prog = el("div", "progress");
        prog.style.width = "120px";
        prog.style.flex = "none";
        const bar = el("i");
        const pct = imp.total ? Math.min(100, Math.round((100 * (imp.done || 0)) / imp.total)) : 0;
        bar.style.width = pct + "%";
        prog.appendChild(bar);
        row.appendChild(prog);
        bannerEl.appendChild(row);
      } else {
        bannerEl.appendChild(
          bannerRow("info", "sparkles", LF.t("banner.classifyTitle"), [
            { label: LF.t("banner.classify"), kind: "primary", run: classifyNow },
          ])
        );
      }
    }

    const err = st.error;
    if (err && err.code) {
      const sig = err.code + "|" + (err.detail || "");
      if (dismissedError !== sig) {
        bannerEl.appendChild(
          bannerRow("error", "warning", errText(err.code, err.detail), [], sig)
        );
      }
    }
  }

  async function classifyNow() {
    try {
      await LF.api("/api/classify", {});
      LF.toast(LF.t("toast.classifyStarted"));
      scheduleState(100);
    } catch (e) {
      LF.toast(errMessage(e), "error");
    }
  }

  /* =============================================================== action bar */

  function renderActionBar() {
    if (!actionbarEl) return;
    actionbarEl.innerHTML = "";
    if (LF.sel.size === 0) {
      actionbarEl.hidden = true;
      return;
    }
    const chosen = [];
    for (const id of LF.sel) {
      const it = LF.byId.get(id);
      if (it) chosen.push(it);
    }
    const unsaved = chosen.filter((it) => !it.sv);
    const count = LF.fmtNum(chosen.length);
    const size = LF.fmtBytes(sumBytes(chosen));
    const countNode = el("span", "ab-count", LF.t("action.count", { n: count, size }));
    actionbarEl.appendChild(countNode);

    if (LF.scope.actions) {
      for (const act of LF.scope.actions) {
        const b = el("button", "btn plain", act.label);
        b.type = "button";
        b.addEventListener("click", () => {
          try {
            act.run();
          } catch (e) {
            console.error(e);
          }
        });
        actionbarEl.appendChild(b);
      }
    }

    const save = el("button", "btn" + (unsaved.length ? " primary" : ""));
    save.type = "button";
    save.textContent = unsaved.length ? LF.t("action.saveN", { n: LF.fmtNum(unsaved.length) }) : LF.t("action.save");
    save.disabled = unsaved.length === 0;
    save.addEventListener("click", saveSelection);
    actionbarEl.appendChild(save);

    const del = el("button", "btn danger", LF.t("action.delete"));
    del.type = "button";
    del.addEventListener("click", startDelete);
    actionbarEl.appendChild(del);

    const all = el("button", "btn plain", LF.t("action.selectAll"));
    all.type = "button";
    all.addEventListener("click", () => {
      LF.select(visible.map((it) => it.id), true);
      LF.emit("selection");
    });
    actionbarEl.appendChild(all);

    const none = el("button", "btn plain", LF.t("action.deselect"));
    none.type = "button";
    none.addEventListener("click", () => LF.clearSelection());
    actionbarEl.appendChild(none);

    actionbarEl.hidden = false;
  }

  async function saveSelection() {
    const ids = [];
    for (const id of LF.sel) {
      const it = LF.byId.get(id);
      if (it && !it.sv) ids.push(id);
    }
    if (!ids.length) return;
    try {
      await LF.api("/api/save", { ids });
      LF.toast(LF.t("toast.saveStarted"));
      pollJobs();
    } catch (e) {
      LF.toast(errMessage(e), "error");
    }
  }

  /* =============================================================== delete flow */

  async function startDelete() {
    const ids = Array.from(LF.sel);
    if (!ids.length) return;
    let prep;
    try {
      prep = await LF.api("/api/delete/prepare", { ids });
    } catch (e) {
      LF.toast(errMessage(e), "error");
      return;
    }
    const permanent = !!prep.permanent;
    const title = permanent
      ? LF.t("delete.title.permanent", { n: LF.fmtNum(prep.n) })
      : LF.t("delete.title.icloud", { n: LF.fmtNum(prep.n) });

    const body = el("div", "delete-body");
    body.appendChild(el("p", null, LF.t("delete.size", { n: LF.fmtNum(prep.n), size: LF.fmtBytes(prep.bytes) })));
    if (prep.videos > 0) body.appendChild(el("p", null, LF.t("delete.videos", { n: LF.fmtNum(prep.videos) })));
    if (prep.unsaved > 0) body.appendChild(el("p", "warn", LF.t("delete.unsaved", { n: LF.fmtNum(prep.unsaved) })));
    body.appendChild(el("p", "muted", permanent ? LF.t("delete.explain.permanent") : LF.t("delete.explain.icloud")));

    const waitMs = Math.max(0, Number(prep.wait || 0) * 1000);
    const deadline = Date.now() + waitMs;
    let ticker = null;

    const sheet = LF.openSheet({
      title,
      body,
      buttons: [
        { label: LF.t("delete.cancel"), kind: "plain" },
        {
          label: LF.t("delete.continueWait", { s: Math.ceil(waitMs / 1000) }),
          kind: permanent ? "danger" : "primary",
          disabled: waitMs > 0,
          run: (handle) => {
            handle.close();
            return false;
          },
        },
      ],
      onClose: () => {
        if (ticker) clearInterval(ticker);
      },
    });

    if (permanent) sheet.el.classList.add("danger-sheet");
    const goBtn = sheet.footer.querySelectorAll("button")[1];
    function tick() {
      const left = Math.ceil((deadline - Date.now()) / 1000);
      if (left > 0) {
        goBtn.disabled = true;
        goBtn.textContent = LF.t("delete.continueWait", { s: left });
      } else {
        goBtn.disabled = false;
        goBtn.textContent = LF.t("delete.continue");
        if (ticker) {
          clearInterval(ticker);
          ticker = null;
        }
      }
    }
    if (waitMs > 0) {
      tick();
      ticker = setInterval(tick, 250);
    } else {
      goBtn.disabled = false;
      goBtn.textContent = LF.t("delete.continue");
    }

    goBtn.addEventListener("click", () => {
      if (goBtn.disabled) return;
      openFinalDeleteSheet(prep, permanent);
    });
  }

  function openFinalDeleteSheet(prep, permanent) {
    const body = el("p", null, permanent ? LF.t("delete.finalText.permanent") : LF.t("delete.finalText.icloud"));
    LF.openSheet({
      title: LF.t("delete.finalTitle"),
      body,
      buttons: [
        { label: LF.t("delete.cancel"), kind: "plain" },
        {
          label: permanent ? LF.t("delete.permanently") : LF.t("delete.move"),
          kind: "danger",
          run: async () => {
            await confirmDelete(prep.ticket);
          },
        },
      ],
    });
  }

  async function confirmDelete(ticket) {
    try {
      await LF.api("/api/delete/confirm", { ticket });
    } catch (e) {
      if (e.code === "delete.wait") {
        await sleep(1600);
        try {
          await LF.api("/api/delete/confirm", { ticket });
        } catch (e2) {
          LF.toast(errMessage(e2), "error");
          return;
        }
      } else {
        LF.toast(errMessage(e), "error");
        return;
      }
    }
    LF.toast(LF.t("toast.deleteStarted"));
    pollJobs();
  }

  /* =============================================================== grid */

  function buildGrid() {
    if (!viewEl) return;
    viewEl.innerHTML = "";
    gridPool = new Map();
    gridScroller = el("div", "grid-scroller");
    gridScroller.id = "grid-scroller";
    gridSpace = el("div");
    gridSpace.id = "grid-space";
    gridScroller.appendChild(gridSpace);
    viewEl.appendChild(gridScroller);
    emptyEl = el("div", "empty-state");
    emptyEl.appendChild(iconNode("photos"));
    emptyEl.appendChild(el("h3", null, LF.t("empty.title")));
    emptyEl.appendChild(el("p", null, LF.t("empty.text")));
    emptyEl.hidden = true;
    viewEl.appendChild(emptyEl);
    gridScroller.addEventListener("scroll", () => requestAnimationFrame(drawGrid), { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      if (gridRO) gridRO.disconnect();
      gridRO = new ResizeObserver(() => layoutGrid());
      gridRO.observe(gridScroller);
    }
    layoutGrid();
  }

  function layoutGrid() {
    if (!gridScroller || currentView) return;
    tilePx = Number(zoomInput.value) || 150;
    const w = gridScroller.clientWidth - PAD * 2;
    colCount = Math.max(1, Math.floor((w + GAP) / (tilePx + GAP)));
    rowH = tilePx + GAP;
    const rows = Math.ceil(visible.length / colCount);
    gridSpace.style.height = Math.max(gridScroller.clientHeight, rows * rowH + PAD * 2) + "px";
    emptyEl.hidden = visible.length > 0;
    for (const node of gridPool.values()) node.remove();
    gridPool.clear();
    drawGrid();
  }

  function drawGrid() {
    if (!gridScroller || currentView) return;
    const top = gridScroller.scrollTop;
    const h = gridScroller.clientHeight;
    const r0 = Math.max(0, Math.floor((top - PAD) / rowH) - 2);
    const r1 = Math.ceil((top + h - PAD) / rowH) + 2;
    const i0 = r0 * colCount;
    const i1 = Math.min(visible.length, r1 * colCount);
    for (const [i, node] of gridPool) {
      if (i < i0 || i >= i1) {
        node.remove();
        gridPool.delete(i);
      }
    }
    for (let i = i0; i < i1; i++) {
      let node = gridPool.get(i);
      if (node) {
        paintTile(node, i);
        continue;
      }
      node = makeTile(i);
      gridPool.set(i, node);
      gridSpace.appendChild(node);
    }
  }

  function makeTile(i) {
    const it = visible[i];
    const node = el("div", "tile");
    node.dataset.i = String(i);
    node.style.left = PAD + (i % colCount) * (tilePx + GAP) + "px";
    node.style.top = PAD + Math.floor(i / colCount) * rowH + "px";
    node.style.width = tilePx + "px";
    node.style.height = tilePx + "px";
    const img = el("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.draggable = false;
    img.alt = it.n || "";
    img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
    img.src = LF.thumbUrl(it.id);
    node.appendChild(img);
    node.appendChild(el("span", "tile-size", LF.fmtBytes(it.s)));
    if (it.k === "video") {
      node.appendChild(el("span", "tile-dur", it.dur ? "▶ " + LF.fmtDur(it.dur) : "▶"));
    }
    const flags = el("span", "tile-flags");
    if (Array.isArray(it.c) && it.c.includes("favorite")) {
      const h = el("span", "tile-heart");
      h.innerHTML = LF.icon("heart");
      flags.appendChild(h);
    }
    if (it.sv) {
      const s = el("span", "tile-saved");
      s.innerHTML = LF.icon("saved");
      flags.appendChild(s);
    }
    if (it.best) {
      const b = el("span", "tile-best");
      b.innerHTML = LF.icon("star");
      flags.appendChild(b);
    }
    if (flags.childNodes.length) node.appendChild(flags);
    node.appendChild(el("span", "check"));
    paintTile(node, i);
    return node;
  }

  function paintTile(node, i) {
    const it = visible[i];
    if (!it) return;
    node.dataset.i = String(i);
    node.style.left = PAD + (i % colCount) * (tilePx + GAP) + "px";
    node.style.top = PAD + Math.floor(i / colCount) * rowH + "px";
    node.style.width = tilePx + "px";
    node.style.height = tilePx + "px";
    node.classList.toggle("selected", LF.sel.has(it.id));
  }

  function renderGrid(resetScroll) {
    if (currentView) return;
    if (!gridScroller) buildGrid();
    if (!gridScroller) return;
    if (resetScroll) gridScroller.scrollTop = 0;
    layoutGrid();
  }

  function repaintGrid() {
    for (const [i, node] of gridPool) paintTile(node, i);
    renderActionBar();
    if (previewIndex >= 0) updatePreviewChrome();
  }

  zoomInput.addEventListener("input", () => {
    layoutGrid();
  });

  /* =============================================================== selection + drag */

  let anchorIndex = -1;
  let drag = null;
  let hoverIndex = -1;
  let autoScrollRAF = 0;
  let autoScrollDir = 0;

  function tileIndexFromEvent(e) {
    const node = e.target && e.target.closest ? e.target.closest(".tile") : null;
    return node ? Number(node.dataset.i) : -1;
  }

  function selectRange(from, to, mode) {
    if (from < 0) return;
    const a = Math.min(from, to);
    const b = Math.max(from, to);
    for (let k = a; k <= b; k++) {
      const it = visible[k];
      if (!it) continue;
      if (mode) LF.sel.add(it.id);
      else LF.sel.delete(it.id);
    }
    LF.emit("selection");
  }

  if (viewEl) {
    viewEl.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || currentView) return;
      const i = tileIndexFromEvent(e);
      if (i < 0) return;
      e.preventDefault();
      const it = visible[i];
      if (!it) return;
      if (e.shiftKey && anchorIndex >= 0) {
        const mode = LF.sel.has(visible[anchorIndex].id);
        selectRange(anchorIndex, i, mode);
        return;
      }
      const mode = !LF.sel.has(it.id);
      anchorIndex = i;
      drag = { mode, last: i };
      if (mode) LF.sel.add(it.id);
      else LF.sel.delete(it.id);
      LF.emit("selection");
      startAutoScrollLoop();
    });

    viewEl.addEventListener("mouseover", (e) => {
      const i = tileIndexFromEvent(e);
      hoverIndex = i;
      if (!drag || i < 0 || i === drag.last) return;
      const mode = drag.mode;
      const a = Math.min(drag.last, i);
      const b = Math.max(drag.last, i);
      for (let k = a; k <= b; k++) {
        const it = visible[k];
        if (!it) continue;
        if (mode) LF.sel.add(it.id);
        else LF.sel.delete(it.id);
      }
      drag.last = i;
      LF.emit("selection");
    });

    viewEl.addEventListener("dblclick", (e) => {
      const i = tileIndexFromEvent(e);
      if (i >= 0) openPreview(i);
    });
  }

  window.addEventListener("mouseup", () => {
    drag = null;
    stopAutoScrollLoop();
  });

  window.addEventListener("mousemove", (e) => {
    if (!drag || !gridScroller) {
      autoScrollDir = 0;
      return;
    }
    const r = gridScroller.getBoundingClientRect();
    if (e.clientY > r.bottom - 48) autoScrollDir = 1;
    else if (e.clientY < r.top + 48) autoScrollDir = -1;
    else autoScrollDir = 0;
  });

  function startAutoScrollLoop() {
    if (autoScrollRAF) return;
    const step = () => {
      if (!drag || !gridScroller || !autoScrollDir) {
        autoScrollRAF = 0;
        return;
      }
      gridScroller.scrollTop += autoScrollDir * 16;
      autoScrollRAF = requestAnimationFrame(step);
    };
    autoScrollRAF = requestAnimationFrame(step);
  }

  function stopAutoScrollLoop() {
    autoScrollDir = 0;
    if (autoScrollRAF) {
      cancelAnimationFrame(autoScrollRAF);
      autoScrollRAF = 0;
    }
  }

  LF.on("selection", repaintGrid);

  /* =============================================================== preview */

  let previewIndex = -1;

  function previewItem() {
    return previewIndex >= 0 ? visible[previewIndex] : null;
  }

  function openPreview(i) {
    if (i < 0 || i >= visible.length) return;
    previewIndex = i;
    previewEl.hidden = false;
    const it = visible[i];

    const img = $("#pv-img");
    const vid = $("#pv-vid");
    const frame = $("#pv-frame");

    vid.pause();
    vid.removeAttribute("src");
    vid.load();
    img.onload = null;
    img.removeAttribute("src");
    img.alt = it.n || "";

    if (it.k === "video") {
      img.hidden = true;
      vid.hidden = false;
      vid.poster = LF.thumbUrl(it.id);
      vid.src = LF.videoUrl(it.id);
      vid.play().catch(() => {});
    } else {
      vid.hidden = true;
      img.hidden = false;
      img.src = LF.thumbUrl(it.id);
      const big = new Image();
      big.onload = () => {
        if (previewIndex === i && !previewEl.hidden) img.src = LF.previewUrl(it.id);
      };
      big.src = LF.previewUrl(it.id);
    }

    // preload neighbours
    for (const j of [i + 1, i - 1]) {
      const nb = visible[j];
      if (nb && nb.k !== "video") {
        const pre = new Image();
        pre.src = LF.previewUrl(nb.id);
      }
    }

    updatePreviewChrome();
    frame.classList.remove("pop");
    void frame.offsetWidth;
    frame.classList.add("pop");
  }

  function updatePreviewChrome() {
    const it = previewItem();
    if (!it) return;
    const on = LF.sel.has(it.id);
    const frame = $("#pv-frame");
    frame.classList.toggle("on", on);
    const toggle = $("#pv-toggle");
    toggle.classList.toggle("on", on);
    toggle.textContent = on ? LF.t("pv.selected") : LF.t("pv.select");

    $("#pv-pos").textContent = LF.t("pv.position", {
      i: LF.fmtNum(previewIndex + 1),
      n: LF.fmtNum(visible.length),
    });
    const chosen = Array.from(LF.sel)
      .map((id) => LF.byId.get(id))
      .filter(Boolean);
    $("#pv-total").textContent = chosen.length
      ? LF.t("pv.total", { n: LF.fmtNum(chosen.length), size: LF.fmtBytes(sumBytes(chosen)) })
      : LF.t("pv.none");

    const meta = $("#pv-meta");
    meta.innerHTML = "";
    const people = Array.isArray(it.p)
      ? it.p
          .map((pid) => (LF.meta.people || []).find((p) => p.id === pid))
          .filter(Boolean)
          .map((p) => p.name || "")
          .filter(Boolean)
      : [];
    const place = (LF.meta.places || [])[it.pl];
    const camera = (LF.meta.cameras || [])[it.cam];
    const parts = [it.n, LF.fmtBytes(it.s), LF.fmtDate(it.d)];
    if (it.dur) parts.push(LF.fmtDur(it.dur));
    if (people.length) parts.push(people.join(", "));
    if (place) parts.push([place[2], place[0]].filter(Boolean).join(", "));
    if (camera) parts.push(camera);
    const first = el("div", null, parts.join(" · "));
    meta.appendChild(first);
    const saved = el("div");
    saved.innerHTML = it.sv ? "<b>" + LF.t("pv.metaSaved") + "</b>" : "";
    if (it.sv) meta.appendChild(saved);
    if (it.k === "video") {
      const q = el("div", "muted", LF.t("pv.videoQuality"));
      meta.appendChild(q);
    }
    const hints = el("div", "muted", LF.t("pv.hints"));
    meta.appendChild(hints);

    $("#pv-prev").disabled = previewIndex <= 0;
    $("#pv-next").disabled = previewIndex >= visible.length - 1;
  }

  function validatePreview() {
    if (previewIndex < 0) return;
    if (!visible.length) {
      closePreview();
      return;
    }
    if (previewIndex >= visible.length) previewIndex = visible.length - 1;
    updatePreviewChrome();
  }

  function togglePreviewSelection(noReload) {
    const it = previewItem();
    if (!it) return;
    if (LF.sel.has(it.id)) LF.sel.delete(it.id);
    else LF.sel.add(it.id);
    LF.emit("selection");
    updatePreviewChrome();
    const frame = $("#pv-frame");
    if (!noReload) {
      frame.classList.remove("pop");
      void frame.offsetWidth;
      frame.classList.add("pop");
    }
  }

  function closePreview() {
    const vid = $("#pv-vid");
    vid.pause();
    vid.removeAttribute("src");
    vid.load();
    const img = $("#pv-img");
    img.onload = null;
    img.removeAttribute("src");
    previewEl.hidden = true;
    previewIndex = -1;
  }

  function stepPreview(delta) {
    const next = previewIndex + delta;
    if (next >= 0 && next < visible.length) openPreview(next);
  }

  $("#pv-toggle").addEventListener("click", () => togglePreviewSelection());
  $("#pv-close").addEventListener("click", closePreview);
  $("#pv-prev").addEventListener("click", () => stepPreview(-1));
  $("#pv-next").addEventListener("click", () => stepPreview(1));

  $("#pv-img").addEventListener("click", () => togglePreviewSelection());
  $("#pv-vid").addEventListener("click", (e) => {
    // clicking the video itself toggles selection but not the native controls
    if (e.target === e.currentTarget && e.offsetY > e.currentTarget.clientHeight - 40) return;
  });

  previewEl.addEventListener("click", (e) => {
    if (e.target === previewEl) closePreview();
  });

  /* =============================================================== jobs */

  let jobsPolling = false;
  let jobsPopoverOpen = false;
  let jobHide = new Set();

  function updateJobsIndicator() {
    const running = !!(LF.st && LF.st.jobsActive);
    $("#jobs-pulse").hidden = !running;
    jobsBtn.classList.toggle("running", running);
    if (running) pollJobs();
  }

  function applyChanges(changes) {
    let touched = false;
    for (const c of changes || []) {
      if (!c || !c.id) continue;
      const it = LF.byId.get(c.id);
      if (!it) continue;
      if (c.saved) {
        it.sv = true;
        touched = true;
      }
      if (c.deleted) {
        const open = previewItem();
        if (open && open.id === c.id) closePreview();
        LF.sel.delete(c.id);
        LF.byId.delete(c.id);
        LF.items = LF.items.filter((x) => x.id !== c.id);
        touched = true;
      }
    }
    if (touched) {
      LF.emit("items", LF.items);
      LF.emit("selection");
      refreshVisible(false);
    }
  }

  async function pollJobs() {
    if (jobsPolling || fatalShown) return;
    jobsPolling = true;
    try {
      while (true) {
        const data = await LF.api("/api/jobs");
        applyChanges(data.changes || []);
        renderJobs(data.jobs || []);
        const running = (data.jobs || []).some((j) => j.state === "running");
        LF.st.jobsActive = running;
        $("#jobs-pulse").hidden = !running;
        if (!running) break;
        await sleep(1000);
      }
    } catch (e) {
      if (e.http === 403 && !e.code) fatalSession();
      else if (e.code === "network") LF.toast(LF.t("toast.connectionLost"), "error");
    } finally {
      jobsPolling = false;
    }
  }

  function renderJobs(jobs) {
    if (!jobsPopoverOpen) return;
    jobsEl.innerHTML = "";
    const list = (jobs || []).filter((j) => !jobHide.has(j.id));
    if (!list.length) {
      jobsEl.appendChild(el("div", "muted small", LF.t("jobs.none")));
      return;
    }
    for (const j of list) {
      const box = el("div", "job" + (j.state === "finished" ? " done" : ""));
      const head = el("div", "job-head");
      head.appendChild(iconNode(j.type === "delete" ? "trash" : "download"));
      const label = j.state === "finished" ? (j.type === "delete" ? LF.t("jobs.deleted") : LF.t("jobs.saved")) : j.type === "delete" ? LF.t("jobs.delete") : LF.t("jobs.save");
      head.appendChild(el("span", null, label));
      head.appendChild(el("span", "job-state", LF.fmtNum(j.done || 0) + "/" + LF.fmtNum(j.total || 0)));
      box.appendChild(head);
      const prog = el("div", "progress");
      const bar = el("i");
      const pct = j.total ? Math.min(100, Math.round((100 * (j.done || 0)) / j.total)) : 0;
      bar.style.width = pct + "%";
      prog.appendChild(bar);
      box.appendChild(prog);
      const bits = [];
      if (j.bytes) bits.push(LF.fmtBytes(j.bytes));
      if (j.errors) bits.push('<span class="danger-text">' + LF.t("jobs.errors", { n: LF.fmtNum(j.errors) }) + "</span>");
      if (bits.length) {
        const d = el("div", "job-detail");
        d.innerHTML = bits.join(" · ");
        box.appendChild(d);
      }
      if (j.dest) box.appendChild(el("div", "job-detail", LF.t("jobs.dest", { dir: j.dest })));
      if (j.lastError) box.appendChild(el("div", "job-error", j.lastError));
      jobsEl.appendChild(box);
    }
  }

  jobsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    jobsPopoverOpen = !jobsPopoverOpen;
    jobsEl.hidden = !jobsPopoverOpen;
    if (jobsPopoverOpen) {
      jobsEl.innerHTML = '<div class="muted small">…</div>';
      pollJobs();
    }
  });

  document.addEventListener("click", (e) => {
    if (!jobsPopoverOpen) return;
    if (jobsEl.contains(e.target) || jobsBtn.contains(e.target)) return;
    jobsPopoverOpen = false;
    jobsEl.hidden = true;
  });

  /* =============================================================== account menu */

  let accountMenu = null;

  function closeAccountMenu() {
    if (accountMenu) {
      accountMenu.remove();
      accountMenu = null;
    }
  }

  function menuRow(icon, label, run, opts) {
    const row = el("button", "list-row row");
    row.type = "button";
    if (icon) row.appendChild(iconNode(icon));
    row.appendChild(el("span", null, label));
    row.addEventListener("click", async () => {
      closeAccountMenu();
      try {
        await run();
      } catch (e) {
        LF.toast(errMessage(e), "error");
      }
    });
    if (opts && opts.disabled) row.disabled = true;
    return row;
  }

  function modeLabel(mode) {
    if (mode === "usb") return LF.t("mode.usbLong");
    if (mode === "demo") return LF.t("mode.demoLong");
    return LF.t("mode.icloudLong");
  }

  function buildAccountMenu() {
    const st = LF.st || {};
    const menu = el("div", "popover account-menu");
    menu.setAttribute("role", "menu");
    const name = st.account || st.savedAccount || "";
    const head = el("div", "account-head");
    head.appendChild(el("div", "account-name", name || LF.t("menu.noAccount")));
    head.appendChild(el("div", "muted small", modeLabel(st.mode)));
    menu.appendChild(head);

    menu.appendChild(menuRow("gear", LF.t("menu.settings"), () => LF.openSettings()));

    if (st.mode === "icloud") {
      menu.appendChild(menuRow("sparkles", LF.t("menu.classify"), classifyNow));
    }

    menu.appendChild(menuRow("cable", LF.t("menu.switchCable"), switchToCable));

    menu.appendChild(el("div", "menu-sep"));

    const signoutLabel = st.mode === "demo" ? LF.t("menu.leaveDemo") : st.mode === "usb" ? LF.t("menu.disconnect") : LF.t("menu.signout");
    menu.appendChild(menuRow("logout", signoutLabel, () => LF.api("/api/account/close", {})));
    menu.appendChild(menuRow("trash", LF.t("menu.deleteData"), openDeleteDataSheet));

    menu.appendChild(el("div", "menu-sep"));
    menu.appendChild(menuRow("close", LF.t("menu.quit"), quitApp));

    // position under the account button
    document.body.appendChild(menu);
    const r = accountBtn.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.top = r.bottom + 6 + "px";
    menu.style.right = Math.max(8, window.innerWidth - r.right) + "px";
    menu.style.left = "auto";
    return menu;
  }

  accountBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (accountMenu) {
      closeAccountMenu();
      return;
    }
    accountMenu = buildAccountMenu();
  });

  document.addEventListener("click", (e) => {
    if (accountMenu && !accountMenu.contains(e.target) && !accountBtn.contains(e.target)) closeAccountMenu();
  });

  async function switchToCable() {
    try {
      await LF.api("/api/account/close", { logout: false });
    } catch (e) {
      /* keep going: the user asked for cable mode */
    }
    await LF.api("/api/mode", { mode: "usb" });
    scheduleState(100);
  }

  function openDeleteDataSheet() {
    const dir = (LF.st && LF.st.archiveDir) || "";
    const body = el("div");
    body.appendChild(el("p", null, LF.t("data.body")));
    if (dir) body.appendChild(el("p", "muted small", LF.t("data.keep", { dir })));
    LF.openSheet({
      title: LF.t("data.title"),
      body,
      buttons: [
        { label: LF.t("data.cancel"), kind: "plain" },
        {
          label: LF.t("data.delete"),
          kind: "danger",
          run: async () => {
            await LF.api("/api/account/close", { deleteData: true });
            scheduleState(100);
          },
        },
      ],
    });
  }

  async function quitApp() {
    try {
      await LF.api("/api/quit", {});
      shutDownView();
      showFatal(LF.t("quit.byeTitle"), LF.t("quit.byeText"));
    } catch (e) {
      if (e.code === "jobs.running") {
        LF.openSheet({
          title: LF.t("quit.title"),
          body: el("p", null, LF.t("quit.body")),
          buttons: [
            { label: LF.t("quit.cancel"), kind: "plain" },
            {
              label: LF.t("quit.force"),
              kind: "danger",
              run: async () => {
                await LF.api("/api/quit", { force: true });
                shutDownView();
                showFatal(LF.t("quit.byeTitle"), LF.t("quit.byeText"));
              },
            },
          ],
        });
      } else if (e.code === "network") {
        // The server may have closed the connection on its way out.
        shutDownView();
        showFatal(LF.t("quit.byeTitle"), LF.t("quit.byeText"));
      } else {
        LF.toast(errMessage(e), "error");
      }
    }
  }

  function shutDownView() {
    clearTimeout(stateTimer);
    fatalShown = true;
  }

  /* =============================================================== keyboard */

  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented) return;
    const tag = (e.target && e.target.tagName) || "";
    const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable);
    if (openSheets.length || appEl.hidden) return;

    if (!previewEl.hidden) {
      if (e.key === "Escape") {
        e.preventDefault();
        closePreview();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepPreview(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepPreview(-1);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        togglePreviewSelection();
      }
      return;
    }

    if (typing) return;

    if (e.key === " " && hoverIndex >= 0) {
      e.preventDefault();
      openPreview(hoverIndex);
    } else if (e.key === "Escape") {
      if (accountMenu) closeAccountMenu();
      else if (jobsPopoverOpen) {
        jobsPopoverOpen = false;
        jobsEl.hidden = true;
      } else if (LF.sel.size) {
        LF.clearSelection();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      LF.select(visible.map((it) => it.id), true);
      LF.emit("selection");
    }
  });

  /* =============================================================== wiring */

  LF.on("items", () => {
    if (emptyEl) {
      emptyEl.querySelector("h3").textContent = LF.t("empty.title");
      emptyEl.querySelector("p").textContent = LF.t("empty.text");
    }
    if (!currentView) refreshVisible(false);
  });

  LF.on("filters", () => {
    LF.refine.count = Number(LF.refine.count) || 0;
    if (previewIndex >= 0) closePreview();
    refreshVisible(false);
    updateHeader();
  });

  LF.on("scope", () => {
    if (!currentView) refreshVisible(false);
  });

  async function refreshLanguageFromServer() {
    try {
      const s = await LF.api("/api/settings");
      let lang = s.lang;
      if (!lang || lang === "auto") lang = initialLang;
      if ((lang === "es" || lang === "en") && lang !== LF.lang) {
        LF.lang = lang;
        document.documentElement.lang = lang;
        LF.emit("lang", lang);
      }
    } catch (e) {
      /* keep the current language */
    }
  }

  LF.on("lang", (lang) => {
    // views.js emits "lang" after saving the setting without setting LF.lang.
    if (lang !== "es" && lang !== "en") refreshLanguageFromServer();
    setupStartStatic();
    document.documentElement.lang = LF.lang;
    const phase = LF.st && LF.st.phase;
    if (phase === "start") {
      loginError.textContent = "";
      usbError.textContent = "";
      setStartMode(startMode);
    } else if (phase === "usb") {
      renderUsbScreen(LF.st);
    } else if (phase === "loading") {
      renderLoadingScreen(LF.st);
    }
    if (LF.st && LF.st.phase === "ready") {
      renderBanners();
      updateHeader();
      renderActionBar();
      if (!currentView) {
        if (emptyEl) {
          emptyEl.querySelector("h3").textContent = LF.t("empty.title");
          emptyEl.querySelector("p").textContent = LF.t("empty.text");
        }
        renderGrid(false);
      }
    }
  });

  /* =============================================================== boot */

  function boot() {
    document.documentElement.lang = LF.lang;
    setupStartStatic();
    setStartMode("icloud");
    if (!TOKEN) {
      fatalSession();
      return;
    }
    const initialScope = { key: "all", title: LF.t("scope.all"), titleKey: "scope.all", filter: () => true, sort: "size" };
    LF.scope = Object.assign({}, LF.scope, initialScope);
    updateHeader();
    LF.emit("scope", LF.scope);
    showScreen("start");
    pollState();
  }

  boot();
})();
