"""Classification from a COPY of Photos.sqlite (the iPhone Photos database).

Read only. It extracts what iCloud does not expose through its API: which app each photo
comes from, screenshots, bursts, people and pets, place (already geocoded by the iPhone
itself, no internet), camera, Apple's aesthetic score, exact duplicates and series of
nearly identical photos.

Photos.sqlite dates count from 2001-01-01 (Core Data); they are converted to Unix by adding APPLE_EPOCH.
"""
from __future__ import annotations

import plistlib
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path

APPLE_EPOCH = 978307200

SOCIAL_APPS = {
    "com.burbn.instagram", "com.zhiliaoapp.musically", "com.ss.iphone.ugc.Ame", "com.atebits.Tweetie2",
    "com.facebook.Facebook", "com.toyopagroup.picaboo", "AlexisBarreyat.BeReal", "pinterest",
    "com.lemon.lvoverseas", "com.google.ios.youtube", "com.google.ios.ytcreator", "com.reddit.Reddit",
    "com.burbn.barcelona",
}
MESSAGING_APPS = {"ph.telegra.Telegraph", "org.whispersystems.signal", "com.facebook.Messenger", "jp.naver.line"}

# ZKINDSUBTYPE
SUB_PANORAMA, SUB_LIVE, SUB_SCREENSHOT = 1, 2, 10
SUB_SLOMO, SUB_TIMELAPSE, SUB_SCREENREC = 101, 102, 103
# ZDETECTEDFACE.ZDETECTIONTYPE / ZPERSON.ZDETECTIONTYPE
DET_HUMAN, DET_DOG, DET_CAT = 1, 3, 4

SERIES_SECONDS = 3          # camera photos closer than this to each other = same series
MIN_PHOTOS_UNNAMED = 15     # unnamed faces: only groups with at least this many photos
MAX_UNNAMED = 40


def name_date_key(name: str, ts: float) -> str:
    """Fallback key to match an iCloud item with its Photos.sqlite row."""
    return f"{(name or '').upper()}|{int(round(ts))}"


@dataclass
class Classification:
    """Result. `info` is keyed by UUID (uppercase) and also by name_date_key."""
    info: dict = field(default_factory=dict)
    people: list = field(default_factory=list)     # [{id, name, kind, n, face:{a,x,y,s}}]
    places: list = field(default_factory=list)     # [[country, region, city, country_code]]
    cameras: list = field(default_factory=list)    # ["iPhone 15", ...]
    moments: list = field(default_factory=list)    # [[title, subtitle]]
    rows: list = field(default_factory=list)       # raw data for cable mode (see USB source)

    def lookup(self, id_: str, name: str = "", date: float = 0):
        return self.info.get(id_.upper()) or (self.info.get(name_date_key(name, date)) if name else None)


# ------------------------------------------------------------------ NSKeyedArchiver (places)

def unarchive(blob: bytes):
    """Decode an NSKeyedArchiver (bplist) into Python dicts/lists. No dependencies."""
    p = plistlib.loads(blob)
    objs = p["$objects"]

    def resolve(x, depth=0):
        if depth > 40:
            return None
        if isinstance(x, plistlib.UID):
            x = objs[x.data]
        if isinstance(x, dict):
            if "NS.keys" in x:
                return {resolve(k, depth + 1): resolve(v, depth + 1) for k, v in zip(x["NS.keys"], x["NS.objects"])}
            if "NS.objects" in x:
                return [resolve(v, depth + 1) for v in x["NS.objects"]]
            if "NS.string" in x:
                return x["NS.string"]
            return {k: resolve(v, depth + 1) for k, v in x.items() if k != "$class"}
        return None if x == "$null" else x

    return resolve(p["$top"]["root"])


