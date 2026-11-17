/* iCleaning — navigation and filters.
   Sidebar, search field with tokens and suggestions, filter popover, sort menu and the timeline.
   Implements the filters.js part of the UI contract (window.LF); see the UI specification. */
(function () {
  "use strict";

  const MB = 1024 * 1024;

  const STRINGS = {
    es: {
      "side.group.library": "Biblioteca",
      "side.group.people": "Personas y lugares",
      "side.group.media": "Tipos de contenido",
      "side.group.sources": "Orígenes",
      "side.group.utilities": "Utilidades",
      "side.all": "Todas las fotos",
      "side.photos": "Fotos",
      "side.suggestions": "Sugerencias de limpieza",
      "side.report": "Informe",
      "side.map": "Mapa",
      "side.people": "Personas",
      "side.places": "Lugares",
      "side.videos": "Vídeos",
      "side.selfies": "Selfis",
      "side.live": "Fotos Live",
      "side.portraits": "Retratos",
      "side.panoramas": "Panoramas",
      "side.slomo": "Cámara lenta",
      "side.timelapse": "Time-lapse",
      "side.screenshots": "Capturas de pantalla",
      "side.screenrec": "Grabaciones de pantalla",
      "side.camera": "Cámara",
      "side.whatsapp": "WhatsApp",
      "side.social": "Redes sociales",
      "side.messaging": "Mensajería",
      "side.airdrop": "AirDrop",
      "side.apps": "Otras apps",
      "side.duplicates": "Duplicadas",
      "side.similar": "Parecidas",
      "side.burst": "Ráfagas sin elegir",
      "side.poor": "Probablemente fallidas",
      "side.favorites": "Favoritas",
      "side.hidden": "Ocultas",
      "side.saved": "Guardadas en el PC",
      "side.unsaved": "Sin guardar",
      "side.total": "{n} elementos · {size}",
      "side.classifyTitle": "Ordena por personas y lugares",
      "side.classifyText": "Conecta el iPhone una vez por cable para ordenar por personas, lugares y apps.",
      "filters.button": "Filtros",
      "filters.reset": "Restablecer",
      "filters.kind": "Tipo",
      "filters.kind.all": "Todo",
      "filters.kind.photos": "Fotos",
      "filters.kind.videos": "Vídeos",
      "filters.any": "Cualquiera",
      "filters.size": "Tamaño mínimo",
      "filters.duration": "Duración del vídeo",
      "filters.duration.30": "> 30 s",
      "filters.duration.60": "> 1 min",
      "filters.duration.300": "> 5 min",
      "filters.lens": "Objetivo",
      "filters.lens.front": "Frontal",
      "filters.lens.main": "Principal",
      "filters.lens.ultra": "Ultra angular",
      "filters.lens.tele": "Tele",
      "filters.camera": "Cámara",
      "filters.camera.all": "Todas las cámaras",
      "filters.saved": "Guardadas en el PC",
      "filters.saved.all": "Todas",
      "filters.saved.yes": "Guardadas",
      "filters.saved.no": "Sin guardar",
      "sort.button": "Ordenar",
      "sort.size": "Más grandes primero",
      "sort.new": "Más recientes",
      "sort.old": "Más antiguas",
      "sort.dur": "Vídeos más largos",
      "sort.quality": "Menor calidad",
      "search.placeholder": "Buscar personas, lugares, fechas…",
      "search.remove": "Quitar {name}",
      "sug.people": "Personas",
      "sug.pets": "Mascotas",
      "sug.places": "Lugares",
      "sug.moments": "Momentos",
      "sug.dates": "Fechas",
      "sug.categories": "Tipos y orígenes",
      "sug.cameras": "Cámaras",
      "sug.files": "Archivos llamados «{q}»",
      "timeline.range": "{from} – {to}",
      "timeline.clear": "Quitar rango",
      "timeline.label": "Línea de tiempo",
      "timeline.hint": "Arrastra para elegir un periodo",
      "act.selectAllButBest": "Seleccionar todas menos la mejor",
    },
    en: {
      "side.group.library": "Library",
      "side.group.people": "People & Places",
      "side.group.media": "Media Types",
      "side.group.sources": "Sources",
      "side.group.utilities": "Utilities",
      "side.all": "All photos",
      "side.photos": "Photos",
      "side.suggestions": "Cleanup Suggestions",
      "side.report": "Report",
      "side.map": "Map",
      "side.people": "People",
      "side.places": "Places",
      "side.videos": "Videos",
      "side.selfies": "Selfies",
      "side.live": "Live Photos",
      "side.portraits": "Portraits",
      "side.panoramas": "Panoramas",
      "side.slomo": "Slo-mo",
      "side.timelapse": "Time-lapse",
      "side.screenshots": "Screenshots",
      "side.screenrec": "Screen recordings",
      "side.camera": "Camera",
      "side.whatsapp": "WhatsApp",
      "side.social": "Social media",
      "side.messaging": "Messaging",
      "side.airdrop": "AirDrop",
      "side.apps": "Other apps",
      "side.duplicates": "Duplicates",
      "side.similar": "Similar",
      "side.burst": "Unpicked burst photos",
      "side.poor": "Probably failed",
      "side.favorites": "Favorites",
      "side.hidden": "Hidden",
      "side.saved": "Saved on PC",
      "side.unsaved": "Not saved",
      "side.total": "{n} items · {size}",
      "side.classifyTitle": "Sort by people and places",
      "side.classifyText": "Connect your iPhone once with the cable to sort by people, places and apps.",
      "filters.button": "Filters",
      "filters.reset": "Reset",
      "filters.kind": "Kind",
      "filters.kind.all": "All",
      "filters.kind.photos": "Photos",
      "filters.kind.videos": "Videos",
      "filters.any": "Any",
      "filters.size": "Minimum size",
      "filters.duration": "Video length",
      "filters.duration.30": "> 30 s",
      "filters.duration.60": "> 1 min",
      "filters.duration.300": "> 5 min",
      "filters.lens": "Lens",
      "filters.lens.front": "Front",
      "filters.lens.main": "Main",
      "filters.lens.ultra": "Ultra wide",
      "filters.lens.tele": "Tele",
      "filters.camera": "Camera",
      "filters.camera.all": "All cameras",
      "filters.saved": "Saved on PC",
      "filters.saved.all": "All",
      "filters.saved.yes": "Saved",
      "filters.saved.no": "Not saved",
      "sort.button": "Sort",
      "sort.size": "Largest first",
      "sort.new": "Newest",
      "sort.old": "Oldest",
      "sort.dur": "Longest videos",
      "sort.quality": "Lowest quality",
      "search.placeholder": "Search people, places, dates…",
      "search.remove": "Remove {name}",
      "sug.people": "People",
      "sug.pets": "Pets",
      "sug.places": "Places",
      "sug.moments": "Moments",
      "sug.dates": "Dates",
      "sug.categories": "Media types & sources",
      "sug.cameras": "Cameras",
      "sug.files": "Files named “{q}”",
      "timeline.range": "{from} – {to}",
      "timeline.clear": "Clear range",
      "timeline.label": "Timeline",
      "timeline.hint": "Drag to select a period",
      "act.selectAllButBest": "Select all but the best",
    },
  };

  /* ---------------------------------------------------------------- state */

  const S = {
    query: "",          // free text typed in the search field
    tokens: [],         // AND-combined chips: {type, ...}
    kind: "all",        // all | photo | video
    minSize: 0,         // bytes
    minDur: 0,          // seconds, videos only
    lens: null,         // front | main | ultra | tele
    camera: null,       // index into meta.cameras
    saved: "all",       // all | yes | no
    sort: null,         // size | new | old | dur | quality, null = scope default
    range: null,        // {a, b} absolute month keys, inclusive
    activeKey: null,    // sidebar row highlighted
    si: -1,             // highlighted suggestion index
  };

  let idx = null;            // WeakMap item -> search entry
  let stats = null;          // one-pass aggregates
  let meta = { people: [], places: [], cameras: [], moments: [] };
  let hist = { keys: [], sums: [], max: 0 };
  let els = { sidebar: null, toolbar: null, timeline: null };
  let openPop = null;
  let monthFmt = null;
  let suggestOpen = false;
  let suggestRows = [];      // flat list of rendered suggestions (for keyboards)
  let dragging = false;

  /* -------------------------------------------------------------- helpers */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function norm(s) {
    return String(s == null ? "" : s)
      .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }

  function hasCat(it, c) { return !!(it.c && it.c.indexOf(c) >= 0); }

  function monthOf(d) {
    const t = new Date((d || 0) * 1000);
    return t.getFullYear() * 12 + t.getMonth();
  }

  function yearOf(d) { return new Date((d || 0) * 1000).getFullYear(); }

  function metaPeople() { return (meta && meta.people) || []; }
  function metaPlaces() { return (meta && meta.places) || []; }
  function metaCameras() { return (meta && meta.cameras) || []; }
  function metaMoments() { return (meta && meta.moments) || []; }

  /* Month names in both languages so «junio 2024» and «June 2024» both work. */
  const MONTH_SETS = {
    es: [["enero", "ene"], ["febrero", "feb"], ["marzo", "mar"], ["abril", "abr"],
         ["mayo", "may"], ["junio", "jun"], ["julio", "jul"], ["agosto", "ago"],
         ["septiembre", "setiembre", "sep", "sept"], ["octubre", "oct"], ["noviembre", "nov"], ["diciembre", "dic"]],
    en: [["january", "jan"], ["february", "feb"], ["march", "mar"], ["april", "apr"],
         ["may", "may"], ["june", "jun"], ["july", "jul"], ["august", "aug"],
         ["september", "sept", "sep"], ["october", "oct"], ["november", "nov"], ["december", "dec"]],
  };

  const MONTH_LOOKUP = (function () {
    const m = new Map();
    ["es", "en"].forEach(function (lang) {
      MONTH_SETS[lang].forEach(function (names, i) {
        names.forEach(function (n) { if (!m.has(n)) m.set(n, i); });
      });
    });
    return m;
  })();

  function parseMonthQuery(text) {
    const q = norm(text);
    if (!q) return null;
    const words = q.split(/\s+/).filter(function (w) {
      return w && w !== "de" && w !== "del" && w !== "of";
    });
    if (!words.length) return null;
    if (words.length === 1 && /^\d{4}$/.test(words[0])) {
      return { month: null, year: parseInt(words[0], 10) };
    }
    let month = MONTH_LOOKUP.has(words[0]) ? MONTH_LOOKUP.get(words[0]) : null;
    if (month == null) {
      // Accept a prefix of a month name once it is unambiguous (3+ letters).
      if (words[0].length >= 3) {
        const found = new Set();
        MONTH_LOOKUP.forEach(function (i, name) { if (name.indexOf(words[0]) === 0) found.add(i); });
        if (found.size === 1) month = found.values().next().value;
      }
    }
    if (month == null) return null;
    const year = words.length > 1 && /^\d{4}$/.test(words[1]) ? parseInt(words[1], 10) : null;
    return { month: month, year: year };
  }

  function makeMonthFmt() {
    try {
      monthFmt = new Intl.DateTimeFormat(window.LF && window.LF.lang === "es" ? "es-ES" : "en-US",
                                         { month: "short" });
    } catch (e) { monthFmt = null; }
  }

  function monthName(m) {
    if (monthFmt) return monthFmt.format(new Date(2020, m, 1)).replace(/\./g, "");
    return String(m + 1);
  }

  function fmtMonthKey(k) {
    return monthName(((k % 12) + 12) % 12) + " " + Math.floor(k / 12);
  }

  /* --------------------------------------------------- library aggregation */

  function refreshMeta() {
    const m = (window.LF && window.LF.meta) || {};
    meta = {
      people: m.people || [],
      places: m.places || [],
      cameras: m.cameras || [],
      moments: m.moments || [],
    };
  }

  function rebuildData() {
    refreshMeta();
    const items = (window.LF && window.LF.items) || [];
    idx = new WeakMap();
    stats = {
      total: items.length,
      bytes: 0,
      years: new Map(),
      months: new Map(),
      monthCounts: new Map(),
      kinds: { photo: 0, video: 0 },
      cats: new Map(),
      people: new Map(),
      places: new Map(),
      moments: new Map(),
      cameras: new Map(),
      rows: {},
      hasGeo: false,
      peopleBytes: 0,
      placesBytes: 0,
    };

    const peopleNorm = new Map();
    metaPeople().forEach(function (p) {
      peopleNorm.set(p.id, norm(p.name));
    });
    const momentsNorm = metaMoments().map(function (mo) {
      return norm((mo && mo[0]) || "") + " " + norm((mo && mo[1]) || "");
    });

    const rows = typeof ROWS !== "undefined" ? ROWS : [];
    rows.forEach(function (r) { stats.rows[r.id] = { n: 0, bytes: 0 }; });

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const s = it.s || 0;
      const month = it.d ? monthOf(it.d) : -1;
      const year = it.d ? yearOf(it.d) : 0;
      const pl = it.pl != null && meta.places[it.pl] ? meta.places[it.pl] : null;
      const entry = {
        name: norm(it.n),
        people: [],
        place: pl ? [norm(pl[0] || ""), norm(pl[1] || ""), norm(pl[2] || "")] : null,
        moment: it.m != null && momentsNorm[it.m] != null ? momentsNorm[it.m] : "",
        year: year,
        month: month,
      };
      if (it.p && it.p.length) {
        for (let j = 0; j < it.p.length; j++) {
          const n = peopleNorm.get(it.p[j]);
          if (n) entry.people.push(n);
        }
      }
      idx.set(it, entry);

      stats.bytes += s;
      if (it.k === "photo" || it.k === "video") stats.kinds[it.k]++;
      stats.years.set(year, (stats.years.get(year) || 0) + 1);
      if (month >= 0) {
        stats.months.set(month, (stats.months.get(month) || 0) + s);
        stats.monthCounts.set(month, (stats.monthCounts.get(month) || 0) + 1);
      }
      if (it.geo) stats.hasGeo = true;
      if (it.p && it.p.length) stats.peopleBytes += s;
      if (pl) stats.placesBytes += s;

      if (it.c) {
        for (let j = 0; j < it.c.length; j++) {
          stats.cats.set(it.c[j], (stats.cats.get(it.c[j]) || 0) + 1);
        }
      }
      if (it.p) {
        for (let j = 0; j < it.p.length; j++) {
          stats.people.set(it.p[j], (stats.people.get(it.p[j]) || 0) + 1);
        }
      }
      if (it.pl != null) stats.places.set(it.pl, (stats.places.get(it.pl) || 0) + 1);
      if (it.m != null) stats.moments.set(it.m, (stats.moments.get(it.m) || 0) + 1);
      if (it.cam != null) stats.cameras.set(it.cam, (stats.cameras.get(it.cam) || 0) + 1);

      for (let j = 0; j < rows.length; j++) {
        const r = rows[j];
        if (r.match && r.match(it)) {
          const acc = stats.rows[r.id];
          acc.n++;
          acc.bytes += s;
        }
      }
    }
    const agg = { country: new Map(), region: new Map(), city: new Map() };
    meta.places.forEach(function (pl, i) {
      const n = stats.places.get(i) || 0;
      if (!n) return;
      ["country", "region", "city"].forEach(function (type, j) {
        const v = norm(pl[j] || "");
        if (!v) return;
        const key = type + "|" + v;
        agg[type].set(key, (agg[type].get(key) || 0) + n);
      });
    });
    stats.placeAgg = agg;
    rebuildHist();
  }

  /* Timeline histogram: current scope only, aggregated by calendar month. */
  function scopePredicate() {
    const sc = window.LF && window.LF.scope;
    return sc && typeof sc.filter === "function" ? sc.filter : null;
  }

  function rebuildHist() {
    const items = (window.LF && window.LF.items) || [];
    const filter = scopePredicate();
    const sums = new Map();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (filter && !filter(it)) continue;
      if (!it.d) continue;
      const k = monthOf(it.d);
      sums.set(k, (sums.get(k) || 0) + (it.s || 0));
    }
    let keys = [];
    if (sums.size) {
      let lo = Infinity, hi = -Infinity;
      sums.forEach(function (_v, k) { if (k < lo) lo = k; if (k > hi) hi = k; });
      for (let k = lo; k <= hi; k++) keys.push(k);
    }
    hist.keys = keys;
    hist.sums = keys.map(function (k) { return sums.get(k) || 0; });
    hist.max = hist.sums.reduce(function (a, b) { return Math.max(a, b); }, 0);
    if (keys.length < 2 && S.range) S.range = null;
    clampRange();
  }

  function clampRange() {
    if (!S.range || !hist.keys.length) { S.range = null; return; }
    const lo = hist.keys[0], hi = hist.keys[hist.keys.length - 1];
    const a = Math.max(S.range.a, lo), b = Math.min(S.range.b, hi);
    if (a > b) S.range = null;
    else S.range = { a: a, b: b };
  }

  /* ------------------------------------------------------------ predicate */

  function tokenMatches(it, entry, tok) {
    switch (tok.type) {
      case "person":
      case "pet":
        return !!(it.p && it.p.indexOf(tok.id) >= 0);
      case "place": {
        if (!entry.place) return false;
        const j = tok.field === "country" ? 0 : tok.field === "region" ? 1 : 2;
        return entry.place[j] === tok.value;
      }
      case "moment":
        return it.m === tok.m;
      case "cat":
        if (tok.cat === "video") return it.k === "video";
        if (tok.cat === "photo") return it.k === "photo";
        return hasCat(it, tok.cat);
      case "camera":
        return it.cam === tok.cam;
      case "year":
        return entry.year === tok.year;
      case "month":
        return entry.month === tok.year * 12 + tok.month;
      default:
        return true;
    }
  }

  function queryMatches(entry, q) {
    if (entry.name.indexOf(q) >= 0) return true;
    for (let i = 0; i < entry.people.length; i++) {
      if (entry.people[i].indexOf(q) >= 0) return true;
    }
    if (entry.place) {
      for (let i = 0; i < entry.place.length; i++) {
        if (entry.place[i] && entry.place[i].indexOf(q) >= 0) return true;
      }
    }
    if (entry.moment && entry.moment.indexOf(q) >= 0) return true;
    return false;
  }

  let queryNormCache = { text: null, value: "" };

  function normQuery() {
    if (S.query !== queryNormCache.text) {
      queryNormCache = { text: S.query, value: norm(S.query) };
    }
    return queryNormCache.value;
  }

  function refinePredicate(it) {
    if (S.kind !== "all" && it.k !== S.kind) return false;
    if (S.minSize && (it.s || 0) < S.minSize) return false;
    if (S.minDur && it.k === "video" && (it.dur || 0) < S.minDur) return false;
    if (S.lens && it.lens !== S.lens) return false;
    if (S.camera != null && it.cam !== S.camera) return false;
    if (S.saved === "yes" && !it.sv) return false;
    if (S.saved === "no" && it.sv) return false;

    const entry = idx ? idx.get(it) : null;
    if (S.tokens.length) {
      for (let i = 0; i < S.tokens.length; i++) {
        if (!tokenMatches(it, entry || {}, S.tokens[i])) return false;
      }
    }
    if (S.query) {
      if (!entry) return false;
      if (!queryMatches(entry, normQuery())) return false;
    }
    if (S.range) {
      if (!entry || entry.month < S.range.a || entry.month > S.range.b) return false;
    }
    return true;
  }

  function groupCount() {
    let n = 0;
    if (S.kind !== "all") n++;
    if (S.minSize) n++;
    if (S.minDur) n++;
    if (S.lens) n++;
    if (S.camera != null) n++;
    if (S.saved !== "all") n++;
    return n;
  }

  function refinementCount() {
    return groupCount() + S.tokens.length + (S.query.trim() ? 1 : 0) + (S.range ? 1 : 0);
  }

  function syncRefine() {
    const api = window.LF;
    if (!api) return;
    if (!api.refine) api.refine = {};
    api.refine.predicate = refinePredicate;
    api.refine.sort = S.sort;
    api.refine.count = refinementCount();
    api.refine.reset = resetRefinements;
  }

  function changed() {
    syncRefine();
    updateBadge();
    if (window.LF) window.LF.emit("filters");
  }

  function resetFilters() {
    S.kind = "all";
    S.minSize = 0;
    S.minDur = 0;
    S.lens = null;
    S.camera = null;
    S.saved = "all";
    renderFiltersPopover();
    changed();
  }

  function resetRefinements() {
    S.query = "";
    S.tokens = [];
    S.kind = "all";
    S.minSize = 0;
    S.minDur = 0;
    S.lens = null;
    S.camera = null;
    S.saved = "all";
    S.sort = null;
    S.range = null;
    const input = els.toolbar && els.toolbar.querySelector(".lf-search-input");
    if (input) input.value = "";
    renderTokens();
    renderSortButton();
    renderTimeline();
    closeSuggest();
    if (openPop && openPop.classList.contains("lf-filters-pop")) renderFiltersPopover();
    changed();
  }

  /* ---------------------------------------------------------- suggestions */

  const CAT_TOKENS = [
    { cat: "video", key: "side.videos", icon: "video" },
    { cat: "photo", key: "side.photos", icon: "photos" },
    { cat: "selfie", key: "side.selfies", icon: "selfie" },
    { cat: "live", key: "side.live", icon: "live" },
    { cat: "portrait", key: "side.portraits", icon: "portrait" },
    { cat: "panorama", key: "side.panoramas", icon: "panorama" },
    { cat: "slomo", key: "side.slomo", icon: "slomo" },
    { cat: "timelapse", key: "side.timelapse", icon: "timelapse" },
    { cat: "screenshot", key: "side.screenshots", icon: "screenshot" },
    { cat: "screen_recording", key: "side.screenrec", icon: "screenrec" },
    { cat: "camera", key: "side.camera", icon: "camera" },
    { cat: "whatsapp", key: "side.whatsapp", icon: "chat" },
    { cat: "social", key: "side.social", icon: "social" },
    { cat: "messaging", key: "side.messaging", icon: "messaging" },
    { cat: "airdrop", key: "side.airdrop", icon: "airdrop" },
    { cat: "other_apps", key: "side.apps", icon: "apps" },
    { cat: "duplicate", key: "side.duplicates", icon: "duplicate" },
    { cat: "similar", key: "side.similar", icon: "similar" },
    { cat: "burst", key: "side.burst", icon: "burst" },
    { cat: "poor", key: "side.poor", icon: "poor" },
    { cat: "favorite", key: "side.favorites", icon: "heart" },
    { cat: "hidden", key: "side.hidden", icon: "hidden" },
  ];

  function t(key, params) {
    return window.LF ? window.LF.t(key, params) : key;
  }

  function fmtNum(n) {
    return window.LF ? window.LF.fmtNum(n) : String(n);
  }

  function catCount(c) {
    if (!stats) return 0;
    if (c === "video" || c === "photo") return stats.kinds[c] || 0;
    return stats.cats.get(c) || 0;
  }

  function placeLabels(pl) {
    const out = [];
    ["country", "region", "city"].forEach(function (type, j) {
      const value = (pl && pl[j]) || "";
      if (!value) return;
      if (type === "country") out.push({ field: type, value: value, meta: "" });
      else if (type === "region") out.push({ field: type, value: value, meta: pl[0] || "" });
      else out.push({ field: type, value: value, meta: [pl[1], pl[0]].filter(Boolean).join(", ") });
    });
    return out;
  }

  function groupSuggestionRows(titleKey, rows, limit) {
    if (!rows.length) return null;
    rows.sort(function (a, b) { return (b.count || 0) - (a.count || 0); });
    return { title: t(titleKey), rows: rows.slice(0, limit || 8) };
  }

  function buildSuggestions(raw) {
    const groups = [];
    if (!stats) return groups;
    const q = norm(raw);
    if (!q) return groups;

    // People and pets.
    const persons = [], pets = [];
    metaPeople().forEach(function (p) {
      const name = norm(p.name);
      if (!name || name.indexOf(q) < 0) return;
      const n = stats.people.get(p.id) || 0;
      if (!n) return;
      const row = {
        kind: p.kind === "person" ? "person" : "pet",
        id: p.id, label: p.name, meta: fmtNum(n), count: n,
        icon: p.kind === "person" ? "person" : "paw",
      };
      (row.kind === "person" ? persons : pets).push(row);
    });
    const gPeople = groupSuggestionRows("sug.people", persons);
    if (gPeople) groups.push(gPeople);
    const gPets = groupSuggestionRows("sug.pets", pets);
    if (gPets) groups.push(gPets);

    // Places: countries, regions and cities, deduplicated.
    const seen = new Set();
    const places = [];
    metaPlaces().forEach(function (pl) {
      placeLabels(pl).forEach(function (e) {
        const nv = norm(e.value);
        const key = e.field + "|" + nv;
        if (seen.has(key)) return;
        seen.add(key);
        if (nv.indexOf(q) < 0) return;
        const count = (stats.placeAgg[e.field].get(key) || 0);
        if (!count) return;
        places.push({
          kind: "place", field: e.field, value: nv, label: e.value,
          meta: e.meta, count: count, icon: "pin",
        });
      });
    });
    const gPlaces = groupSuggestionRows("sug.places", places);
    if (gPlaces) groups.push(gPlaces);

    // Moments.
    const moments = [];
    metaMoments().forEach(function (mo, i) {
      const title = (mo && mo[0]) || "";
      if (!title || norm(title).indexOf(q) < 0) return;
      const n = stats.moments.get(i) || 0;
      if (!n) return;
      moments.push({
        kind: "moment", m: i, label: title, count: n, meta: fmtNum(n),
        icon: "star", sub: (mo && mo[1]) || "",
      });
    });
    const gMoments = groupSuggestionRows("sug.moments", moments);
    if (gMoments) groups.push(gMoments);

    // Dates: years present, plus «June 2024» when a month name is typed.
    const parsed = parseMonthQuery(raw);
    const dates = [];
    const years = Array.from(stats.years.keys()).sort(function (a, b) { return b - a; });
    if (parsed && parsed.month != null) {
      const list = parsed.year != null ? [parsed.year] : years;
      list.forEach(function (y) {
        if (!stats.years.has(y)) return;
        const key = y * 12 + parsed.month;
        const n = stats.monthCounts.get(key) || 0;
        if (!n) return;
        dates.push({
          kind: "month", year: y, month: parsed.month, count: n, meta: fmtNum(n),
          label: monthName(parsed.month) + " " + y, icon: "calendar",
        });
      });
    } else if (parsed && parsed.month == null) {
      const y = parsed.year;
      if (stats.years.has(y)) {
        dates.push({
          kind: "year", year: y, count: stats.years.get(y), meta: fmtNum(stats.years.get(y)),
          label: String(y), icon: "calendar",
        });
      }
    } else if (/^\d+$/.test(q)) {
      years.forEach(function (y) {
        if (String(y).indexOf(q) < 0) return;
        dates.push({
          kind: "year", year: y, count: stats.years.get(y), meta: fmtNum(stats.years.get(y)),
          label: String(y), icon: "calendar",
        });
      });
    }
    if (dates.length) groups.push({ title: t("sug.dates"), rows: dates.slice(0, 8) });

    // Category labels (media types and sources).
    const cats = [];
    CAT_TOKENS.forEach(function (c) {
      const label = t(c.key);
      if (norm(label).indexOf(q) < 0 && c.cat.indexOf(q) < 0) return;
      const n = catCount(c.cat);
      if (!n) return;
      cats.push({
        kind: "cat", cat: c.cat, label: label, count: n, meta: fmtNum(n), icon: c.icon,
      });
    });
    const gCats = groupSuggestionRows("sug.categories", cats);
    if (gCats) groups.push(gCats);

    // Cameras.
    const cams = [];
    metaCameras().forEach(function (name, i) {
      if (norm(name).indexOf(q) < 0) return;
      const n = stats.cameras.get(i) || 0;
      if (!n) return;
      cams.push({
        kind: "camera", cam: i, label: name, count: n, meta: fmtNum(n), icon: "camera",
      });
    });
    const gCams = groupSuggestionRows("sug.cameras", cams);
    if (gCams) groups.push(gCams);

    // «Files named …» is always the last choice.
    groups.push({
      title: "",
      rows: [{ kind: "file", label: t("sug.files", { q: raw.trim() }), icon: "folder", meta: "" }],
    });
    return groups;
  }

  function tokenKey(tok) {
    return [tok.type, tok.id != null ? tok.id : "", tok.cat || "", tok.field || "",
            tok.value || "", tok.year != null ? tok.year : "", tok.month != null ? tok.month : "",
            tok.m != null ? tok.m : "", tok.cam != null ? tok.cam : ""].join("|");
  }

  function addToken(tok) {
    const key = tokenKey(tok);
    if (!S.tokens.some(function (x) { return tokenKey(x) === key; })) S.tokens.push(tok);
  }

  function pickSuggestion(row) {
    if (!row) return;
    if (row.kind === "file") {
      // Free text already searches file names; keep it and just close the dropdown.
      closeSuggest();
      return;
    }
    switch (row.kind) {
      case "person":
      case "pet":
        addToken({ type: row.kind, id: row.id, label: row.label });
        break;
      case "place":
        addToken({ type: "place", field: row.field, value: row.value, label: row.label });
        break;
      case "moment":
        addToken({ type: "moment", m: row.m, label: row.label });
        break;
      case "cat":
        addToken({ type: "cat", cat: row.cat, label: row.label });
        break;
      case "camera":
        addToken({ type: "camera", cam: row.cam, label: row.label });
        break;
      case "year":
        addToken({ type: "year", year: row.year, label: row.label });
        break;
      case "month":
        addToken({ type: "month", year: row.year, month: row.month, label: row.label });
        break;
      default:
        break;
    }
    const input = searchInput();
    if (input) {
      input.value = "";
      if (input.focus) input.focus();
    }
    S.query = "";
    S.si = -1;
    renderTokens();
    closeSuggest();
    changed();
  }

  function searchInput() {
    return els.toolbar ? els.toolbar.querySelector(".lf-search-input") : null;
  }

  function suggestBox() {
    return els.toolbar ? els.toolbar.querySelector(".lf-suggest") : null;
  }

  function renderSuggestions() {
    const box = suggestBox();
    if (!box) return;
    const input = searchInput();
    const raw = input ? input.value : S.query;
    const groups = buildSuggestions(raw);
    S.si = -1;
    suggestRows = [];
    if (!raw.trim() || !groups.length) {
      box.hidden = true;
      suggestOpen = false;
      box.innerHTML = "";
      return;
    }
    let i = 0;
    let html = "";
    groups.forEach(function (g) {
      html += '<div class="lf-sg">';
      if (g.title) html += '<div class="lf-sg-h">' + esc(g.title) + "</div>";
      g.rows.forEach(function (row) {
        suggestRows.push(row);
        html += '<button type="button" class="lf-srow" role="option" data-i="' + i + '"' +
          ' aria-selected="false">' +
          '<span class="icon lf-sico">' + (window.LF ? window.LF.icon(row.icon) : "") + "</span>" +
          '<span class="lf-sl">' + esc(row.label) + "</span>" +
          (row.sub ? '<span class="lf-ssub">' + esc(row.sub) + "</span>" : "") +
          (row.meta ? '<span class="lf-sm">' + esc(row.meta) + "</span>" : "") +
          "</button>";
        i++;
      });
      html += "</div>";
    });
    box.innerHTML = html;
    box.hidden = false;
    suggestOpen = true;
    if (input) input.setAttribute("aria-expanded", "true");
  }

  function closeSuggest() {
    const box = suggestBox();
    if (box) { box.hidden = true; box.innerHTML = ""; }
    suggestOpen = false;
    suggestRows = [];
    S.si = -1;
    const input = searchInput();
    if (input) input.setAttribute("aria-expanded", "false");
  }

  function highlightSuggestion(next) {
    const box = suggestBox();
    if (!box || !suggestRows.length) return;
    S.si = Math.max(0, Math.min(suggestRows.length - 1, next));
    const all = box.querySelectorAll(".lf-srow");
    for (let i = 0; i < all.length; i++) {
      const on = Number(all[i].getAttribute("data-i")) === S.si;
      all[i].classList.toggle("on", on);
      all[i].setAttribute("aria-selected", on ? "true" : "false");
    }
    const el = box.querySelector('.lf-srow[data-i="' + S.si + '"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }

  /* -------------------------------------------------------------- toolbar */

  const SORTS = [
    { v: "size", key: "sort.size" },
    { v: "new", key: "sort.new" },
    { v: "old", key: "sort.old" },
    { v: "dur", key: "sort.dur" },
    { v: "quality", key: "sort.quality" },
  ];

  function popOptions(group) {
    if (group === "kind") {
      return [
        { v: "all", label: t("filters.kind.all") },
        { v: "photo", label: t("filters.kind.photos") },
        { v: "video", label: t("filters.kind.videos") },
      ];
    }
    if (group === "size") {
      return [
        { v: 0, label: t("filters.any") },
        { v: 5 * MB, label: "5 MB" },
        { v: 20 * MB, label: "20 MB" },
        { v: 50 * MB, label: "50 MB" },
        { v: 100 * MB, label: "100 MB" },
        { v: 300 * MB, label: "300 MB" },
        { v: 1024 * MB, label: "1 GB" },
      ];
    }
    if (group === "dur") {
      return [
        { v: 0, label: t("filters.any") },
        { v: 30, label: t("filters.duration.30") },
        { v: 60, label: t("filters.duration.60") },
        { v: 300, label: t("filters.duration.300") },
      ];
    }
    if (group === "lens") {
      return [
        { v: null, label: t("filters.any") },
        { v: "front", label: t("filters.lens.front") },
        { v: "main", label: t("filters.lens.main") },
        { v: "ultra", label: t("filters.lens.ultra") },
        { v: "tele", label: t("filters.lens.tele") },
      ];
    }
    if (group === "saved") {
      return [
        { v: "all", label: t("filters.saved.all") },
        { v: "yes", label: t("filters.saved.yes") },
        { v: "no", label: t("filters.saved.no") },
      ];
    }
    return [];
  }

  function currentValue(group) {
    if (group === "kind") return S.kind;
    if (group === "size") return S.minSize;
    if (group === "dur") return S.minDur;
    if (group === "lens") return S.lens;
    if (group === "saved") return S.saved;
    return null;
  }

  function segmented(group) {
    const opts = popOptions(group);
    const value = currentValue(group);
    let h = '<div class="segmented lf-seg" role="group">';
    opts.forEach(function (o, i) {
      h += '<button type="button" class="' + (o.v === value ? "on" : "") + '" data-g="' +
           group + '" data-i="' + i + '">' + esc(o.label) + "</button>";
    });
    return h + "</div>";
  }

  function renderFiltersPopover() {
    const pop = els.toolbar && els.toolbar.querySelector(".lf-filters-pop");
    if (!pop) return;
    const cameras = metaCameras();
    let h = '<div class="lf-pop-title">' + esc(t("filters.button")) + "</div>";
    h += '<div class="lf-fgroup"><div class="lf-fglabel">' + esc(t("filters.kind")) + "</div>" +
         segmented("kind") + "</div>";
    h += '<div class="lf-fgroup"><div class="lf-fglabel">' + esc(t("filters.size")) + "</div>" +
         segmented("size") + "</div>";
    h += '<div class="lf-fgroup"><div class="lf-fglabel">' + esc(t("filters.duration")) + "</div>" +
         segmented("dur") + "</div>";
    h += '<div class="lf-fgroup"><div class="lf-fglabel">' + esc(t("filters.lens")) + "</div>" +
         segmented("lens") + "</div>";
    h += '<div class="lf-fgroup"><div class="lf-fglabel">' + esc(t("filters.camera")) + "</div>" +
         '<select class="field lf-camera" aria-label="' + esc(t("filters.camera")) + '">' +
         '<option value="">' + esc(t("filters.camera.all")) + "</option>";
    cameras.forEach(function (name, i) {
      h += '<option value="' + i + '"' + (S.camera === i ? " selected" : "") + ">" + esc(name) + "</option>";
    });
    h += "</select></div>";
    h += '<div class="lf-fgroup"><div class="lf-fglabel">' + esc(t("filters.saved")) + "</div>" +
         segmented("saved") + "</div>";
    h += '<div class="lf-pop-foot"><button type="button" class="btn plain lf-freset">' +
         esc(t("filters.reset")) + "</button></div>";
    pop.innerHTML = h;
  }

  function renderSortPopover() {
    const pop = els.toolbar && els.toolbar.querySelector(".lf-sort-pop");
    if (!pop) return;
    let h = '<div class="lf-pop-title">' + esc(t("sort.button")) + "</div>";
    SORTS.forEach(function (o) {
      const on = S.sort === o.v;
      h += '<button type="button" class="lf-sort-opt' + (on ? " on" : "") + '" data-sort="' +
           o.v + '" role="menuitemradio" aria-checked="' + on + '">' +
           '<span class="lf-opt-check">' + (on && window.LF ? window.LF.icon("check") : "") + "</span>" +
           '<span class="lf-opt-label">' + esc(t(o.key)) + "</span></button>";
    });
    pop.innerHTML = h;
  }

  function renderSortButton() {
    if (!els.toolbar) return;
    const label = els.toolbar.querySelector(".lf-slabel");
    if (!label) return;
    const active = SORTS.filter(function (o) { return o.v === S.sort; })[0];
    label.textContent = active ? t(active.key) : t("sort.button");
    const btn = els.toolbar.querySelector(".lf-sortbtn");
    if (btn) btn.setAttribute("aria-label", t("sort.button"));
  }

  function updateBadge() {
    if (!els.toolbar) return;
    const b = els.toolbar.querySelector(".lf-fbtn .badge");
    if (!b) return;
    const n = groupCount();
    b.textContent = String(n);
    b.hidden = !n;
  }

  function renderTokens() {
    if (!els.toolbar) return;
    const box = els.toolbar.querySelector(".lf-tokens");
    if (!box) return;
    let h = "";
    S.tokens.forEach(function (tok, i) {
      const label = tok.label || "";
      h += '<span class="chip on lf-tok" title="' + esc(label) + '">' +
           '<span class="lf-tok-l">' + esc(label) + "</span>" +
           '<button type="button" class="lf-tok-x" data-i="' + i + '" aria-label="' +
           esc(t("search.remove", { name: label })) + '">' +
           (window.LF ? window.LF.icon("close") : "x") + "</button></span>";
    });
    box.innerHTML = h;
  }

  function applyGroupChoice(group, index) {
    const o = popOptions(group)[index];
    if (!o) return;
    if (group === "kind") S.kind = o.v;
    else if (group === "size") S.minSize = o.v;
    else if (group === "dur") S.minDur = o.v;
    else if (group === "lens") S.lens = o.v;
    else if (group === "saved") S.saved = o.v;
    renderFiltersPopover();
    changed();
  }

  function applySort(v) {
    S.sort = S.sort === v ? null : v;
    renderSortButton();
    closePop();
    changed();
  }

  function setPopExpanded(pop, open) {
    const anchor = pop && pop.parentNode;
    const btn = anchor && anchor.querySelector ? anchor.querySelector("button") : null;
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function closePop() {
    if (!openPop) return;
    openPop.hidden = true;
    setPopExpanded(openPop, false);
    openPop = null;
  }

  function togglePop(pop) {
    if (!pop) return;
    if (openPop && openPop !== pop) closePop();
    const willOpen = pop.hidden;
    pop.hidden = !willOpen;
    setPopExpanded(pop, willOpen);
    openPop = willOpen ? pop : null;
  }

  function onToolbarClick(e) {
    const tgt = e.target;
    if (!tgt || !tgt.closest) return;
    const x = tgt.closest(".lf-tok-x");
    if (x) {
      const i = Number(x.getAttribute("data-i"));
      S.tokens.splice(i, 1);
      renderTokens();
      changed();
      return;
    }
    const row = tgt.closest(".lf-srow");
    if (row) {
      const i = Number(row.getAttribute("data-i"));
      pickSuggestion(suggestRows[i]);
      return;
    }
    const fbtn = tgt.closest(".lf-fbtn");
    if (fbtn) {
      renderFiltersPopover();
      togglePop(els.toolbar.querySelector(".lf-filters-pop"));
      return;
    }
    const sbtn = tgt.closest(".lf-sortbtn");
    if (sbtn) {
      renderSortPopover();
      togglePop(els.toolbar.querySelector(".lf-sort-pop"));
      return;
    }
    const reset = tgt.closest(".lf-freset");
    if (reset) { resetFilters(); return; }
    const grp = tgt.closest("button[data-g]");
    if (grp) {
      applyGroupChoice(grp.getAttribute("data-g"), Number(grp.getAttribute("data-i")));
      return;
    }
    const sort = tgt.closest("button[data-sort]");
    if (sort) { applySort(sort.getAttribute("data-sort")); return; }
    const srch = tgt.closest(".lf-search");
    if (srch && tgt === srch) {
      const input = searchInput();
      if (input && input.focus) input.focus();
    }
  }

  let queryTimer = 0;
  function onQueryInput() {
    const input = searchInput();
    S.query = input ? input.value : "";
    S.si = -1;
    renderSuggestions();
    clearTimeout(queryTimer);
    queryTimer = setTimeout(function () { changed(); }, 140);
  }

  function onSearchKey(e) {
    const input = searchInput();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!suggestOpen) renderSuggestions();
      highlightSuggestion(S.si + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlightSuggestion(S.si - 1);
    } else if (e.key === "Enter") {
      if (suggestRows.length) {
        e.preventDefault();
        pickSuggestion(suggestRows[S.si >= 0 ? S.si : 0]);
      }
    } else if (e.key === "Escape") {
      closeSuggest();
    } else if (e.key === "Backspace" && input && !input.value && S.tokens.length) {
      e.preventDefault();
      S.tokens.pop();
      renderTokens();
      changed();
    }
  }

  function mountToolbar(root) {
    els.toolbar = root;
    openPop = null;
    suggestOpen = false;
    const icon = window.LF ? window.LF.icon : function () { return ""; };
    root.innerHTML =
      '<div class="lf-tf">' +
        '<div class="lf-search search" role="search">' +
          '<span class="lf-search-ico icon">' + icon("search") + "</span>" +
          '<div class="lf-tokens"></div>' +
          '<input class="lf-search-input" type="text" role="combobox" aria-autocomplete="list"' +
            ' aria-expanded="false" autocomplete="off" spellcheck="false"' +
            ' placeholder="' + esc(t("search.placeholder")) + '"' +
            ' aria-label="' + esc(t("search.placeholder")) + '">' +
        "</div>" +
        '<div class="lf-suggest popover" role="listbox" hidden></div>' +
        '<div class="lf-pop-anchor">' +
          '<button type="button" class="btn lf-fbtn" aria-haspopup="true" aria-expanded="false"' +
            ' aria-label="' + esc(t("filters.button")) + '">' +
            '<span class="icon">' + icon("filter") + "</span>" +
            '<span class="lf-btn-label">' + esc(t("filters.button")) + "</span>" +
            '<span class="badge" hidden></span>' +
          "</button>" +
          '<div class="popover lf-pop lf-filters-pop" hidden></div>' +
        "</div>" +
        '<div class="lf-pop-anchor">' +
          '<button type="button" class="btn lf-sortbtn" aria-haspopup="true" aria-expanded="false"' +
            ' aria-label="' + esc(t("sort.button")) + '">' +
            '<span class="icon">' + icon("sort") + "</span>" +
            '<span class="lf-btn-label lf-slabel">' + esc(t("sort.button")) + "</span>" +
            '<span class="icon lf-chev">' + icon("chevron-down") + "</span>" +
          "</button>" +
          '<div class="popover lf-pop lf-sort-pop" hidden></div>' +
        "</div>" +
      "</div>";

    const input = root.querySelector(".lf-search-input");
    if (input) {
      input.value = S.query;
      input.addEventListener("input", onQueryInput);
      input.addEventListener("keydown", onSearchKey);
      input.addEventListener("focus", function () {
        if (input.value && input.value.trim()) renderSuggestions();
      });
    }
    if (!root.__lfToolbarBound) {
      root.__lfToolbarBound = true;
      root.addEventListener("click", onToolbarClick);
      root.addEventListener("change", function (e) {
        const sel = e.target;
        if (!sel || !sel.classList || !sel.classList.contains("lf-camera")) return;
        S.camera = sel.value === "" ? null : Number(sel.value);
        renderFiltersPopover();
        changed();
      });
    }
    renderTokens();
    renderSortButton();
    updateBadge();
  }

  /* -------------------------------------------------------------- sidebar */

  const ROWS = [
    // Library
    { id: "all", group: "library", icon: "photos", key: "side.all", match: function () { return true; } },
    { id: "suggestions", group: "library", icon: "sparkles", key: "side.suggestions", view: "suggestions",
      cond: function () { return !!(stats && stats.total); } },
    { id: "report", group: "library", icon: "chart", key: "side.report", view: "report",
      cond: function () { return !!(stats && stats.total); } },
    { id: "map", group: "library", icon: "map", key: "side.map", view: "map",
      cond: function () { return !!(stats && stats.hasGeo); } },
    // People and places
    { id: "people", group: "people", icon: "people", key: "side.people", view: "people",
      match: function (it) { return !!(it.p && it.p.length); },
      cond: function () { return metaPeople().length > 0; }, countPeople: true },
    { id: "places", group: "people", icon: "pin", key: "side.places", view: "places",
      match: function (it) { return it.pl != null; },
      cond: function () { return metaPlaces().length > 0; }, countPlaces: true },
    // Media types
    { id: "videos", group: "media", icon: "video", key: "side.videos",
      match: function (it) { return it.k === "video"; } },
    { id: "selfies", group: "media", icon: "selfie", key: "side.selfies",
      match: function (it) { return hasCat(it, "selfie"); } },
    { id: "live", group: "media", icon: "live", key: "side.live",
      match: function (it) { return hasCat(it, "live"); } },
    { id: "portraits", group: "media", icon: "portrait", key: "side.portraits",
      match: function (it) { return hasCat(it, "portrait"); } },
    { id: "panoramas", group: "media", icon: "panorama", key: "side.panoramas",
      match: function (it) { return hasCat(it, "panorama"); } },
    { id: "slomo", group: "media", icon: "slomo", key: "side.slomo",
      match: function (it) { return hasCat(it, "slomo"); } },
    { id: "timelapse", group: "media", icon: "timelapse", key: "side.timelapse",
      match: function (it) { return hasCat(it, "timelapse"); } },
    { id: "screenshots", group: "media", icon: "screenshot", key: "side.screenshots",
      match: function (it) { return hasCat(it, "screenshot"); } },
    { id: "screenrec", group: "media", icon: "screenrec", key: "side.screenrec",
      match: function (it) { return hasCat(it, "screen_recording"); } },
    // Sources
    { id: "camera", group: "sources", icon: "camera", key: "side.camera",
      match: function (it) { return hasCat(it, "camera"); } },
    { id: "whatsapp", group: "sources", icon: "chat", key: "side.whatsapp",
      match: function (it) { return hasCat(it, "whatsapp"); } },
    { id: "social", group: "sources", icon: "social", key: "side.social",
      match: function (it) { return hasCat(it, "social"); } },
    { id: "messaging", group: "sources", icon: "messaging", key: "side.messaging",
      match: function (it) { return hasCat(it, "messaging"); } },
    { id: "airdrop", group: "sources", icon: "airdrop", key: "side.airdrop",
      match: function (it) { return hasCat(it, "airdrop"); } },
    { id: "apps", group: "sources", icon: "apps", key: "side.apps",
      match: function (it) { return hasCat(it, "other_apps"); } },
    // Utilities
    { id: "duplicates", group: "utilities", icon: "duplicate", key: "side.duplicates",
      match: function (it) { return hasCat(it, "duplicate"); } },
    { id: "similar", group: "utilities", icon: "similar", key: "side.similar",
      match: function (it) { return hasCat(it, "similar"); }, sort: "group", actions: true },
    { id: "burst", group: "utilities", icon: "burst", key: "side.burst",
      match: function (it) { return hasCat(it, "burst"); } },
    { id: "poor", group: "utilities", icon: "poor", key: "side.poor",
      match: function (it) { return hasCat(it, "poor"); }, sort: "quality" },
    { id: "favorites", group: "utilities", icon: "heart", key: "side.favorites",
      match: function (it) { return hasCat(it, "favorite"); } },
    { id: "hidden", group: "utilities", icon: "hidden", key: "side.hidden",
      match: function (it) { return hasCat(it, "hidden"); } },
    { id: "saved", group: "utilities", icon: "saved", key: "side.saved",
      match: function (it) { return !!it.sv; } },
    { id: "unsaved", group: "utilities", icon: "notsaved", key: "side.unsaved",
      match: function (it) { return !it.sv; } },
  ];

  const GROUPS = [
    { id: "library", key: "side.group.library" },
    { id: "people", key: "side.group.people" },
    { id: "media", key: "side.group.media" },
    { id: "sources", key: "side.group.sources" },
    { id: "utilities", key: "side.group.utilities" },
  ];

  function activeKeyNow() {
    return S.activeKey || (window.LF && window.LF.scope && window.LF.scope.key) || "all";
  }

  function selectAllButBest() {
    const api = window.LF;
    if (!api) return;
    const sc = api.scope;
    const items = api.items || [];
    const ids = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (sc && typeof sc.filter === "function" && !sc.filter(it)) continue;
      if (!refinePredicate(it)) continue;
      if (!it.best) ids.push(it.id);
    }
    if (api.select) api.select(ids, true);
  }

  function openRow(row) {
    const api = window.LF;
    if (!api) return;
    S.activeKey = row.id;
    if (row.view) {
      if (api.showView) api.showView(row.view);
      renderSidebar();
      return;
    }
    const opts = { key: row.id, title: t(row.key), titleKey: row.key, filter: row.match };
    if (row.sort) opts.sort = row.sort;
    if (row.actions) opts.actions = [{ label: t("act.selectAllButBest"), run: selectAllButBest }];
    if (api.setScope) api.setScope(opts);
    renderSidebar();
  }

  function rowNumbers(row) {
    if (!stats) return null;
    const acc = stats.rows[row.id];
    if (!acc) return null;
    if (row.id === "suggestions" || row.id === "report" || row.id === "map") return null;
    if (row.countPeople) return { n: metaPeople().length, bytes: stats.peopleBytes };
    if (row.countPlaces) return { n: metaPlaces().length, bytes: stats.placesBytes };
    return { n: acc.n, bytes: acc.bytes };
  }

  function classificationCard() {
    const st = window.LF && window.LF.st;
    if (!st || st.classification != null) return "";
    const icon = window.LF ? window.LF.icon("info") : "";
    return '<div class="lf-card">' +
      '<span class="icon lf-card-ico">' + icon + "</span>" +
      '<div class="lf-card-body">' +
        '<div class="lf-card-title">' + esc(t("side.classifyTitle")) + "</div>" +
        '<div class="lf-card-text">' + esc(t("side.classifyText")) + "</div>" +
      "</div></div>";
  }

  function renderSidebar(rootArg) {
    const api = window.LF;
    const root = rootArg || document.getElementById("sidebar") || els.sidebar;
    if (!api || !root) return;
    els.sidebar = root;
    if (!stats) rebuildData();
    const current = activeKeyNow();
    const icon = api.icon;

    let html = '<div class="lf-side">' +
      '<div class="lf-side-head"><img src="icon.png" alt="">' +
      "<span>" + esc("iCleaning") + "</span></div>" +
      '<div class="lf-side-scroll">';

    GROUPS.forEach(function (g) {
      let rowsHtml = "";
      ROWS.forEach(function (row) {
        if (row.group !== g.id) return;
        if (row.cond && !row.cond()) return;
        const acc = stats.rows[row.id];
        if (row.id !== "all" && acc && acc.n === 0 && !row.view) return;
        const nums = rowNumbers(row);
        const on = current === row.id;
        const label = t(row.key);
        rowsHtml += '<button type="button" class="lf-row' + (on ? " on" : "") +
          '" data-row="' + row.id + '" title="' + esc(label) + '"' +
          (on ? ' aria-current="true"' : "") + ">" +
          '<span class="icon lf-ico">' + icon(row.icon) + "</span>" +
          '<span class="lf-lb">' + esc(label) + "</span>" +
          (nums ? '<span class="lf-n">' + esc(fmtNum(nums.n)) + "</span>" +
                  '<span class="lf-sz">' + esc(api.fmtBytes(nums.bytes)) + "</span>" : "") +
          "</button>";
      });
      if (!rowsHtml) return;
      html += '<div class="lf-sec">' + esc(t(g.key)) + "</div>" + rowsHtml;
    });

    html += "</div>";
    if (stats) {
      html += '<div class="lf-side-foot">' +
        '<div class="lf-total">' + esc(t("side.total", {
          n: fmtNum(stats.total), size: api.fmtBytes(stats.bytes),
        })) + "</div>" +
        classificationCard() +
      "</div>";
    }
    html += "</div>";
    const prevScroll = root.querySelector && root.querySelector(".lf-side-scroll");
    const scrollTop = prevScroll ? prevScroll.scrollTop : 0;
    root.innerHTML = html;
    if (scrollTop) {
      const nextScroll = root.querySelector && root.querySelector(".lf-side-scroll");
      if (nextScroll) nextScroll.scrollTop = scrollTop;
    }

    if (!root.__lfSideBound) {
      root.__lfSideBound = true;
      root.addEventListener("click", function (e) {
        const tgt = e.target;
        if (!tgt || !tgt.closest) return;
        const btn = tgt.closest(".lf-row");
        if (!btn) return;
        const id = btn.getAttribute("data-row");
        const row = ROWS.filter(function (r) { return r.id === id; })[0];
        if (row) openRow(row);
      });
    }
  }

  /* ------------------------------------------------------------- timeline */

  function keyIndex(k) { return hist.keys.indexOf(k); }

  function rangeLabelHtml() {
    if (!S.range) {
      return '<span class="lf-tl-hint">' + esc(t("timeline.hint")) + "</span>";
    }
    const a = Math.min(S.range.a, S.range.b), b = Math.max(S.range.a, S.range.b);
    const icon = window.LF ? window.LF.icon("close") : "x";
    return '<span class="lf-tl-range">' +
      '<span class="lf-tl-text">' + esc(t("timeline.range", {
        from: fmtMonthKey(a), to: fmtMonthKey(b),
      })) + "</span>" +
      '<button type="button" class="lf-tl-x" aria-label="' + esc(t("timeline.clear")) + '">' +
      icon + "</button></span>";
  }

  function brushHtml() {
    if (!S.range) return "";
    const a = keyIndex(S.range.a), b = keyIndex(S.range.b);
    if (a < 0 || b < 0) return "";
    const lo = Math.min(a, b), hi = Math.max(a, b);
    return '<rect class="lf-tl-brush" x="' + lo + '" y="0" width="' + (hi - lo + 1) +
           '" height="40" vector-effect="non-scaling-stroke"></rect>';
  }

  function renderTimeline() {
    const api = window.LF;
    const el = document.getElementById("timeline") || els.timeline;
    if (!api || !el) return;
    els.timeline = el;
    if (!stats) rebuildData();
    rebuildHist();
    if (hist.keys.length < 2) {
      el.hidden = true;
      el.innerHTML = "";
      if (S.range) { S.range = null; syncRefine(); }
      return;
    }
    el.hidden = false;
    const n = hist.keys.length;
    const max = hist.max || 1;
    let bars = "";
    for (let i = 0; i < n; i++) {
      const b = hist.sums[i];
      const h = b ? 2 + (b / max) * 36 : 1;
      const y = 40 - h;
      bars += '<rect class="lf-tl-bar' + (b ? "" : " zero") + '" x="' + (i + 0.06) +
        '" y="' + y.toFixed(2) + '" width="0.88" height="' + h.toFixed(2) + '">' +
        "<title>" + esc(fmtMonthKey(hist.keys[i])) + " · " + esc(api.fmtBytes(b)) +
        "</title></rect>";
    }
    el.innerHTML = '<div class="lf-tl" aria-label="' + esc(t("timeline.label")) + '">' +
      '<svg class="lf-tl-svg" viewBox="0 0 ' + n + ' 40" preserveAspectRatio="none"' +
      ' aria-hidden="true">' + bars + brushHtml() + "</svg>" +
      '<div class="lf-tl-top">' + rangeLabelHtml() + "</div></div>";

    if (!el.__lfTlBound) {
      el.__lfTlBound = true;
      el.addEventListener("pointerdown", onTlDown);
      el.addEventListener("pointermove", onTlMove);
      el.addEventListener("pointerup", onTlUp);
      el.addEventListener("pointercancel", onTlUp);
      el.addEventListener("click", function (e) {
        const tgt = e.target;
        if (tgt && tgt.closest && tgt.closest(".lf-tl-x")) {
          S.range = null;
          renderTimeline();
          changed();
        }
      });
    }
  }

  function svgRect() {
    const el = els.timeline;
    return el ? el.querySelector(".lf-tl-svg") : null;
  }

  function monthIndexAt(clientX) {
    const target = svgRect() || els.timeline;
    if (!target || typeof target.getBoundingClientRect !== "function") return -1;
    const r = target.getBoundingClientRect();
    if (!r || !r.width) return -1;
    const x = (clientX - r.left) / r.width;
    return Math.max(0, Math.min(hist.keys.length - 1, Math.floor(x * hist.keys.length)));
  }

  function paintBrush() {
    const svg = svgRect();
    const top = els.timeline ? els.timeline.querySelector(".lf-tl-top") : null;
    if (top) top.innerHTML = rangeLabelHtml();
    if (!svg || !S.range) return;
    let lo = keyIndex(S.range.a), hi = keyIndex(S.range.b);
    if (lo < 0 || hi < 0) return;
    if (lo > hi) { const tmp = lo; lo = hi; hi = tmp; }
    let br = svg.querySelector(".lf-tl-brush");
    if (!br) {
      br = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      br.setAttribute("class", "lf-tl-brush");
      br.setAttribute("y", "0");
      br.setAttribute("height", "40");
      br.setAttribute("vector-effect", "non-scaling-stroke");
      svg.appendChild(br);
    }
    br.setAttribute("x", String(lo));
    br.setAttribute("width", String(hi - lo + 1));
  }

  let tlAnchor = -1;

  function onTlDown(e) {
    const tgt = e.target;
    if (tgt && tgt.closest && tgt.closest(".lf-tl-x")) return;
    if (hist.keys.length < 2) return;
    const i = monthIndexAt(e.clientX);
    if (i < 0) return;
    dragging = true;
    tlAnchor = i;
    S.range = { a: hist.keys[i], b: hist.keys[i] };
    try { els.timeline.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    paintBrush();
    e.preventDefault();
  }

  function onTlMove(e) {
    if (!dragging) return;
    const i = monthIndexAt(e.clientX);
    if (i < 0) return;
    S.range = { a: hist.keys[tlAnchor], b: hist.keys[i] };
    paintBrush();
  }

  function onTlUp() {
    if (!dragging) return;
    dragging = false;
    if (S.range) {
      const a = Math.min(S.range.a, S.range.b), b = Math.max(S.range.a, S.range.b);
      S.range = { a: a, b: b };
    }
    renderTimeline();
    changed();
  }

  /* ----------------------------------------------------------------- init */

  function ensureToolbar() {
    const root = els.toolbar || document.getElementById("toolbar-filters");
    if (!root) return false;
    els.toolbar = root;
    if (!root.querySelector(".lf-tf")) mountToolbar(root);
    return true;
  }

  function onDocPointerDown(e) {
    const tgt = e.target;
    const anchor = openPop && openPop.parentNode;
    const inOpen = !!(anchor && anchor.contains && tgt && anchor.contains(tgt));
    const inSearch = tgt && tgt.closest && (tgt.closest(".lf-search") || tgt.closest(".lf-suggest"));
    if (openPop && !inOpen) closePop();
    if (suggestOpen && !inSearch) closeSuggest();
  }

  function onDocKey(e) {
    if (e.key !== "Escape") return;
    closePop();
    if (suggestOpen) closeSuggest();
  }

  function onItems() {
    rebuildData();
    ensureToolbar();
    renderSidebar();
    renderTimeline();
    if (suggestOpen) renderSuggestions();
    syncRefine();
  }

  function onScope() {
    const sc = window.LF && window.LF.scope;
    if (sc && sc.key) S.activeKey = sc.key;
    ensureToolbar();
    renderSidebar();
    renderTimeline();
  }

  function init(api) {
    api.addStrings(STRINGS);
    makeMonthFmt();
    refreshMeta();
    syncRefine();

    els.sidebar = document.getElementById("sidebar");
    els.toolbar = document.getElementById("toolbar-filters");
    els.timeline = document.getElementById("timeline");

    if (els.toolbar) mountToolbar(els.toolbar);

    if (api.registerSidebar) {
      api.registerSidebar(function (root) { renderSidebar(root); });
    }

    if (api.items && api.items.length) rebuildData();
    renderSidebar();
    renderTimeline();
    syncRefine();

    api.on("items", onItems);
    api.on("scope", onScope);
    let lastClassMode = null;
    function renderClassState() {
      const st = api.st || {};
      const mode = st.classification != null ? "yes" : st.phase === "ready" ? "no" : "wait";
      if (mode === lastClassMode) return;
      lastClassMode = mode;
      renderSidebar();
    }
    renderClassState();
    api.on("state", function () { ensureToolbar(); renderClassState(); });
    api.on("lang", function () {
      makeMonthFmt();
      if (els.toolbar) mountToolbar(els.toolbar);
      renderSidebar();
      renderTimeline();
    });

    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onDocKey);

    if (window.__LF_TEST__) {
      api.__filtersTest = {
        state: S,
        rebuild: rebuildData,
        predicate: refinePredicate,
        suggestions: buildSuggestions,
        parseMonth: parseMonthQuery,
        stats: function () { return stats; },
        histogram: function () { return hist; },
        rows: ROWS,
        renderSidebar: renderSidebar,
        renderTimeline: renderTimeline,
        makeMonthFmt: makeMonthFmt,
        normalize: norm,
      };
    }
  }

  function boot() {
    if (window.LF) {
      init(window.LF);
      return;
    }
    // app.js loads first with defer; if it is still missing, wait for the DOM.
    document.addEventListener("DOMContentLoaded", function () {
      if (window.LF) init(window.LF);
    }, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (window.LF) init(window.LF);
    }, { once: true });
  } else {
    boot();
  }
})();
