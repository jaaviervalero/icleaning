"""How folders are organized on save (templates) and XMP tags next to each photo.

Template: text with tokens separated by "/", e.g. "{year}/{month}" or "{country}/{city}".
Tokens: {year} {month} {day} {country} {region} {city} {person} {type} {source} {camera}.
Empty template = everything in the same folder.
"""
from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr

TOKENS = ("year", "month", "day", "country", "region", "city", "person", "type", "source", "camera")
PRESETS = {"year_month": "{year}/{month}", "year": "{year}", "place": "{country}/{city}",
           "person": "{person}", "type": "{type}", "source": "{source}/{year}", "flat": ""}
DEFAULT_TEMPLATE = PRESETS["year_month"]
MAX_LEVELS = 6

TEXTS = {
    "es": {"no_place": "Sin lugar", "no_person": "Sin persona", "other_cameras": "Otras cámaras",
           "people": "Personas", "pets": "Mascotas", "places": "Lugares", "types": "Tipos", "favorite": "Favorita",
           "type": {"video": "Vídeos", "screenshot": "Capturas", "screen_recording": "Grabaciones de pantalla",
                    "selfie": "Selfies", "portrait": "Retratos", "panorama": "Panorámicas", "photo": "Fotos"},
           "source": {"camera": "Cámara", "whatsapp": "WhatsApp", "social": "Redes sociales", "airdrop": "AirDrop",
                      "messaging": "Mensajería", "other_apps": "Otras apps", "": "Otros"}},
    "en": {"no_place": "No place", "no_person": "No person", "other_cameras": "Other cameras",
           "people": "People", "pets": "Pets", "places": "Places", "types": "Types", "favorite": "Favorite",
           "type": {"video": "Videos", "screenshot": "Screenshots", "screen_recording": "Screen recordings",
                    "selfie": "Selfies", "portrait": "Portraits", "panorama": "Panoramas", "photo": "Photos"},
           "source": {"camera": "Camera", "whatsapp": "WhatsApp", "social": "Social media", "airdrop": "AirDrop",
                      "messaging": "Messaging", "other_apps": "Other apps", "": "Other"}},
}
_FORBIDDEN = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
_RESERVED = {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)), *(f"LPT{i}" for i in range(1, 10))}


class TemplateError(ValueError):
    pass


def validate(template: str) -> str:
    template = (template or "").strip().strip("/")
    if not template:
        return ""
    levels = template.split("/")
    if len(levels) > MAX_LEVELS:
        raise TemplateError("template.levels")
    for level in levels:
        if not level.strip() or level.strip() in (".", ".."):
            raise TemplateError("template.empty")
        for m in re.findall(r"\{([^}]*)\}", level):
            if m not in TOKENS:
                raise TemplateError("template.token")
        if _FORBIDDEN.search(re.sub(r"\{[^}]*\}", "", level)):
            raise TemplateError("template.char")
    return template


def sanitize(name: str, default: str = "_") -> str:
    """A folder name valid on Windows, macOS and Linux."""
    n = _FORBIDDEN.sub("_", str(name)).strip().rstrip(". ")
    n = n[:80].rstrip(". ") or default
    if n.upper().split(".")[0] in _RESERVED:
        n = "_" + n
    return "_" if n in (".", "..") else n


def _item_kind(cats, k):
    for c in ("screen_recording", "screenshot", "selfie", "portrait", "panorama"):
        if c in cats:
            return c
    return "video" if k == "video" else "photo"


def _source(cats):
    return next((c for c in ("camera", "whatsapp", "social", "airdrop", "messaging", "other_apps") if c in cats), "")


