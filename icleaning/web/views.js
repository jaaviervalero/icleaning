/* iCleaning — secondary views: cleanup suggestions, people, places, map, report and the
   settings sheet. Plain vanilla JS, no dependencies, no inline handlers, CSP friendly.
   Public surface: LF.registerView(name, {title, mount, unmount}) and LF.openSettings. */
(function () {
  "use strict";

  var LF = window.LF;
  if (!LF) return;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var MB = 1024 * 1024;
  var BASE_VIEW = { x: 0, y: 0, w: 1000, h: 500 };

  // ---------------------------------------------------------------- strings
  LF.addStrings({
    es: {
      "err.network": "No hay conexión con iCleaning.",

      "view.suggestions": "Sugerencias de limpieza",
      "view.people": "Personas y mascotas",
      "view.places": "Lugares",
      "view.map": "Mapa",
      "view.report": "Informe",

      "v.review": "Revisar",
      "v.expand": "Desplegar",
      "v.collapse": "Contraer",
      "v.nsize": "{n} · {size}",
      "v.items": "{n} elementos",
      "v.photos": "{n} fotos",
      "v.size": "{size}",

      "sug.headline": "Puedes liberar hasta {size}",
      "sug.sub": "Elige una categoría, mira lo que hay dentro y guárdalo o bórralo de una vez.",
      "sug.large_videos.title": "Vídeos grandes",
      "sug.large_videos.desc": "Vídeos de más de un minuto o más de 200 MB.",
      "sug.screenshots.title": "Capturas de pantalla",
      "sug.screenshots.desc": "Capturas que seguramente ya no necesitas.",
      "sug.screen_recordings.title": "Grabaciones de pantalla",
      "sug.screen_recordings.desc": "Grabaciones guardadas por el grabador de pantalla.",
      "sug.whatsapp.title": "WhatsApp",
      "sug.whatsapp.desc": "Fotos y vídeos recibidos por WhatsApp.",
      "sug.social.title": "Redes sociales",
      "sug.social.desc": "Descargas de Instagram, TikTok y parecidas.",
      "sug.burst.title": "Ráfagas sin elegir",
      "sug.burst.desc": "Fotos descartadas por la cámara en una ráfaga.",
      "sug.duplicates.title": "Duplicados",
      "sug.duplicates.desc": "La misma foto guardada dos veces.",
      "sug.similar.title": "Fotos parecidas",
      "sug.similar.desc": "Tomas casi idénticas de la misma serie.",
      "sug.poor.title": "Probablemente fallidas",
      "sug.poor.desc": "Fotos borrosas, oscuras o estropeadas.",
      "sug.saved.title": "Ya guardadas en el PC",
      "sug.saved.desc": "Copias que ya tienes en tu carpeta.",
      "sug.bulk.title": "Truco",
      "sug.bulk.text": "Abre una tarjeta, pulsa ⌘A / Ctrl+A para seleccionarlo todo y usa Guardar en el PC o Borrar. Empieza por lo más grande.",
      "sug.empty.title": "Nada que limpiar",
      "sug.empty.text": "No hay archivos grandes ni duplicados en esta biblioteca.",

      "people.sub": "{n} personas y mascotas",
      "people.unnamed": "Sin nombre",
      "people.photos": "{n} fotos",
      "people.empty.title": "Todavía no hay personas",
      "people.empty.text": "Conecta el iPhone por cable una vez para ordenar por personas y mascotas.",

      "places.sub": "{n} lugares",
      "places.unknown": "Lugar desconocido",
      "places.empty.title": "Todavía no hay lugares",
      "places.empty.text": "Los lugares salen de la ubicación guardada en tus fotos.",

      "map.sub": "{n} elementos con ubicación",
      "map.note": "Mapa sin conexión: tus ubicaciones no salen de este ordenador.",
      "map.zoomIn": "Acercar",
      "map.zoomOut": "Alejar",
      "map.reset": "Restablecer vista",
      "map.near": "Cerca de {place}",
      "map.somewhere": "esta zona",
      "map.empty.title": "No hay ubicaciones en el mapa",
      "map.empty.text": "Ninguna foto de esta biblioteca tiene datos de ubicación.",
      "map.error": "No se pudo cargar el mapa.",

      "report.sub": "{n} elementos · {size}",
      "report.total": "Tamaño total",
      "report.totalSub": "{n} elementos",
      "report.videos": "Vídeos",
      "report.screenshots": "Capturas",
      "report.saved": "Guardadas en el PC",
      "report.byYear": "Por año",
      "report.byCategory": "Por categoría",
      "report.bySource": "Por app de origen",
      "report.photos": "Fotos",
      "report.otherSource": "Otros",
      "report.yearTip": "{year} · {size} — Fotos {photos} · Vídeos {videos}",
      "report.empty.title": "Todavía no hay datos",
      "report.empty.text": "Cuando se cargue la biblioteca verás aquí el desglose por año, categoría y origen.",

      "cat.screen_recording": "Grabaciones de pantalla",
      "cat.screenshot": "Capturas",
      "cat.whatsapp": "WhatsApp",
      "cat.social": "Redes sociales",
      "cat.messaging": "Mensajería",
      "cat.airdrop": "AirDrop",
      "cat.camera": "Cámara",
      "cat.other_apps": "Otras apps",
      "cat.burst": "Ráfagas",
      "cat.live": "Live Photos",
      "cat.panorama": "Panorámicas",
      "cat.slomo": "Cámara lenta",
      "cat.timelapse": "Time-lapse",
      "cat.portrait": "Retratos",
      "cat.selfie": "Selfies",
      "cat.favorite": "Favoritas",
      "cat.hidden": "Ocultas",
      "cat.pet": "Mascotas",
      "cat.dog": "Perros",
      "cat.cat": "Gatos",
      "cat.duplicate": "Duplicadas",
      "cat.similar": "Parecidas",
      "cat.poor": "Probablemente fallidas",

      "source.camera": "Cámara",
      "source.whatsapp": "WhatsApp",
      "source.social": "Redes sociales",
      "source.messaging": "Mensajería",
      "source.airdrop": "AirDrop",
      "source.other_apps": "Otras apps",
      "source.other": "Otros",

      "set.title": "Ajustes",
      "set.saveTo": "Guardar en",
      "set.change": "Cambiar…",
      "set.organize": "Organizar carpetas",
      "set.organizeHint": "Elige cómo se crean las carpetas dentro del destino.",
      "set.custom": "Plantilla personalizada",
      "set.flat": "Todo en una carpeta",
      "set.flatPreview": "(todo en una carpeta)",
      "set.tokenHint": "Pulsa una etiqueta para insertarla en el cursor. Usa / para crear subcarpetas.",
      "set.preview": "Vista previa",
      "set.previewEmpty": "Aún no hay ejemplos.",
      "set.checking": "Comprobando…",
      "set.xmp": "Escribir etiquetas junto a cada foto (XMP)",
      "set.xmpHint": "Personas, lugar y tipo, legibles por Lightroom, digiKam…",
      "set.language": "Idioma",
      "set.auto": "Automático",
      "set.about": "Acerca de",
      "set.version": "Versión {v}",
      "set.openSource": "Código abierto · MIT",
      "set.notApple": "Sin relación con Apple.",
      "set.cancel": "Cancelar",
      "set.save": "Guardar",
      "set.saved": "Ajustes guardados",
      "set.chooseFolder": "Elegir esta carpeta",
      "set.folderTitle": "Elegir carpeta",
      "set.folderHome": "Inicio",
      "set.folderPictures": "Imágenes",
      "set.folderDesktop": "Escritorio",
      "set.volumes": "Volúmenes",
      "set.up": "Atrás",
      "set.noSubfolders": "Sin subcarpetas",
      "set.archiveChanged": "Carpeta de destino actualizada",
      "set.loading": "Cargando…",
      "set.languageChanged": "Idioma cambiado",

      "preset.year_month": "Año y mes",
      "preset.year": "Año",
      "preset.place": "País y ciudad",
      "preset.person": "Persona o mascota",
      "preset.type": "Tipo de archivo",
      "preset.source": "App de origen y año",
      "preset.flat": "Todo en una carpeta",

      "tok.year": "Año",
      "tok.month": "Mes",
      "tok.day": "Día",
      "tok.country": "País",
      "tok.region": "Región",
      "tok.city": "Ciudad",
      "tok.person": "Persona",
      "tok.type": "Tipo",
      "tok.source": "Origen",
      "tok.camera": "Cámara",
      "tok.slash": "Subcarpeta",

      "set.sample.country": "España",
      "set.sample.region": "Zaragoza",
      "set.sample.city": "Zaragoza",
      "set.sample.person": "Ana",
      "set.sample.type": "Vídeos"
    },
    en: {
      "err.network": "No connection to iCleaning.",

      "view.suggestions": "Cleanup suggestions",
      "view.people": "People & Pets",
      "view.places": "Places",
      "view.map": "Map",
      "view.report": "Report",

      "v.review": "Review",
      "v.expand": "Expand",
      "v.collapse": "Collapse",
      "v.nsize": "{n} · {size}",
      "v.items": "{n} items",
      "v.photos": "{n} photos",
      "v.size": "{size}",

      "sug.headline": "You could free up to {size}",
      "sug.sub": "Pick a category, check what is inside and save or delete it in one go.",
      "sug.large_videos.title": "Large videos",
      "sug.large_videos.desc": "Videos over a minute or over 200 MB.",
      "sug.screenshots.title": "Screenshots",
      "sug.screenshots.desc": "Screen captures you probably no longer need.",
      "sug.screen_recordings.title": "Screen recordings",
      "sug.screen_recordings.desc": "Recordings saved by the screen recorder.",
      "sug.whatsapp.title": "WhatsApp",
      "sug.whatsapp.desc": "Photos and videos received on WhatsApp.",
      "sug.social.title": "Social media",
      "sug.social.desc": "Saves from Instagram, TikTok and the like.",
      "sug.burst.title": "Unpicked burst photos",
      "sug.burst.desc": "Shots the camera discarded from a burst.",
      "sug.duplicates.title": "Duplicates",
      "sug.duplicates.desc": "The same photo stored twice.",
      "sug.similar.title": "Similar photos",
      "sug.similar.desc": "Near-identical shots from the same series.",
      "sug.poor.title": "Probably failed",
      "sug.poor.desc": "Blurry, dark or broken photos.",
      "sug.saved.title": "Already saved on PC",
      "sug.saved.desc": "Copies you already have in your folder.",
      "sug.bulk.title": "Bulk tip",
      "sug.bulk.text": "Open a card, press ⌘A / Ctrl+A to select everything and use Save to PC or Delete. Start with the biggest items.",
      "sug.empty.title": "Nothing to clean up",
      "sug.empty.text": "No large files or duplicates found in this library.",

      "people.sub": "{n} people and pets",
      "people.unnamed": "Unnamed",
      "people.photos": "{n} photos",
      "people.empty.title": "No people yet",
      "people.empty.text": "Connect your iPhone by cable once to sort by people and pets.",

      "places.sub": "{n} places",
      "places.unknown": "Unknown place",
      "places.empty.title": "No places yet",
      "places.empty.text": "Places come from the location stored in your photos.",

      "map.sub": "{n} items with a location",
      "map.note": "Offline map: your locations never leave this computer.",
      "map.zoomIn": "Zoom in",
      "map.zoomOut": "Zoom out",
      "map.reset": "Reset view",
      "map.near": "Near {place}",
      "map.somewhere": "this area",
      "map.empty.title": "No locations on the map",
      "map.empty.text": "No photo in this library has location data.",
      "map.error": "The map could not be loaded.",

      "report.sub": "{n} items · {size}",
      "report.total": "Total size",
      "report.totalSub": "{n} items",
      "report.videos": "Videos",
      "report.screenshots": "Screenshots",
      "report.saved": "Saved on PC",
      "report.byYear": "By year",
      "report.byCategory": "By category",
      "report.bySource": "By source app",
      "report.photos": "Photos",
      "report.otherSource": "Other",
      "report.yearTip": "{year} · {size} — Photos {photos} · Videos {videos}",
      "report.empty.title": "No data yet",
      "report.empty.text": "Once the library loads you will see the breakdown by year, category and source here.",

      "cat.screen_recording": "Screen recordings",
      "cat.screenshot": "Screenshots",
      "cat.whatsapp": "WhatsApp",
      "cat.social": "Social media",
      "cat.messaging": "Messaging",
      "cat.airdrop": "AirDrop",
      "cat.camera": "Camera",
      "cat.other_apps": "Other apps",
      "cat.burst": "Bursts",
      "cat.live": "Live Photos",
      "cat.panorama": "Panoramas",
      "cat.slomo": "Slo-mo",
      "cat.timelapse": "Time-lapse",
      "cat.portrait": "Portraits",
      "cat.selfie": "Selfies",
      "cat.favorite": "Favorites",
      "cat.hidden": "Hidden",
      "cat.pet": "Pets",
      "cat.dog": "Dogs",
      "cat.cat": "Cats",
      "cat.duplicate": "Duplicates",
      "cat.similar": "Similar",
      "cat.poor": "Probably failed",

      "source.camera": "Camera",
      "source.whatsapp": "WhatsApp",
      "source.social": "Social media",
      "source.messaging": "Messaging",
      "source.airdrop": "AirDrop",
      "source.other_apps": "Other apps",
      "source.other": "Other",

      "set.title": "Settings",
      "set.saveTo": "Save to",
      "set.change": "Change…",
      "set.organize": "Organize folders",
      "set.organizeHint": "Choose how folders are created inside the destination.",
      "set.custom": "Custom template",
      "set.flat": "All in one folder",
      "set.flatPreview": "(all in one folder)",
      "set.tokenHint": "Click a tag to insert it at the cursor. Use / to create subfolders.",
      "set.preview": "Preview",
      "set.previewEmpty": "No examples yet.",
      "set.checking": "Checking…",
      "set.xmp": "Write tags next to each photo (XMP)",
      "set.xmpHint": "People, place and type, readable by Lightroom, digiKam…",
      "set.language": "Language",
      "set.auto": "Automatic",
      "set.about": "About",
      "set.version": "Version {v}",
      "set.openSource": "Open source · MIT",
      "set.notApple": "Not affiliated with Apple.",
      "set.cancel": "Cancel",
      "set.save": "Save",
      "set.saved": "Settings saved",
      "set.chooseFolder": "Choose this folder",
      "set.folderTitle": "Choose folder",
      "set.folderHome": "Home",
      "set.folderPictures": "Pictures",
      "set.folderDesktop": "Desktop",
      "set.volumes": "Volumes",
      "set.up": "Back",
      "set.noSubfolders": "No subfolders",
      "set.archiveChanged": "Destination folder updated",
      "set.loading": "Loading…",
      "set.languageChanged": "Language changed",

      "preset.year_month": "Year and month",
      "preset.year": "Year",
      "preset.place": "Country and city",
      "preset.person": "Person or pet",
      "preset.type": "Type of file",
      "preset.source": "Source app and year",
      "preset.flat": "All in one folder",

      "tok.year": "Year",
      "tok.month": "Month",
      "tok.day": "Day",
      "tok.country": "Country",
      "tok.region": "Region",
      "tok.city": "City",
      "tok.person": "Person",
      "tok.type": "Type",
      "tok.source": "Source",
      "tok.camera": "Camera",
      "tok.slash": "Subfolder",

      "set.sample.country": "Spain",
      "set.sample.region": "Zaragoza",
      "set.sample.city": "Zaragoza",
      "set.sample.person": "Ana",
      "set.sample.type": "Videos"
    }
  });

  // ---------------------------------------------------------------- helpers
  function t(key, params) {
    return LF.t(key, params);
  }

  function appendChildren(el, children) {
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) appendChildren(el, c);
      else if (c instanceof Node) el.appendChild(c);
      else el.appendChild(document.createTextNode(String(c)));
    }
  }

  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k === "html") el.innerHTML = v;
        else if (k === "dataset") Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
        else if (k === "style" && typeof v === "object") Object.keys(v).forEach(function (s) { el.style[s] = v[s]; });
        else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (v === true) el.setAttribute(k, "");
        else el.setAttribute(k, v);
      });
    }
    appendChildren(el, Array.prototype.slice.call(arguments, 2));
    return el;
  }

  function s(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]);
      });
    }
    return el;
  }

  function iconSpan(name, cls) {
    var span = h("span", { class: "lf-ico" + (cls ? " " + cls : "") });
    try { span.innerHTML = LF.icon(name) || ""; } catch (e) { span.textContent = ""; }
    return span;
  }

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function num(n) {
    return LF.fmtNum(n || 0);
  }

  function bytes(n) {
    return LF.fmtBytes(n || 0);
  }

  function hasCat(it, cat) {
    return !!(it && it.c && it.c.indexOf(cat) >= 0);
  }

  function items() {
    return LF.items || [];
  }

  function meta() {
    return LF.meta || {};
  }

  function placeAt(i) {
    var places = meta().places;
    if (!Array.isArray(places) || typeof i !== "number" || i < 0 || i >= places.length) return null;
    return places[i];
  }

  function utf8Flag(code) {
    var cc = String(code || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) return "🌐";
    return String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65, 0x1F1E6 + cc.charCodeAt(1) - 65);
  }

  function numOr(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : fallback;
  }

  function hashHue(text) {
    var x = 0, str = String(text || "?");
    for (var i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) >>> 0;
    return x % 360;
  }

  function emptyState(icon, title, text) {
    return h("div", { class: "empty-state lf-empty" },
      iconSpan(icon, "lf-empty-icon"),
      h("h2", { class: "lf-empty-title", text: title }),
      h("p", { class: "lf-empty-text", text: text }));
  }

  function viewHead(title, sub) {
    return h("header", { class: "lf-view-head" },
      h("h2", { class: "lf-view-title", text: title }),
      sub ? h("p", { class: "lf-view-sub", text: sub }) : null);
  }

  function errorText(err) {
    var code = err && err.code ? err.code : "internal";
    var key = "err." + code;
    var txt = LF.t(key);
    if (txt === key && err && err.detail) return String(err.detail);
    return txt;
  }

  function toastError(err) {
    LF.toast(errorText(err), "error");
  }

  function pick(obj, key, alt) {
    if (!obj) return undefined;
    if (obj[key] !== undefined) return obj[key];
    return alt ? obj[alt] : undefined;
  }

  // ---------------------------------------------------------------- active view
  var active = null;   // {name, render, cleanup}

  function activate(name, render, cleanup) {
    if (active && active.cleanup) {
      try { active.cleanup(); } catch (e) { /* ignore */ }
    }
    active = { name: name, render: render, cleanup: cleanup || null };
  }

  function deactivate(name) {
    if (active && active.name === name) {
      if (active.cleanup) {
        try { active.cleanup(); } catch (e) { /* ignore */ }
      }
      active = null;
    }
  }

  LF.on("items", function () { if (active) active.render(); });
  LF.on("lang", function () { if (active) active.render(); });

  // ================================================================ suggestions
  var SUGGESTIONS = [
    {
      key: "large_videos", icon: "video", sort: "size",
      title: "sug.large_videos.title", desc: "sug.large_videos.desc",
      test: function (it) { return it.k === "video" && ((it.dur || 0) > 60 || (it.s || 0) > 200 * MB); }
    },
    {
      key: "screenshots", icon: "screenshot", sort: "size",
      title: "sug.screenshots.title", desc: "sug.screenshots.desc",
      test: function (it) { return hasCat(it, "screenshot"); }
    },
    {
      key: "screen_recordings", icon: "screenrec", sort: "size",
      title: "sug.screen_recordings.title", desc: "sug.screen_recordings.desc",
      test: function (it) { return hasCat(it, "screen_recording"); }
    },
    {
      key: "whatsapp", icon: "chat", sort: "size",
      title: "sug.whatsapp.title", desc: "sug.whatsapp.desc",
      test: function (it) { return hasCat(it, "whatsapp"); }
    },
    {
      key: "social", icon: "social", sort: "size",
      title: "sug.social.title", desc: "sug.social.desc",
      test: function (it) { return hasCat(it, "social"); }
    },
    {
      key: "burst", icon: "burst", sort: "size",
      title: "sug.burst.title", desc: "sug.burst.desc",
      test: function (it) { return hasCat(it, "burst") && !it.best; }
    },
    {
      key: "duplicates", icon: "duplicate", sort: "size",
      title: "sug.duplicates.title", desc: "sug.duplicates.desc",
      test: function (it) { return hasCat(it, "duplicate"); }
    },
    {
      key: "similar", icon: "similar", sort: "group",
      title: "sug.similar.title", desc: "sug.similar.desc",
      test: function (it) { return hasCat(it, "similar") && !it.best; }
    },
    {
      key: "poor", icon: "poor", sort: "quality",
      title: "sug.poor.title", desc: "sug.poor.desc",
      test: function (it) { return hasCat(it, "poor"); }
    },
    {
      key: "saved", icon: "saved", sort: "size",
      title: "sug.saved.title", desc: "sug.saved.desc",
      test: function (it) { return !!it.sv; }
    }
  ];

  function suggestionCards(list) {
    var cards = [];
    for (var i = 0; i < SUGGESTIONS.length; i++) {
      var def = SUGGESTIONS[i];
      var matched = list.filter(def.test);
      if (!matched.length) continue;
      var total = 0;
      for (var j = 0; j < matched.length; j++) total += matched[j].s || 0;
      cards.push({ def: def, items: matched, n: matched.length, bytes: total });
    }
    cards.sort(function (a, b) { return b.bytes - a.bytes; });
    return cards;
  }

  function suggestionsFreeable(cards) {
    var seen = Object.create(null), total = 0;
    for (var i = 0; i < cards.length; i++) {
      var list = cards[i].items;
      for (var j = 0; j < list.length; j++) {
        var id = list[j].id;
        if (seen[id]) continue;
        seen[id] = true;
        total += list[j].s || 0;
      }
    }
    return total;
  }

  function renderSuggestions(container) {
    container.textContent = "";
    var list = items();
    var cards = suggestionCards(list);
    var root = h("div", { class: "lf-view lf-suggestions" });
    if (!cards.length) {
      root.appendChild(emptyState("sparkles", t("sug.empty.title"), t("sug.empty.text")));
      container.appendChild(root);
      return;
    }
    var freeable = suggestionsFreeable(cards);
    root.appendChild(viewHead(
      t("sug.headline", { size: bytes(freeable) }),
      t("sug.sub")
    ));

    var grid = h("div", { class: "lf-sug-grid" });
    cards.forEach(function (card) {
      var def = card.def;
      var title = t(def.title);
      var review = h("button", {
        class: "btn lf-sug-review", type: "button",
        "aria-label": title + " — " + t("v.review")
      }, t("v.review"));
      review.addEventListener("click", function () {
        LF.setScope({
          key: "suggestion:" + def.key,
          title: title,
          subtitle: t(def.desc),
          filter: def.test,
          sort: def.sort
        });
      });
      grid.appendChild(h("article", { class: "card lf-sug-card" },
        h("div", { class: "lf-sug-icon" }, iconSpan(def.icon)),
        h("div", { class: "lf-sug-copy" },
          h("h3", { class: "lf-sug-title", text: title }),
          h("p", { class: "lf-sug-desc", text: t(def.desc) }),
          h("div", { class: "lf-sug-meta", text: t("v.nsize", { n: num(card.n), size: bytes(card.bytes) }) })),
        review));
    });
    grid.appendChild(h("article", { class: "card lf-sug-bulk" },
      h("div", { class: "lf-sug-icon lf-sug-icon-soft" }, iconSpan("sparkles")),
      h("div", { class: "lf-sug-copy" },
        h("h3", { class: "lf-sug-title", text: t("sug.bulk.title") }),
        h("p", { class: "lf-sug-desc", text: t("sug.bulk.text") }))));
    root.appendChild(grid);
    container.appendChild(root);
  }

  // ================================================================ people
  function personCounts() {
    var counts = Object.create(null), sizes = Object.create(null);
    var list = items();
    for (var i = 0; i < list.length; i++) {
      var ids = list[i].p;
      if (!Array.isArray(ids)) continue;
      for (var j = 0; j < ids.length; j++) {
        var id = ids[j];
        counts[id] = (counts[id] || 0) + 1;
        sizes[id] = (sizes[id] || 0) + (list[i].s || 0);
      }
    }
    return { counts: counts, sizes: sizes };
  }

  function avatarFor(person) {
    var el = h("div", { class: "lf-avatar" });
    var face = person && person.face;
    if (face && face.a !== null && face.a !== undefined && face.a !== "") {
      var size = numOr(face.s, 0.2);
      if (!(size > 0)) size = 0.2;
      var zoom = clamp(0.7 / size, 1, 40);
      var fx = clamp(numOr(face.x, 0.5), 0, 1);
      var fy = clamp(1 - numOr(face.y, 0.5), 0, 1);
      var url = "";
      try { url = LF.thumbUrl(face.a) || ""; } catch (e) { url = ""; }
      if (url) {
        el.style.backgroundImage = 'url("' + String(url).replace(/"/g, "%22") + '")';
        el.style.backgroundSize = "calc(var(--lf-avatar-size, 120px) * " + zoom.toFixed(4) + ")";
        el.style.backgroundPosition = "calc(var(--lf-avatar-size, 120px) * " +
          (0.5 - fx * zoom).toFixed(4) + ") calc(var(--lf-avatar-size, 120px) * " +
          (0.5 - fy * zoom).toFixed(4) + ")";
        el.style.backgroundRepeat = "no-repeat";
      }
    }
    if (!el.style.backgroundImage) {
      var name = String((person && person.name) || "").trim();
      var hue = hashHue(name || (person && person.id) || "?");
      el.classList.add("lf-avatar-initial");
      el.style.background = "linear-gradient(135deg, hsl(" + hue + " 58% 58%), hsl(" +
        ((hue + 28) % 360) + " 58% 46%))";
      el.textContent = name ? name.charAt(0).toUpperCase() : "?";
    }
    if (person && person.kind && person.kind !== "person") {
      el.appendChild(h("span", { class: "lf-pet-badge", title: t("cat." + person.kind) },
        iconSpan("paw")));
    }
    return el;
  }

  function renderPeople(container) {
    container.textContent = "";
    var people = (meta().people || []).slice();
    var root = h("div", { class: "lf-view lf-people" });
    root.appendChild(viewHead(t("view.people"), t("people.sub", { n: num(people.length) })));

    if (!people.length) {
      root.appendChild(emptyState("people", t("people.empty.title"), t("people.empty.text")));
      container.appendChild(root);
      return;
    }

    var stats = personCounts();
    people.sort(function (a, b) {
      var an = a.name ? 0 : 1, bn = b.name ? 0 : 1;
      if (an !== bn) return an - bn;
      var ac = stats.counts[a.id] || a.n || 0;
      var bc = stats.counts[b.id] || b.n || 0;
      if (ac !== bc) return bc - ac;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    var grid = h("div", { class: "lf-people-grid" });
    people.forEach(function (person) {
      var count = stats.counts[person.id] !== undefined ? stats.counts[person.id] : (person.n || 0);
      var name = person.name || t("people.unnamed");
      var card = h("button", { class: "lf-person-card", type: "button", "aria-label": name },
        avatarFor(person),
        h("span", { class: "lf-person-name", text: name }),
        h("span", { class: "lf-person-count", text: t("people.photos", { n: num(count) }) }));
      card.addEventListener("click", function () {
        LF.setScope({
          key: "person:" + person.id,
          title: name,
          filter: function (it) { return !!(it.p && it.p.indexOf(person.id) >= 0); },
          sort: "size"
        });
      });
      grid.appendChild(card);
    });
    root.appendChild(grid);
    container.appendChild(root);
  }

  // ================================================================ places
  function placeStats() {
    var stats = [];
    var list = items();
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (typeof it.pl !== "number") continue;
      var place = placeAt(it.pl);
      if (!place) continue;
      var st = stats[it.pl];
      if (!st) stats[it.pl] = st = { n: 0, bytes: 0 };
      st.n++;
      st.bytes += it.s || 0;
    }
    return stats;
  }

  function placeTree(stats) {
    var countries = new Map();
    for (var i = 0; i < stats.length; i++) {
      var st = stats[i];
      if (!st) continue;
      var place = placeAt(i);
      if (!place) continue;
      var country = String(place[0] || "").trim() || t("places.unknown");
      var region = String(place[1] || "").trim();
      var city = String(place[2] || "").trim();
      var code = String(place[3] || "").trim();
      var ckey = country + "|" + code;
      var c = countries.get(ckey);
      if (!c) {
        c = { name: country, code: code, n: 0, bytes: 0, idx: new Set(),
              regions: new Map(), directCities: new Map(), key: ckey };
        countries.set(ckey, c);
      }
      c.n += st.n; c.bytes += st.bytes; c.idx.add(i);
      var parent = c, parentKey = ckey;
      if (region) {
        parentKey = ckey + "|r|" + region;
        var r = c.regions.get(region);
        if (!r) {
          r = { name: region, n: 0, bytes: 0, idx: new Set(), cities: new Map(), key: parentKey };
          c.regions.set(region, r);
        }
        r.n += st.n; r.bytes += st.bytes; r.idx.add(i);
        parent = r;
      }
      if (city) {
        var cityMap = region ? parent.cities : c.directCities;
        var cityKey = parentKey + "|c|" + city;
        var ci = cityMap.get(city);
        if (!ci) {
          ci = { name: city, n: 0, bytes: 0, idx: new Set(), key: cityKey, country: c.name };
          cityMap.set(city, ci);
        }
        ci.n += st.n; ci.bytes += st.bytes; ci.idx.add(i);
      }
    }
    return countries;
  }

  function placeScope(idxSet, title) {
    LF.setScope({
      key: "place",
      title: title,
      filter: function (it) { return typeof it.pl === "number" && idxSet.has(it.pl); },
      sort: "size"
    });
  }

  function placeRow(opts) {
    var row = h("div", { class: "row lf-place-row" + (opts.depth ? " lf-depth-" + opts.depth : "") });
    var hasChildren = opts.hasChildren;
    if (hasChildren) {
      var expanded = opts.expanded;
      var twisty = h("button", {
        class: "btn icon lf-twisty", type: "button",
        "aria-expanded": expanded ? "true" : "false",
        "aria-label": expanded ? t("v.collapse") : t("v.expand")
      }, iconSpan(expanded ? "chevron-down" : "chevron-right"));
      twisty.addEventListener("click", function (ev) {
        ev.stopPropagation();
        opts.onToggle();
      });
      row.appendChild(twisty);
    } else {
      row.appendChild(h("span", { class: "lf-twisty-space" }));
    }
    var main = h("button", { class: "lf-place-main", type: "button" },
      opts.flag ? h("span", { class: "lf-flag", text: opts.flag }) : null,
      h("span", { class: "lf-place-name", text: opts.label }),
      h("span", { class: "meta lf-place-meta", text: t("v.nsize", { n: num(opts.n), size: bytes(opts.bytes) }) }));
    main.addEventListener("click", function () { placeScope(opts.idx, opts.scopeTitle); });
    row.appendChild(main);
    return row;
  }

  function renderPlaces(container, expanded) {
    container.textContent = "";
    var stats = placeStats();
    var tree = placeTree(stats);
    var root = h("div", { class: "lf-view lf-places" });
    var count = 0;
    tree.forEach(function (c) { if (c.n) count++; });
    root.appendChild(viewHead(t("view.places"), t("places.sub", { n: num(count) })));

    if (!tree.size) {
      root.appendChild(emptyState("pin", t("places.empty.title"), t("places.empty.text")));
      container.appendChild(root);
      return;
    }

    var listEl = h("div", { class: "list lf-places-tree" });
    var countries = Array.from(tree.values()).sort(function (a, b) {
      return String(a.name).localeCompare(String(b.name));
    });
    countries.forEach(function (c) {
      if (!c.n) return;
      var cOpen = expanded.has(c.key);
      var hasRegions = c.regions.size > 0;
      var hasDirect = c.directCities.size > 0;
      listEl.appendChild(placeRow({
        depth: 0, flag: utf8Flag(c.code), label: c.name, n: c.n, bytes: c.bytes,
        idx: c.idx, scopeTitle: c.name,
        hasChildren: hasRegions || hasDirect, expanded: cOpen,
        onToggle: function () {
          if (cOpen) expanded.delete(c.key); else expanded.add(c.key);
          renderPlaces(container, expanded);
        }
      }));
      if (!cOpen) return;
      if (hasDirect) {
        Array.from(c.directCities.values()).sort(function (a, b) {
          return String(a.name).localeCompare(String(b.name));
        }).forEach(function (ci) {
          listEl.appendChild(placeRow({
            depth: 1, label: ci.name, n: ci.n, bytes: ci.bytes, idx: ci.idx,
            scopeTitle: ci.name + (c.name ? ", " + c.name : "")
          }));
        });
      }
      Array.from(c.regions.values()).sort(function (a, b) {
        return String(a.name).localeCompare(String(b.name));
      }).forEach(function (r) {
        var rOpen = expanded.has(r.key);
        listEl.appendChild(placeRow({
          depth: 1, label: r.name, n: r.n, bytes: r.bytes, idx: r.idx,
          scopeTitle: r.name + (c.name ? ", " + c.name : ""),
          hasChildren: r.cities.size > 0, expanded: rOpen,
          onToggle: function () {
            if (rOpen) expanded.delete(r.key); else expanded.add(r.key);
            renderPlaces(container, expanded);
          }
        }));
        if (!rOpen) return;
        Array.from(r.cities.values()).sort(function (a, b) {
          return String(a.name).localeCompare(String(b.name));
        }).forEach(function (ci) {
          listEl.appendChild(placeRow({
            depth: 2, label: ci.name, n: ci.n, bytes: ci.bytes, idx: ci.idx,
            scopeTitle: ci.name + (c.name ? ", " + c.name : "")
          }));
        });
      });
    });
    root.appendChild(listEl);
    container.appendChild(root);
  }

  // ================================================================ map (offline TopoJSON)
  function lonToX(lon) { return (lon + 180) / 360 * 1000; }
  function latToY(lat) { return (90 - lat) / 180 * 500; }

  function decodeRing(ring, arcs) {
    var pts = [];
    for (var i = 0; i < ring.length; i++) {
      var idx = ring[i];
      var rev = idx < 0;
      var arc = arcs[rev ? ~idx : idx];
      if (!arc) continue;
      var start = pts.length ? 1 : 0;
      if (rev) {
        for (var j = arc.length - 1 - start; j >= 0; j--) pts.push(arc[j]);
      } else {
        for (var k = start; k < arc.length; k++) pts.push(arc[k]);
      }
    }
    return pts;
  }

  function decodeTopology(topo) {
    var transform = topo && topo.transform;
    var rawArcs = (topo && topo.arcs) || [];
    var arcs = rawArcs.map(function (arc) {
      if (!transform) {
        return arc.map(function (pt) { return [pt[0], pt[1]]; });
      }
      var x = 0, y = 0, out = [];
      for (var i = 0; i < arc.length; i++) {
        x += arc[i][0];
        y += arc[i][1];
        out.push([x * transform.scale[0] + transform.translate[0], y * transform.scale[1] + transform.translate[1]]);
      }
      return out;
    });
    var countries = topo && topo.objects && topo.objects.countries;
    if (!countries) return [];
    var list = countries.type === "GeometryCollection" ? countries.geometries : [countries];
    var geoms = [];
    for (var i = 0; i < list.length; i++) {
      var g = list[i];
      if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) continue;
      var polys = g.type === "Polygon" ? [g.arcs] : g.arcs;
      var rings = [];
      for (var p = 0; p < polys.length; p++) {
        var poly = polys[p] || [];
        for (var r = 0; r < poly.length; r++) {
          var ring = decodeRing(poly[r] || [], arcs);
          if (ring.length > 1) rings.push(ring);
        }
      }
      if (rings.length) {
        geoms.push({
          name: (g.properties && g.properties.name) || "",
          id: g.id,
          rings: rings
        });
      }
    }
    return geoms;
  }

  function ringToPath(ring) {
    var d = "";
    var prevLon = null;
    for (var i = 0; i < ring.length; i++) {
      var lon = ring[i][0];
      var lat = ring[i][1];
      var x = lonToX(lon).toFixed(2);
      var y = latToY(lat).toFixed(2);
      if (prevLon === null || Math.abs(lon - prevLon) > 180) d += "M" + x + " " + y;
      else d += "L" + x + " " + y;
      prevLon = lon;
    }
    return d ? d + "Z" : "";
  }

  function clusterPoints(points, cellPx, scale) {
    var cell = Math.max(0.000001, cellPx / Math.max(scale, 0.000001));
    var cells = new Map();
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      var key = Math.floor(p.x / cell) + ":" + Math.floor(p.y / cell);
      var arr = cells.get(key);
      if (!arr) cells.set(key, arr = []);
      arr.push(p);
    }
    var clusters = [];
    cells.forEach(function (arr) {
      var sx = 0, sy = 0;
      var latMin = Infinity, latMax = -Infinity, lonMin = Infinity, lonMax = -Infinity;
      for (var j = 0; j < arr.length; j++) {
        var q = arr[j];
        sx += q.x; sy += q.y;
        if (q.lat < latMin) latMin = q.lat;
        if (q.lat > latMax) latMax = q.lat;
        if (q.lon < lonMin) lonMin = q.lon;
        if (q.lon > lonMax) lonMax = q.lon;
      }
      clusters.push({
        x: sx / arr.length, y: sy / arr.length, count: arr.length, items: arr,
        latMin: latMin, latMax: latMax, lonMin: lonMin, lonMax: lonMax
      });
    });
    return clusters;
  }

  var worldPromise = null;
  function loadWorld() {
    if (!worldPromise) {
      worldPromise = fetch("/world.json", { credentials: "same-origin" })
        .then(function (r) {
          if (!r.ok) throw new Error("world");
          return r.json();
        })
        .then(decodeTopology)
        .catch(function (err) {
          worldPromise = null;
          throw err;
        });
    }
    return worldPromise;
  }

  function mapPoints() {
    var list = items(), out = [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (!Array.isArray(it.geo) || it.geo.length < 2) continue;
      var lat = Number(it.geo[0]), lon = Number(it.geo[1]);
      if (!isFinite(lat) || !isFinite(lon)) continue;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
      out.push({ item: it, lat: lat, lon: lon, x: lonToX(lon), y: latToY(lat) });
    }
    return out;
  }

  function clusterPlace(cluster) {
    var counts = new Map();
    for (var i = 0; i < cluster.items.length; i++) {
      var pl = cluster.items[i].item.pl;
      if (typeof pl !== "number") continue;
      counts.set(pl, (counts.get(pl) || 0) + 1);
    }
    var best = -1, bestN = 0;
    counts.forEach(function (n, idx) {
      if (n > bestN) { bestN = n; best = idx; }
    });
    if (best >= 0) {
      var place = placeAt(best);
      if (place) {
        var city = String(place[2] || "").trim();
        var country = String(place[0] || "").trim();
        var region = String(place[1] || "").trim();
        if (city) return city;
        if (country) return country;
        if (region) return region;
      }
    }
    return t("map.somewhere");
  }

  function mountMap(container) {
    container.textContent = "";
    var vb = { x: BASE_VIEW.x, y: BASE_VIEW.y, w: BASE_VIEW.w, h: BASE_VIEW.h };
    var points = [];
    var geoms = null;
    var drag = null;
    var suppressClick = false;
    var disposed = false;

    var titleEl = h("h2", { class: "lf-view-title", text: t("view.map") });
    var subEl = h("p", { class: "lf-view-sub" });
    var noteEl = h("p", { class: "lf-map-note" });
    var svg = s("svg", {
      class: "lf-world", viewBox: "0 0 1000 500",
      preserveAspectRatio: "xMidYMid meet", role: "group", "aria-label": t("view.map")
    });
    var ocean = s("rect", { x: 0, y: 0, width: 1000, height: 500, class: "lf-ocean" });
    var land = s("g", { class: "lf-land" });
    var clustersG = s("g", { class: "lf-clusters" });
    svg.appendChild(ocean);
    svg.appendChild(land);
    svg.appendChild(clustersG);

    var emptyEl = h("div", { class: "lf-map-empty", hidden: true },
      h("h2", { class: "lf-empty-title", text: t("map.empty.title") }),
      h("p", { class: "lf-empty-text", text: t("map.empty.text") }));

    function zoomButton(label, action) {
      var b = h("button", { class: "btn icon lf-map-btn", type: "button", "aria-label": label, title: label },
        h("span", { text: action === "reset" ? "↺" : action === "in" ? "+" : "−" }));
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (action === "in") zoomAt(vb.x + vb.w / 2, vb.y + vb.h / 2, 1 / 1.4);
        else if (action === "out") zoomAt(vb.x + vb.w / 2, vb.y + vb.h / 2, 1.4);
        else resetView();
      });
      return b;
    }

    var controls = h("div", { class: "lf-map-controls" },
      zoomButton(t("map.zoomIn"), "in"),
      zoomButton(t("map.zoomOut"), "out"),
      zoomButton(t("map.reset"), "reset"));
    var frame = h("div", { class: "lf-map-frame" }, svg, controls, emptyEl);
    var root = h("div", { class: "lf-view lf-map-view" },
      h("header", { class: "lf-view-head" }, titleEl, subEl), frame, noteEl);
    container.appendChild(root);

    function mapScale() {
      var w = svg.clientWidth || svg.getBoundingClientRect().width || 1000;
      return Math.max(0.000001, w / vb.w);
    }

    function applyViewBox() {
      svg.setAttribute("viewBox", vb.x.toFixed(3) + " " + vb.y.toFixed(3) + " " + vb.w.toFixed(3) + " " + (vb.h).toFixed(3));
    }

    function clampView(v) {
      var w = clamp(v.w, 20, 1000);
      var h = w / 2;
      return {
        x: clamp(v.x, 0, 1000 - w),
        y: clamp(v.y, 0, 500 - h),
        w: w, h: h
      };
    }

    function drawWorld() {
      land.textContent = "";
      if (!geoms) return;
      for (var i = 0; i < geoms.length; i++) {
        var d = "";
        for (var r = 0; r < geoms[i].rings.length; r++) d += ringToPath(geoms[i].rings[r]);
        if (!d) continue;
        var path = s("path", { d: d, class: "lf-land-shape", "fill-rule": "evenodd" });
        if (geoms[i].name) {
          var titleNode = s("title", {});
          titleNode.textContent = geoms[i].name;
          path.appendChild(titleNode);
        }
        land.appendChild(path);
      }
    }

    function renderClusters() {
      clustersG.textContent = "";
      if (!points.length) return;
      var scale = mapScale();
      var clusters = clusterPoints(points, 40, scale);
      for (var i = 0; i < clusters.length; i++) {
        (function (c) {
          var place = clusterPlace(c);
          var label = t("map.near", { place: place });
          var g = s("g", {
            class: "lf-cluster", role: "button", tabindex: "0", "aria-label": label
          });
          var rpx = clamp(9 + Math.sqrt(c.count) * 3.4, 10, 34);
          var r = rpx / scale;
          var circle = s("circle", {
            cx: c.x.toFixed(3), cy: c.y.toFixed(3), r: r.toFixed(3),
            class: "lf-cluster-dot"
          });
          var text = s("text", {
            x: c.x.toFixed(3), y: c.y.toFixed(3), class: "lf-cluster-label",
            "text-anchor": "middle", "dominant-baseline": "central",
            "font-size": Math.max(1, 11 / scale).toFixed(3)
          });
          text.textContent = num(c.count);
          g.appendChild(circle);
          g.appendChild(text);
          g.addEventListener("click", function (ev) {
            ev.stopPropagation();
            if (suppressClick) return;
            openCluster(c);
          });
          g.addEventListener("keydown", function (ev) {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              openCluster(c);
            }
          });
          clustersG.appendChild(g);
        })(clusters[i]);
      }
    }

    function openCluster(c) {
      var place = clusterPlace(c);
      LF.setScope({
        key: "map",
        title: t("map.near", { place: place }),
        subtitle: t("v.items", { n: num(c.count) }),
        sort: "size",
        filter: function (it) {
          if (!Array.isArray(it.geo)) return false;
          var lat = Number(it.geo[0]), lon = Number(it.geo[1]);
          return isFinite(lat) && isFinite(lon) &&
            lat >= c.latMin - 1e-9 && lat <= c.latMax + 1e-9 &&
            lon >= c.lonMin - 1e-9 && lon <= c.lonMax + 1e-9;
        }
      });
    }

    function zoomAt(px, py, factor) {
      var nw = clamp(vb.w * factor, 20, 1000);
      var k = nw / vb.w;
      var nx = px - (px - vb.x) * k;
      var ny = py - (py - vb.y) * k;
      vb = clampView({ x: nx, y: ny, w: nw, h: nw / 2 });
      applyViewBox();
      renderClusters();
    }

    function resetView() {
      vb = { x: BASE_VIEW.x, y: BASE_VIEW.y, w: BASE_VIEW.w, h: BASE_VIEW.h };
      applyViewBox();
      renderClusters();
    }

    function onWheel(ev) {
      ev.preventDefault();
      var rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var px = vb.x + (ev.clientX - rect.left) / rect.width * vb.w;
      var py = vb.y + (ev.clientY - rect.top) / rect.height * vb.h;
      zoomAt(px, py, Math.exp(ev.deltaY * 0.0015));
    }

    function stopDragListeners() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    }

    function onPointerDown(ev) {
      if (ev.button !== 0 || drag) return;
      drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, view: { x: vb.x, y: vb.y, w: vb.w, h: vb.h }, moved: false };
      svg.classList.add("dragging");
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    }

    function onPointerMove(ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      var dxPx = ev.clientX - drag.x;
      var dyPx = ev.clientY - drag.y;
      if (!drag.moved && Math.abs(dxPx) + Math.abs(dyPx) > 3) drag.moved = true;
      if (!drag.moved) return;
      var rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var dx = dxPx / rect.width * drag.view.w;
      var dy = dyPx / rect.height * drag.view.h;
      vb = clampView({ x: drag.view.x - dx, y: drag.view.y - dy, w: drag.view.w, h: drag.view.h });
      applyViewBox();
    }

    function onPointerUp(ev) {
      if (!drag) return;
      var moved = drag.moved;
      drag = null;
      svg.classList.remove("dragging");
      stopDragListeners();
      if (moved) {
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 0);
      }
    }

    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("pointerdown", onPointerDown);

    var resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(function () {
        if (!disposed) renderClusters();
      });
      resizeObserver.observe(svg);
    }

    function repaint() {
      if (disposed) return;
      points = mapPoints();
      titleEl.textContent = t("view.map");
      subEl.textContent = t("map.sub", { n: num(points.length) });
      noteEl.textContent = t("map.note");
      emptyEl.hidden = points.length > 0;
      if (geoms && !land.childNodes.length) drawWorld();
      applyViewBox();
      renderClusters();
    }

    loadWorld().then(function (loaded) {
      if (disposed) return;
      geoms = loaded;
      drawWorld();
      renderClusters();
    }).catch(function () {
      if (disposed) return;
      emptyEl.hidden = false;
      emptyEl.querySelector(".lf-empty-title").textContent = t("map.error");
      emptyEl.querySelector(".lf-empty-text").textContent = "";
    });

    return {
      render: repaint,
      cleanup: function () {
        disposed = true;
        stopDragListeners();
        svg.removeEventListener("wheel", onWheel);
        svg.removeEventListener("pointerdown", onPointerDown);
        if (resizeObserver) resizeObserver.disconnect();
      }
    };
  }

  // ================================================================ report
  var SOURCE_DEFS = [
    { key: "camera", cat: "camera" },
    { key: "whatsapp", cat: "whatsapp" },
    { key: "social", cat: "social" },
    { key: "messaging", cat: "messaging" },
    { key: "airdrop", cat: "airdrop" },
    { key: "other_apps", cat: "other_apps" }
  ];

  function sourceOf(it) {
    if (!it.c) return "other";
    for (var i = 0; i < SOURCE_DEFS.length; i++) {
      if (it.c.indexOf(SOURCE_DEFS[i].cat) >= 0) return SOURCE_DEFS[i].key;
    }
    return "other";
  }

  function reportStats(list) {
    var totalBytes = 0, totalN = list.length;
    var videosN = 0, videosBytes = 0;
    var shotsN = 0, shotsBytes = 0;
    var savedN = 0, savedBytes = 0;
    var byYear = new Map();
    var byCat = new Map();
    var bySource = new Map();

    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      var size = it.s || 0;
      totalBytes += size;
      if (it.k === "video") { videosN++; videosBytes += size; }
      if (hasCat(it, "screenshot")) { shotsN++; shotsBytes += size; }
      if (it.sv) { savedN++; savedBytes += size; }

      if (it.d) {
        var year = new Date(it.d * 1000).getFullYear();
        if (isFinite(year)) {
          var y = byYear.get(year);
          if (!y) byYear.set(year, y = { year: year, photo: 0, video: 0, n: 0 });
          if (it.k === "video") y.video += size; else y.photo += size;
          y.n++;
        }
      }

      if (Array.isArray(it.c)) {
        var seen = Object.create(null);
        for (var c = 0; c < it.c.length; c++) {
          var cat = it.c[c];
          if (seen[cat]) continue;
          seen[cat] = true;
          var row = byCat.get(cat);
          if (!row) byCat.set(cat, row = { key: cat, bytes: 0, n: 0 });
          row.bytes += size; row.n++;
        }
      }

      var src = sourceOf(it);
      var sr = bySource.get(src);
      if (!sr) bySource.set(src, sr = { key: src, bytes: 0, n: 0 });
      sr.bytes += size; sr.n++;
    }

    return {
      totalBytes: totalBytes, totalN: totalN,
      videosN: videosN, videosBytes: videosBytes,
      shotsN: shotsN, shotsBytes: shotsBytes,
      savedN: savedN, savedBytes: savedBytes,
      byYear: byYear, byCat: byCat, bySource: bySource
    };
  }

  function statTile(label, value, sub, icon) {
    return h("article", { class: "card lf-tile" },
      h("div", { class: "lf-tile-top" }, iconSpan(icon, "lf-tile-icon"), h("span", { class: "lf-tile-label", text: label })),
      h("div", { class: "lf-tile-value", text: value }),
      h("div", { class: "lf-tile-sub", text: sub }));
  }

  function chartTooltip(wrap) {
    var tip = h("div", { class: "lf-chart-tip", hidden: true });
    wrap.appendChild(tip);
    return {
      el: tip,
      show: function (ev, text, anchor) {
        tip.textContent = text;
        tip.hidden = false;
        var r = wrap.getBoundingClientRect();
        var x, y;
        if (ev && typeof ev.clientX === "number") {
          x = ev.clientX - r.left;
          y = ev.clientY - r.top;
        } else if (anchor) {
          var a = anchor.getBoundingClientRect();
          x = a.left - r.left + a.width / 2;
          y = a.top - r.top;
        } else {
          x = r.width / 2; y = r.height / 2;
        }
        tip.style.left = clamp(x, 70, Math.max(70, r.width - 70)) + "px";
        tip.style.top = clamp(y, 24, Math.max(24, r.height - 8)) + "px";
      },
      hide: function () { tip.hidden = true; }
    };
  }

  function yearChart(stats) {
    var years = Array.from(stats.byYear.values()).sort(function (a, b) { return a.year - b.year; });
    var block = h("section", { class: "lf-chart-block" });
    block.appendChild(h("div", { class: "lf-chart-head" },
      h("h3", { class: "lf-chart-title", text: t("report.byYear") }),
      h("div", { class: "lf-legend" },
        h("span", { class: "lf-legend-item" },
          h("i", { class: "lf-swatch lf-swatch-photo" }), t("report.photos")),
        h("span", { class: "lf-legend-item" },
          h("i", { class: "lf-swatch lf-swatch-video" }), t("report.videos")))));
    if (!years.length) {
      block.appendChild(h("p", { class: "muted", text: t("report.empty.text") }));
      return block;
    }

    var W = 820, H = 280;
    var m = { l: 52, r: 12, t: 16, b: 30 };
    var plotW = W - m.l - m.r, plotH = H - m.t - m.b;
    var max = 0;
    years.forEach(function (y) { max = Math.max(max, y.photo + y.video); });
    if (max <= 0) max = 1;
    var slot = plotW / years.length;
    var barW = Math.max(3, Math.min(42, slot * 0.64));
    var svg = s("svg", {
      class: "lf-chart", viewBox: "0 0 " + W + " " + H,
      role: "group", "aria-label": t("report.byYear")
    });

    for (var g = 0; g <= 2; g++) {
      var gy = m.t + plotH * g / 2;
      svg.appendChild(s("line", { x1: m.l, y1: gy, x2: W - m.r, y2: gy, class: "lf-axis-line" }));
      var lab = s("text", { x: m.l - 8, y: gy + 3, "text-anchor": "end", class: "lf-axis-label" });
      lab.textContent = bytes(max * (1 - g / 2));
      svg.appendChild(lab);
    }

    var step = Math.ceil(years.length / 16);
    var wrap = h("div", { class: "lf-chart-wrap" });
    var tip = chartTooltip(wrap);

    years.forEach(function (y, i) {
      var x0 = m.l + i * slot;
      var bx = x0 + (slot - barW) / 2;
      var base = m.t + plotH;
      var photoH = y.photo > 0 ? Math.max(1, y.photo / max * plotH) : 0;
      var videoH = y.video > 0 ? Math.max(1, y.video / max * plotH) : 0;

      if (photoH) {
        svg.appendChild(s("rect", {
          x: bx.toFixed(2), y: (base - photoH).toFixed(2), width: barW.toFixed(2),
          height: photoH.toFixed(2), class: "lf-bar-photo"
        }));
      }
      if (videoH) {
        svg.appendChild(s("rect", {
          x: bx.toFixed(2), y: (base - photoH - videoH).toFixed(2), width: barW.toFixed(2),
          height: videoH.toFixed(2), class: "lf-bar-video"
        }));
      }

      if (i % step === 0) {
        var label = s("text", {
          x: (x0 + slot / 2).toFixed(2), y: H - 9, "text-anchor": "middle", class: "lf-axis-label"
        });
        label.textContent = String(y.year);
        svg.appendChild(label);
      }

      var tipText = t("report.yearTip", {
        year: String(y.year), size: bytes(y.photo + y.video),
        photos: bytes(y.photo), videos: bytes(y.video)
      });
      var hit = s("rect", {
        x: x0.toFixed(2), y: m.t, width: slot.toFixed(2), height: plotH,
        class: "lf-year-hit", tabindex: "0", role: "button",
        "aria-label": tipText
      });
      hit.addEventListener("pointerenter", function (ev) { tip.show(ev, tipText, hit); });
      hit.addEventListener("pointermove", function (ev) { tip.show(ev, tipText, hit); });
      hit.addEventListener("pointerleave", function () { tip.hide(); });
      hit.addEventListener("focus", function () { tip.show(null, tipText, hit); });
      hit.addEventListener("blur", function () { tip.hide(); });
      hit.addEventListener("click", function () { yearScope(y.year); });
      hit.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          yearScope(y.year);
        }
      });
      svg.appendChild(hit);
    });

    wrap.insertBefore(svg, tip.el);
    block.appendChild(wrap);
    return block;
  }

  function yearScope(year) {
    LF.setScope({
      key: "year:" + year,
      title: String(year),
      filter: function (it) {
        if (!it.d) return false;
        return new Date(it.d * 1000).getFullYear() === year;
      },
      sort: "size"
    });
  }

  function shorten(text, max) {
    var str = String(text || "");
    return str.length > max ? str.slice(0, max - 1) + "…" : str;
  }

  function hbarChart(title, rows) {
    var block = h("section", { class: "lf-chart-block" });
    block.appendChild(h("h3", { class: "lf-chart-title", text: title }));
    if (!rows.length) {
      block.appendChild(h("p", { class: "muted", text: t("report.empty.text") }));
      return block;
    }
    var W = 820, rowH = 25, labelW = 176, valueW = 92, top = 6;
    var H = rows.length * rowH + top * 2;
    var max = 0;
    rows.forEach(function (r) { max = Math.max(max, r.bytes); });
    if (max <= 0) max = 1;
    var plotW = W - labelW - valueW;
    var svg = s("svg", {
      class: "lf-chart lf-hchart", viewBox: "0 0 " + W + " " + H,
      role: "img", "aria-label": title
    });
    rows.forEach(function (r, i) {
      var y = top + i * rowH;
      var label = s("text", { x: 0, y: y + 15, class: "lf-hlabel" });
      label.textContent = shorten(r.label, 28);
      svg.appendChild(label);
      var w = Math.max(r.bytes > 0 ? 2 : 0, r.bytes / max * plotW);
      svg.appendChild(s("rect", {
        x: labelW, y: y + 4, width: w.toFixed(2), height: rowH - 9,
        rx: 3, class: "lf-hbar"
      }));
      var value = s("text", { x: W - 4, y: y + 15, "text-anchor": "end", class: "lf-hvalue" });
      value.textContent = bytes(r.bytes);
      svg.appendChild(value);
    });
    block.appendChild(h("div", { class: "lf-chart-wrap" }, svg));
    return block;
  }

  function categoryRows(stats) {
    var rows = [];
    stats.byCat.forEach(function (row) {
      rows.push({ key: row.key, bytes: row.bytes, n: row.n, label: t("cat." + row.key) });
    });
    rows.sort(function (a, b) { return b.bytes - a.bytes; });
    return rows.slice(0, 10);
  }

  function sourceRows(stats) {
    var rows = [];
    stats.bySource.forEach(function (row) {
      rows.push({
        key: row.key, bytes: row.bytes, n: row.n,
        label: row.key === "other" ? t("report.otherSource") : t("source." + row.key)
      });
    });
    rows.sort(function (a, b) { return b.bytes - a.bytes; });
    return rows;
  }

  function renderReport(container) {
    container.textContent = "";
    var list = items();
    var root = h("div", { class: "lf-view lf-report" });
    root.appendChild(viewHead(t("view.report"), list.length
      ? t("report.sub", { n: num(list.length), size: bytes(list.reduce(function (a, it) { return a + (it.s || 0); }, 0)) })
      : ""));
    if (!list.length) {
      root.appendChild(emptyState("chart", t("report.empty.title"), t("report.empty.text")));
      container.appendChild(root);
      return;
    }

    var stats = reportStats(list);
    var pct = stats.totalBytes > 0 ? Math.round(stats.videosBytes / stats.totalBytes * 100) : 0;
    root.appendChild(h("div", { class: "lf-report-tiles" },
      statTile(t("report.total"), bytes(stats.totalBytes),
        t("report.totalSub", { n: num(stats.totalN) }), "photos"),
      statTile(t("report.videos"), pct + "%",
        t("v.nsize", { n: num(stats.videosN), size: bytes(stats.videosBytes) }), "video"),
      statTile(t("report.screenshots"), num(stats.shotsN),
        t("v.size", { size: bytes(stats.shotsBytes) }), "screenshot"),
      statTile(t("report.saved"), num(stats.savedN),
        t("v.size", { size: bytes(stats.savedBytes) }), "saved")));

    root.appendChild(yearChart(stats));
    root.appendChild(hbarChart(t("report.byCategory"), categoryRows(stats)));
    root.appendChild(hbarChart(t("report.bySource"), sourceRows(stats)));
    container.appendChild(root);
  }

  // ================================================================ settings
  var PRESET_ORDER = ["year_month", "year", "place", "person", "type", "source", "flat"];
  var FALLBACK_PRESETS = {
    year_month: "{year}/{month}", year: "{year}", place: "{country}/{city}",
    person: "{person}", type: "{type}", source: "{source}/{year}", flat: ""
  };
  var TOKEN_ORDER = ["year", "month", "day", "country", "region", "city", "person", "type", "source", "camera"];

  function normTemplate(value) {
    return String(value || "").trim().replace(/^\/+|\/+$/g, "");
  }

  function presetList(settings) {
    var raw = pick(settings, "presets", "presets");
    var out = [];
    if (Array.isArray(raw)) {
      raw.forEach(function (p) {
        var key = p.key || p.id || p.name;
        if (key) out.push({ key: key, template: p.template !== undefined ? p.template : (p.value || "") });
      });
    } else if (raw && typeof raw === "object") {
      var known = PRESET_ORDER.filter(function (k) { return Object.prototype.hasOwnProperty.call(raw, k); });
      var extra = Object.keys(raw).filter(function (k) { return known.indexOf(k) < 0; });
      known.concat(extra).forEach(function (k) { out.push({ key: k, template: raw[k] }); });
    }
    if (!out.length) {
      PRESET_ORDER.forEach(function (k) { out.push({ key: k, template: FALLBACK_PRESETS[k] }); });
    }
    return out;
  }

  function sampleTemplate(template) {
    if (!template) return t("set.flatPreview");
    var samples = {
      year: "2024", month: "06", day: "15", person: t("set.sample.person"),
      country: t("set.sample.country"), region: t("set.sample.region"), city: t("set.sample.city"),
      type: t("set.sample.type"), source: "WhatsApp", camera: "iPhone 15"
    };
    return String(template).replace(/\{([^}]+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(samples, key) ? samples[key] : match;
    });
  }

  function presetTitle(key) {
    var txt = t("preset." + key);
    return txt === "preset." + key ? key : txt;
  }

  function openSettings() {
    LF.api("/api/settings").then(function (settings) {
      showSettings(settings || {});
    }).catch(toastError);
  }

  function showSettings(settings) {
    var archive = String(pick(settings, "archive", "archivo") || "");
    var template0 = String(pick(settings, "template", "plantilla") || "");
    var xmp0 = !!pick(settings, "xmp", "xmp");
    var langRaw = String(pick(settings, "lang", "idioma") || "");
    var lang0 = (langRaw === "es" || langRaw === "en") ? langRaw : "auto";
    var presets = presetList(settings);
    var tokenRaw = pick(settings, "tokens", "marcadores");
    var tokens = Array.isArray(tokenRaw) && tokenRaw.length ? tokenRaw : TOKEN_ORDER.slice();

    var pathText = h("code", { class: "lf-set-path", text: archive || "—", title: archive || "" });
    var errBox = h("p", { class: "danger-text lf-set-error", hidden: true, role: "alert" });
    var root = h("div", { class: "lf-set" }, errBox);

    // ---- Save to
    var changeBtn = h("button", { class: "btn", type: "button" }, t("set.change"));
    changeBtn.addEventListener("click", function () {
      openFolderBrowser(archive, function (dir) {
        archive = dir;
        pathText.textContent = dir;
        pathText.title = dir;
      });
    });
    root.appendChild(h("section", { class: "lf-set-section" },
      h("h3", { class: "lf-set-heading", text: t("set.saveTo") }),
      h("div", { class: "lf-set-folder" }, iconSpan("folder"), pathText, changeBtn)));

    // ---- Organize folders
    var radioName = "lf-preset-" + Math.random().toString(36).slice(2);
    var input = h("input", { class: "field lf-template", type: "text", spellcheck: "false", value: template0 });
    var preview = h("div", { class: "lf-preview", "aria-live": "polite" });
    var activePreset = "custom";
    for (var p = 0; p < presets.length; p++) {
      if (normTemplate(presets[p].template) === normTemplate(template0)) {
        activePreset = presets[p].key;
        break;
      }
    }

    var presetRows = h("div", { class: "lf-presets", role: "radiogroup", "aria-label": t("set.organize") });
    presets.forEach(function (preset) {
      var radio = h("input", { type: "radio", name: radioName, value: preset.key });
      radio.checked = preset.key === activePreset;
      radio.addEventListener("change", function () {
        if (!radio.checked) return;
        activePreset = preset.key;
        input.value = String(preset.template || "");
        schedulePreview();
      });
      presetRows.appendChild(h("label", { class: "lf-preset" },
        radio,
        h("span", { class: "lf-preset-title", text: presetTitle(preset.key) }),
        h("code", { class: "lf-preset-path", text: presetTitle(preset.key) === t("preset.flat")
          ? t("set.flatPreview") : sampleTemplate(preset.template) })));
    });

    var customRadio = h("input", { type: "radio", name: radioName, value: "custom" });
    customRadio.checked = activePreset === "custom";
    customRadio.addEventListener("change", function () {
      if (customRadio.checked) {
        activePreset = "custom";
        input.focus();
      }
    });

    var tokenBar = h("div", { class: "lf-tokenbar" });
    tokens.forEach(function (token) {
      if (TOKEN_ORDER.indexOf(token) < 0) return;
      var chip = h("button", { class: "chip lf-token", type: "button", title: "{" + token + "}" },
        t("tok." + token));
      chip.addEventListener("click", function () {
        insertAtCursor(input, "{" + token + "}");
        setCustom();
      });
      tokenBar.appendChild(chip);
    });
    var slash = h("button", { class: "chip lf-token lf-token-slash", type: "button",
      "aria-label": t("tok.slash"), title: t("tok.slash") }, "/");
    slash.addEventListener("click", function () {
      insertAtCursor(input, "/");
      setCustom();
    });
    tokenBar.appendChild(slash);

    function setCustom() {
      activePreset = "custom";
      customRadio.checked = true;
    }

    input.addEventListener("input", function () {
      setCustom();
      schedulePreview();
    });

    var customBox = h("div", { class: "lf-custom" },
      h("label", { class: "lf-custom-head" }, customRadio,
        h("span", { class: "lf-preset-title", text: t("set.custom") })),
      h("p", { class: "lf-set-hint", text: t("set.tokenHint") }),
      tokenBar,
      input,
      h("div", { class: "lf-preview-head" }, h("span", { text: t("set.preview") })),
      preview);

    root.appendChild(h("section", { class: "lf-set-section" },
      h("h3", { class: "lf-set-heading", text: t("set.organize") }),
      h("p", { class: "lf-set-hint", text: t("set.organizeHint") }),
      presetRows,
      customBox));

    // ---- Live template preview (debounced)
    var timer = null, seq = 0, closed = false;

    function schedulePreview() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(runPreview, 250);
    }

    function renderPreviewContent(nodes) {
      preview.textContent = "";
      if (!nodes.length) {
        preview.appendChild(h("div", { class: "muted", text: t("set.previewEmpty") }));
        return;
      }
      nodes.forEach(function (node) { preview.appendChild(node); });
    }

    function runPreview() {
      if (closed) return;
      var my = ++seq;
      var value = input.value;
      renderPreviewContent([h("div", { class: "muted lf-preview-checking", text: t("set.checking") })]);
      LF.api("/api/template", { template: value }).then(function (res) {
        if (closed || my !== seq) return;
        var examples = (res && (res.examples || res.ejemplos)) || [];
        if (!examples.length) {
          renderPreviewContent([]);
          return;
        }
        renderPreviewContent(examples.map(function (example) {
          return h("div", { class: "lf-preview-row" }, iconSpan("folder"),
            h("code", { class: "lf-preview-path", text: example }));
        }));
      }).catch(function (err) {
        if (closed || my !== seq) return;
        renderPreviewContent([h("div", { class: "danger-text lf-preview-error", text: errorText(err) })]);
      });
    }

    // ---- XMP
    var xmpBox = h("input", { class: "toggle lf-toggle", type: "checkbox" });
    xmpBox.checked = xmp0;
    xmpBox.addEventListener("change", function () {
      var wanted = xmpBox.checked;
      LF.api("/api/settings", { xmp: wanted }).catch(function (err) {
        xmpBox.checked = !wanted;
        showError(err);
      });
    });
    root.appendChild(h("section", { class: "lf-set-section" },
      h("label", { class: "lf-set-toggle" },
        h("span", { class: "lf-set-toggle-text" },
          h("strong", { text: t("set.xmp") }),
          h("span", { class: "muted", text: t("set.xmpHint") })),
        xmpBox)));

    // ---- Language
    var langValue = lang0;
    var seg = h("div", { class: "segmented lf-lang", role: "group", "aria-label": t("set.language") });
    var langButtons = [];
    [["auto", t("set.auto")], ["es", "Español"], ["en", "English"]].forEach(function (pair) {
      var button = h("button", {
        class: pair[0] === langValue ? "on" : "", type: "button",
        "aria-pressed": pair[0] === langValue ? "true" : "false", text: pair[1]
      });
      button.addEventListener("click", function () {
        if (pair[0] === langValue) return;
        LF.api("/api/settings", { lang: pair[0] }).then(function (res) {
          var saved = res && res.lang;
          langValue = (saved === "es" || saved === "en" || saved === "auto") ? saved : pair[0];
          langButtons.forEach(function (b) {
            var on = b.dataset.lang === langValue;
            b.classList.toggle("on", on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
          });
          LF.emit("lang");
          LF.toast(t("set.languageChanged"));
        }).catch(function (err) {
          showError(err);
        });
      });
      button.dataset.lang = pair[0];
      langButtons.push(button);
      seg.appendChild(button);
    });
    root.appendChild(h("section", { class: "lf-set-section" },
      h("h3", { class: "lf-set-heading", text: t("set.language") }), seg));

    // ---- About
    var version = (LF.st && LF.st.app) || "";
    root.appendChild(h("section", { class: "lf-set-section lf-set-about" },
      h("h3", { class: "lf-set-heading", text: t("set.about") }),
      h("div", { class: "lf-about-name", text: "iCleaning" }),
      h("div", { class: "muted", text: t("set.version", { v: version }) }),
      h("div", { class: "muted", text: t("set.openSource") }),
      h("div", { class: "muted", text: t("set.notApple") })));

    function showError(err) {
      errBox.textContent = errorText(err);
      errBox.hidden = false;
      errBox.scrollIntoView({ block: "nearest" });
    }

    var sheet = null;
    function close() {
      closed = true;
      if (timer) clearTimeout(timer);
      if (sheet && sheet.close) sheet.close();
    }

    async function save() {
      errBox.hidden = true;
      try {
        await LF.api("/api/settings", { template: input.value, xmp: xmpBox.checked });
        LF.toast(t("set.saved"));
        close();
      } catch (err) {
        showError(err);
      }
      return false;
    }

    sheet = LF.openSheet({
      title: t("set.title"),
      body: root,
      buttons: [
        { label: t("set.cancel"), kind: "plain", run: close },
        { label: t("set.save"), kind: "primary", run: save }
      ],
      onClose: function () {
        closed = true;
        if (timer) clearTimeout(timer);
      }
    });

    runPreview();
  }

  function insertAtCursor(input, text) {
    var start = input.selectionStart === null ? input.value.length : input.selectionStart;
    var end = input.selectionEnd === null ? input.value.length : input.selectionEnd;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    var pos = start + text.length;
    input.focus();
    try { input.setSelectionRange(pos, pos); } catch (e) { /* ignore */ }
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // ---------------------------------------------------------------- folder browser
  function pathCrumbs(path) {
    var str = String(path || "");
    var win = /^[A-Za-z]:[\\/]/.test(str);
    var sep = str.indexOf("\\") >= 0 && str.indexOf("/") < 0 ? "\\" : "/";
    var parts = str.split(/[\\/]+/).filter(Boolean);
    var out = [], acc;
    if (win) {
      acc = parts.shift() + sep;
      out.push({ label: acc, path: acc });
    } else {
      acc = sep;
      out.push({ label: sep, path: sep });
    }
    parts.forEach(function (part) {
      acc = acc.charAt(acc.length - 1) === sep ? acc + part : acc + sep + part;
      out.push({ label: part, path: acc });
    });
    return { parts: out, sep: sep };
  }

  function joinPath(base, name) {
    var path = String(base || "");
    var sep = path.indexOf("\\") >= 0 && path.indexOf("/") < 0 ? "\\" : "/";
    if (!path) return name;
    return path.replace(/[\\/]+$/, "") + sep + name;
  }

  function shortcutLabel(id) {
    var map = {
      home: "set.folderHome", pictures: "set.folderPictures", desktop: "set.folderDesktop",
      imagenes: "set.folderPictures", escritorio: "set.folderDesktop"
    };
    return t(map[id] || "set.folderHome");
  }

  function openFolderBrowser(startPath, onChoose) {
    var body = h("div", { class: "lf-folder" });
    var currentPath = String(startPath || "");
    var sheet = null;

    var chooseButton = {
      label: t("set.chooseFolder"),
      kind: "primary",
      run: async function () {
        try {
          await LF.api("/api/settings", { archive: currentPath });
          LF.toast(t("set.archiveChanged"));
          if (onChoose) onChoose(currentPath);
          if (sheet && sheet.close) sheet.close();
        } catch (err) {
          toastError(err);
        }
        return false;
      }
    };

    function load(path) {
      body.textContent = "";
      body.appendChild(h("div", { class: "lf-folder-loading" },
        h("span", { class: "spinner" }), t("set.loading")));
      LF.api("/api/folders?path=" + encodeURIComponent(path || "")).then(function (res) {
        currentPath = String(pick(res, "path", "ruta") || path || "");
        render(res || {});
      }).catch(function (err) {
        body.textContent = "";
        body.appendChild(h("div", { class: "lf-folder-error danger-text", text: errorText(err) }));
      });
    }

    function render(res) {
      body.textContent = "";
      var parent = pick(res, "parent", "padre");
      var folders = pick(res, "folders", "carpetas") || [];
      var shortcuts = pick(res, "shortcuts", "atajos") || [];
      var volumes = pick(res, "volumes", "volumenes") || [];

      var crumbs = pathCrumbs(currentPath);
      var crumbRow = h("div", { class: "lf-crumbs" });
      if (parent) {
        var up = h("button", { class: "btn icon lf-crumb-up", type: "button",
          "aria-label": t("set.up"), title: t("set.up") }, iconSpan("chevron-left"));
        up.addEventListener("click", function () { load(parent); });
        crumbRow.appendChild(up);
      }
      crumbs.parts.forEach(function (part, i) {
        if (i) crumbRow.appendChild(h("span", { class: "lf-crumb-sep", text: crumbs.sep }));
        var b = h("button", { class: "btn plain lf-crumb", type: "button", text: part.label });
        b.addEventListener("click", function () { load(part.path); });
        crumbRow.appendChild(b);
      });
      body.appendChild(crumbRow);

      if (shortcuts.length) {
        var sc = h("div", { class: "lf-folder-shortcuts" });
        shortcuts.forEach(function (sct) {
          var p = pick(sct, "path", "ruta");
          if (!p) return;
          var b = h("button", { class: "chip lf-shortcut", type: "button" },
            iconSpan("folder"), shortcutLabel(sct.id));
          b.addEventListener("click", function () { load(p); });
          sc.appendChild(b);
        });
        body.appendChild(sc);
      }

      if (volumes.length) {
        body.appendChild(h("div", { class: "lf-folder-section-title", text: t("set.volumes") }));
        var vlist = h("div", { class: "list lf-volume-list" });
        volumes.forEach(function (vol) {
          var b = h("button", { class: "row lf-folder-row", type: "button" },
            iconSpan("drive"),
            h("span", { class: "lf-folder-name", text: String(vol) }),
            iconSpan("chevron-right", "lf-folder-chevron"));
          b.addEventListener("click", function () { load(vol); });
          vlist.appendChild(b);
        });
        body.appendChild(vlist);
      }

      body.appendChild(h("div", { class: "lf-folder-section-title", text: currentPath }));
      if (!folders.length) {
        body.appendChild(h("div", { class: "muted lf-folder-empty", text: t("set.noSubfolders") }));
      } else {
        var list = h("div", { class: "list lf-folder-list" });
        folders.forEach(function (name) {
          var b = h("button", { class: "row lf-folder-row", type: "button" },
            iconSpan("folder"),
            h("span", { class: "lf-folder-name", text: String(name) }),
            iconSpan("chevron-right", "lf-folder-chevron"));
          b.addEventListener("click", function () { load(joinPath(currentPath, name)); });
          list.appendChild(b);
        });
        body.appendChild(list);
      }
    }

    sheet = LF.openSheet({
      title: t("set.folderTitle"),
      body: body,
      buttons: [
        { label: t("set.cancel"), kind: "plain", run: function () { if (sheet && sheet.close) sheet.close(); } },
        chooseButton
      ]
    });
    load(currentPath);
  }

  LF.openSettings = openSettings;

  // ================================================================ registration
  LF.registerView("suggestions", {
    get title() { return t("view.suggestions"); },
    mount: function (container) {
      activate("suggestions", function () { renderSuggestions(container); });
      renderSuggestions(container);
    },
    unmount: function () { deactivate("suggestions"); }
  });

  LF.registerView("people", {
    get title() { return t("view.people"); },
    mount: function (container) {
      activate("people", function () { renderPeople(container); });
      renderPeople(container);
    },
    unmount: function () { deactivate("people"); }
  });

  LF.registerView("places", {
    get title() { return t("view.places"); },
    mount: function (container) {
      var expanded = new Set();
      var paint = function () { renderPlaces(container, expanded); };
      activate("places", paint);
      paint();
    },
    unmount: function () { deactivate("places"); }
  });

  LF.registerView("map", {
    get title() { return t("view.map"); },
    mount: function (container) {
      var view = mountMap(container);
      activate("map", view.render, view.cleanup);
      view.render();
    },
    unmount: function () { deactivate("map"); }
  });

  LF.registerView("report", {
    get title() { return t("view.report"); },
    mount: function (container) {
      activate("report", function () { renderReport(container); });
      renderReport(container);
    },
    unmount: function () { deactivate("report"); }
  });

  // Internal helpers exposed only when a test harness asks for them (LF.__testViews = true).
  if (LF.__testViews) {
    LF.__viewsInternals = {
      decodeTopology: decodeTopology,
      clusterPoints: clusterPoints,
      suggestionCards: suggestionCards,
      suggestionsFreeable: suggestionsFreeable,
      sampleTemplate: sampleTemplate,
      sourceOf: sourceOf
    };
  }
})();