def place_from_blob(blob: bytes | None):
    """(country, region, city, ISO code) from ZREVERSELOCATIONDATA, or None. Never the street."""
    if not blob:
        return None
    try:
        d = unarchive(blob)
    except Exception:  # noqa: BLE001 - a weird blob must not take the classification down
        return None
    pa = (d or {}).get("postalAddress") or {}
    country, region, city = pa.get("_country"), pa.get("_state"), pa.get("_city") or pa.get("_subLocality")
    if not (country or city):
        return None
    return (country or "", region or "", city or "", (pa.get("_ISOCountryCode") or d.get("countryCode") or "").upper())


# ------------------------------------------------------------------ classification

def _lens_target(lens: str | None, focal35) -> str:
    lens = (lens or "").lower()
    if "front" in lens:
        return "front"
    if not focal35:
        return ""
    if focal35 <= 16:
        return "ultra"
    if focal35 >= 48:
        return "tele"
    return "main"


def _columns(con, table):
    return {r[1] for r in con.execute(f"PRAGMA table_info({table})")}


def classify(db_path: str | Path | None) -> Classification:
    out = Classification()
    if not db_path or not Path(db_path).exists():
        return out
    con = sqlite3.connect(f"file:{Path(db_path).as_posix()}?mode=ro", uri=True)
    try:
        _classify(con, out)
    finally:
        con.close()
    return out