def values(item, cls, lang="es") -> dict:
    t = TEXTS.get(lang, TEXTS["es"])
    dt = datetime.fromtimestamp(item.date) if item.date and item.date > 0 else datetime(1970, 1, 1)
    place = cls.places[item.extra["pl"]] if "pl" in item.extra and item.extra["pl"] < len(cls.places) else None
    person = ""
    for pid in item.extra.get("p", []):
        if pid < len(cls.people) and cls.people[pid].get("name"):
            person = cls.people[pid]["name"]
            break
    cam = item.extra.get("cam")
    return {"year": f"{dt:%Y}", "month": f"{dt:%m}", "day": f"{dt:%d}",
            "country": (place[0] if place and place[0] else t["no_place"]),
            "region": (place[1] if place and place[1] else t["no_place"]),
            "city": (place[2] if place and place[2] else t["no_place"]),
            "person": person or t["no_person"],
            "type": t["type"][_item_kind(item.cats, item.kind)],
            "source": t["source"][_source(item.cats)],
            "camera": (cls.cameras[cam] if cam is not None and cam < len(cls.cameras) else t["other_cameras"])}


def subfolder(item, cls, template: str, lang="es") -> Path:
    """Relative path (always inside the destination folder) for the item."""
    if not template:
        return Path()
    v = values(item, cls, lang)
    parts = []
    for level in template.split("/"):
        txt = re.sub(r"\{(\w+)\}", lambda m: v.get(m.group(1), ""), level)
        parts.append(sanitize(txt))
    return Path(*parts)


# ------------------------------------------------------------------ XMP

def xmp(item, cls, lang="es") -> str:
    """XMP file (sidecar) with people, place and type as keywords.
    Read by Lightroom, digiKam, darktable, Capture One, etc."""
    t = TEXTS.get(lang, TEXTS["es"])
    named = [cls.people[p] for p in item.extra.get("p", [])
             if p < len(cls.people) and cls.people[p].get("name")]
    people = [p["name"] for p in named if p.get("kind", "person") == "person"]
    pets = [p["name"] for p in named if p.get("kind", "person") != "person"]
    place = cls.places[item.extra["pl"]] if "pl" in item.extra and item.extra["pl"] < len(cls.places) else None
    keywords, hierarchy = [], []
    for p in people:
        keywords.append(p)
        hierarchy.append(f"{t['people']}|{p}")
    for p in pets:
        keywords.append(p)
        hierarchy.append(f"{t['pets']}|{p}")
    if place:
        parts = [x for x in place[:3] if x]
        keywords += [x for x in parts if x not in keywords]
        if parts:
            hierarchy.append("|".join([t["places"], *parts]))
    kind = t["type"][_item_kind(item.cats, item.kind)]
    keywords.append(kind)
    hierarchy.append(f"{t['types']}|{kind}")
    if "favorite" in item.cats:
        keywords.append(t["favorite"])
    attrs = {"xmlns:dc": "http://purl.org/dc/elements/1.1/", "xmlns:lr": "http://ns.adobe.com/lightroom/1.0/",
             "xmlns:photoshop": "http://ns.adobe.com/photoshop/1.0/", "xmlns:xmp": "http://ns.adobe.com/xap/1.0/",
             "xmlns:Iptc4xmpCore": "http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/",
             "xmlns:Iptc4xmpExt": "http://iptc.org/std/Iptc4xmpExt/2008-02-29/"}
    if item.date and item.date > 0:
        attrs["photoshop:DateCreated"] = datetime.fromtimestamp(item.date).strftime("%Y-%m-%dT%H:%M:%S")
    if place:
        for k, v in (("photoshop:Country", place[0]), ("photoshop:State", place[1]), ("photoshop:City", place[2]),
                     ("Iptc4xmpCore:CountryCode", place[3])):
            if v:
                attrs[k] = v

    def bag(name, values_):
        if not values_:
            return ""
        lis = "".join(f"<rdf:li>{escape(x)}</rdf:li>" for x in values_)
        return f"<{name}><rdf:Bag>{lis}</rdf:Bag></{name}>"

    body = (bag("dc:subject", keywords) + bag("lr:hierarchicalSubject", hierarchy)
            + bag("Iptc4xmpExt:PersonInImage", people))
    attr_txt = " ".join(f"{k}={quoteattr(str(v))}" for k, v in attrs.items())
    return ('<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n'
            '<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="iCleaning">\n'
            ' <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n'
            f'  <rdf:Description rdf:about="" {attr_txt}>{body}</rdf:Description>\n'
            ' </rdf:RDF>\n</x:xmpmeta>\n<?xpacket end="w"?>\n')