def _classify(con, out: Classification):
    cols_a = _columns(con, "ZASSET")
    has = lambda c: c in cols_a  # noqa: E731 - depending on the iOS version some columns are missing
    ext = "ZEXTENDEDATTRIBUTES" in {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    sel = lambda c, t="a": f"{t}.{c}" if (t != "a" or has(c)) else "NULL"  # noqa: E731
    assets = con.execute(f"""
        SELECT a.Z_PK, a.ZUUID, a.ZKIND, a.ZKINDSUBTYPE, {sel('ZISDETECTEDSCREENSHOT')}, a.ZAVALANCHEPICKTYPE,
               a.ZAVALANCHEUUID, a.ZFAVORITE, a.ZDURATION, a.ZDATECREATED, {sel('ZDEPTHTYPE')},
               {sel('ZOVERALLAESTHETICSCORE')}, a.ZHIDDEN, a.ZDIRECTORY, a.ZFILENAME, a.ZMOMENT,
               b.ZIMPORTEDBY, b.ZIMPORTEDBYBUNDLEIDENTIFIER, b.ZORIGINALSTABLEHASH, b.ZORIGINALFILENAME,
               b.ZORIGINALFILESIZE, b.ZREVERSELOCATIONDATA,
               {'x.ZCAMERAMODEL, x.ZLENSMODEL, x.ZFOCALLENGTHIN35MM' if ext else 'NULL, NULL, NULL'},
               a.ZCLOUDLOCALSTATE, a.ZWIDTH, a.ZHEIGHT, {sel('ZLATITUDE')}, {sel('ZLONGITUDE')}
        FROM ZASSET a
        LEFT JOIN ZADDITIONALASSETATTRIBUTES b ON b.ZASSET = a.Z_PK
        {'LEFT JOIN ZEXTENDEDATTRIBUTES x ON x.ZASSET = a.Z_PK' if ext else ''}
        WHERE a.ZTRASHEDSTATE = 0 AND a.ZSAVEDASSETTYPE = 3
        ORDER BY a.Z_PK""").fetchall()

    # --- people and pets
    faces = {}      # asset pk -> set(person pk)
    pets = {}       # asset pk -> {"dog", "cat"}
    merges = dict(con.execute("SELECT Z_PK, ZMERGETARGETPERSON FROM ZPERSON WHERE ZMERGETARGETPERSON IS NOT NULL"))
    for asset, person, kind in con.execute(
            "SELECT ZASSETFORFACE, ZPERSONFORFACE, ZDETECTIONTYPE FROM ZDETECTEDFACE "
            "WHERE ZASSETFORFACE IS NOT NULL AND coalesce(ZHIDDEN, 0) = 0 AND coalesce(ZISINTRASH, 0) = 0"):
        if kind in (DET_DOG, DET_CAT):
            pets.setdefault(asset, set()).add("dog" if kind == DET_DOG else "cat")
        if person is not None:
            for _ in range(5):  # follow the merge chain
                if person not in merges:
                    break
                person = merges[person]
            faces.setdefault(asset, set()).add(person)

    uuid_of = {r[0]: r[1] for r in assets}
    counts = {}
    for asset, ps in faces.items():
        if asset in uuid_of:
            for p in ps:
                counts[p] = counts.get(p, 0) + 1
    people = {}
    unnamed = []
    for pk, name_c, name_v, kind, face_key, ztype in con.execute(
            "SELECT Z_PK, ZFULLNAME, ZDISPLAYNAME, ZDETECTIONTYPE, ZKEYFACE, ZTYPE FROM ZPERSON "
            "WHERE ZMERGETARGETPERSON IS NULL"):
        n = counts.get(pk, 0)
        if not n or ztype == -1:
            continue
        name = (name_v or name_c or "").strip()
        p = {"id": len(people), "pk": pk, "name": name,
             "kind": {DET_DOG: "dog", DET_CAT: "cat"}.get(kind, "person"), "n": n, "face": face_key}
        if name:
            people[pk] = p
        elif n >= MIN_PHOTOS_UNNAMED:
            unnamed.append(p)
    for p in sorted(unnamed, key=lambda p: -p["n"])[:MAX_UNNAMED]:
        people[p["pk"]] = p
    ordered = sorted(people.values(), key=lambda p: (not p["name"], -p["n"]))
    for i, p in enumerate(ordered):
        p["id"] = i
    face_keys = {}
    face_ids = [p["face"] for p in ordered if p["face"]]
    for i in range(0, len(face_ids), 500):
        chunk = face_ids[i:i + 500]
        face_keys.update({r[0]: r[1:] for r in con.execute(
            f"SELECT Z_PK, ZASSETFORFACE, ZCENTERX, ZCENTERY, ZSIZE FROM ZDETECTEDFACE "
            f"WHERE Z_PK IN ({','.join('?' * len(chunk))})", chunk)})
    for p in ordered:
        c = face_keys.get(p.pop("face"))
        p["face"] = ({"a": uuid_of[c[0]].upper(), "x": round(c[1] or .5, 3), "y": round(c[2] or .5, 3),
                      "s": round(c[3] or .3, 3)} if c and c[0] in uuid_of else None)
    person_id = {p.pop("pk"): p["id"] for p in ordered}
    out.people = ordered

    # --- moments
    moments, moment_id = [], {}
    for pk, title, subtitle in con.execute("SELECT Z_PK, ZTITLE, ZSUBTITLE FROM ZMOMENT WHERE ZTITLE IS NOT NULL"):
        moment_id[pk] = len(moments)
        moments.append([title, subtitle or ""])
    out.moments = moments

    # --- main pass
    places, place_id = [], {}
    cameras, camera_id = [], {}
    seen_hashes = {}
    series = []         # (date, pk) of camera photos, for the series
    by_pk = {}
    notes = []
    for (pk, uuid, asset_kind, sub, shot, pick, aval, fav, dur, date, depth, aesthetic, hidden, folder, file_,
         moment, impby, bundle, h, name, size, revgeo, camera, lens, focal35, cloud, width, height, lat, lon) in assets:
        if not uuid:
            continue
        bundle = bundle or ""
        cats = []
        is_video = asset_kind == 1
        if sub == SUB_SCREENREC or bundle == "com.apple.replayd":
            cats.append("screen_recording")
        elif shot or sub == SUB_SCREENSHOT:
            cats.append("screenshot")
        if bundle == "net.whatsapp.WhatsApp":
            cats.append("whatsapp")
        elif bundle in SOCIAL_APPS:
            cats.append("social")
        elif bundle in MESSAGING_APPS:
            cats.append("messaging")
        elif bundle.startswith("com.apple.sharingd"):
            cats.append("airdrop")
        elif bundle == "com.apple.camera" or (impby in (1, 2) and not bundle):
            cats.append("camera")
        elif bundle and (not bundle.startswith("com.apple.") or bundle in (
                "com.apple.mobilesafari", "com.apple.SafariViewService", "com.apple.DocumentsApp")):
            cats.append("other_apps")
        if aval and pick == 2:
            cats.append("burst")
        if sub == SUB_LIVE:
            cats.append("live")
        if sub == SUB_PANORAMA:
            cats.append("panorama")
        if sub == SUB_SLOMO:
            cats.append("slomo")
        if sub == SUB_TIMELAPSE:
            cats.append("timelapse")
        if depth and not is_video:
            cats.append("portrait")
        lens_target = _lens_target(lens, focal35)
        if lens_target == "front" and "screenshot" not in cats:
            cats.append("selfie")
        if fav:
            cats.append("favorite")
        if hidden:
            cats.append("hidden")
        pet_kinds = pets.get(pk)
        if pet_kinds:
            cats.append("pet")
            cats.extend(sorted(pet_kinds))
        if h:
            if h in seen_hashes:
                cats.append("duplicate")
            else:
                seen_hashes[h] = pk
        ts = (date or 0) + APPLE_EPOCH
        info = {"c": cats, "dur": round(float(dur or 0), 1), "k": "video" if is_video else "photo"}
        persons = sorted({person_id[p] for p in faces.get(pk, ()) if p in person_id})
        if persons:
            info["p"] = persons
        place = place_from_blob(revgeo)
        if place:
            if place not in place_id:
                place_id[place] = len(places)
                places.append(list(place))
            info["pl"] = place_id[place]
        if camera:
            if camera not in camera_id:
                camera_id[camera] = len(cameras)
                cameras.append(camera)
            info["cam"] = camera_id[camera]
        if lens_target:
            info["lens"] = lens_target
        if aesthetic is not None and aesthetic > 0:
            info["q"] = round(aesthetic * 100)
        if lat is not None and lon is not None and -90 <= lat <= 90 and -180 < lon <= 180 and (lat, lon) != (0, 0):
            info["geo"] = [round(lat, 2), round(lon, 2)]   # ~1 km: enough for the map
        if moment in moment_id:
            info["m"] = moment_id[moment]
        if not is_video and "camera" in cats and "burst" not in cats and "screenshot" not in cats:
            series.append((ts, pk))
            if aesthetic:
                notes.append(aesthetic)
        by_pk[pk] = info
        out.info[uuid.upper()] = info
        if name:
            out.info[name_date_key(name, ts)] = info
        out.rows.append({"pk": pk, "uuid": uuid.upper(), "dir": folder or "", "file": file_ or "",
                         "name": name or file_ or "", "size": int(size or 0), "date": ts, "info": info,
                         "cloud_state": cloud, "hidden": bool(hidden), "discarded_burst": bool(aval and pick == 2)})

    # --- nearly identical photos: camera series with a few seconds between them; Apple's best one stays
    series.sort()
    groups, current = [], []
    for ts, pk in series:
        if current and ts - current[-1][0] > SERIES_SECONDS:
            if len(current) > 1:
                groups.append(current)
            current = []
        current.append((ts, pk))
    if len(current) > 1:
        groups.append(current)
    for gi, g in enumerate(groups):
        best = max(g, key=lambda x: (by_pk[x[1]].get("q", 0), -x[0]))[1]
        for _, pk in g:
            by_pk[pk]["g"] = gi
            if pk == best:
                by_pk[pk]["best"] = True
            else:
                by_pk[pk]["c"].append("similar")

    # --- probably poor: the worst 8 % as scored by Apple among camera photos
    if len(notes) > 50:
        notes.sort()
        threshold = min(notes[int(len(notes) * 0.08)], 0.15)
        for ts, pk in series:
            q = by_pk[pk].get("q")
            if q is not None and q / 100 <= threshold and "favorite" not in by_pk[pk]["c"]:
                by_pk[pk]["c"].append("poor")

    out.places, out.cameras = places, cameras
