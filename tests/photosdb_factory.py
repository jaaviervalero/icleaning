"""Factory for a SYNTHETIC Photos.sqlite for the tests.

It never touches a real database: it creates at the path it is given the tables and columns
that `icleaning.photosdb` reads (ZASSET, ZADDITIONALASSETATTRIBUTES, ZEXTENDEDATTRIBUTES,
ZDETECTEDFACE, ZPERSON and ZMOMENT) and offers handy methods to insert rows little by little.

`old=True` creates a database like the ones from old iOS versions: without the optional
columns (ZISDETECTEDSCREENSHOT, ZDEPTHTYPE, ZOVERALLAESTHETICSCORE) and without
ZEXTENDEDATTRIBUTES.

`place_blob()` generates a real NSKeyedArchiver (binary plist with plistlib.UID) like the one
the iPhone stores in ZREVERSELOCATIONDATA.
"""
from __future__ import annotations

import plistlib
import sqlite3
from pathlib import Path

# Columns of each table. The ones marked optional do not exist in old databases.
_COLUMNS = {
    "ZASSET": [
        ("Z_PK", "INTEGER PRIMARY KEY"),
        ("ZUUID", "TEXT UNIQUE"),
        ("ZKIND", "INTEGER DEFAULT 0"),
        ("ZKINDSUBTYPE", "INTEGER DEFAULT 0"),
        ("ZISDETECTEDSCREENSHOT", "INTEGER DEFAULT 0"),
        ("ZAVALANCHEPICKTYPE", "INTEGER DEFAULT 0"),
        ("ZAVALANCHEUUID", "TEXT"),
        ("ZFAVORITE", "INTEGER DEFAULT 0"),
        ("ZDURATION", "REAL DEFAULT 0"),
        ("ZDATECREATED", "REAL DEFAULT 0"),
        ("ZDEPTHTYPE", "INTEGER DEFAULT 0"),
        ("ZOVERALLAESTHETICSCORE", "REAL"),
        ("ZHIDDEN", "INTEGER DEFAULT 0"),
        ("ZDIRECTORY", "TEXT"),
        ("ZFILENAME", "TEXT"),
        ("ZMOMENT", "INTEGER"),
        ("ZTRASHEDSTATE", "INTEGER DEFAULT 0"),
        ("ZSAVEDASSETTYPE", "INTEGER DEFAULT 3"),
        ("ZCLOUDLOCALSTATE", "INTEGER DEFAULT 1"),
        ("ZWIDTH", "INTEGER"),
        ("ZHEIGHT", "INTEGER"),
    ],
    "ZADDITIONALASSETATTRIBUTES": [
        ("Z_PK", "INTEGER PRIMARY KEY"),
        ("ZASSET", "INTEGER"),
        ("ZIMPORTEDBY", "INTEGER DEFAULT 0"),
        ("ZIMPORTEDBYBUNDLEIDENTIFIER", "TEXT"),
        ("ZORIGINALSTABLEHASH", "TEXT"),
        ("ZORIGINALFILENAME", "TEXT"),
        ("ZORIGINALFILESIZE", "INTEGER DEFAULT 0"),
        ("ZREVERSELOCATIONDATA", "BLOB"),
    ],
    "ZEXTENDEDATTRIBUTES": [
        ("Z_PK", "INTEGER PRIMARY KEY"),
        ("ZASSET", "INTEGER"),
        ("ZCAMERAMODEL", "TEXT"),
        ("ZLENSMODEL", "TEXT"),
        ("ZFOCALLENGTHIN35MM", "REAL DEFAULT 0"),
    ],
    "ZDETECTEDFACE": [
        ("Z_PK", "INTEGER PRIMARY KEY"),
        ("ZASSETFORFACE", "INTEGER"),
        ("ZPERSONFORFACE", "INTEGER"),
        ("ZDETECTIONTYPE", "INTEGER DEFAULT 1"),
        ("ZHIDDEN", "INTEGER DEFAULT 0"),
        ("ZISINTRASH", "INTEGER DEFAULT 0"),
        ("ZCENTERX", "REAL DEFAULT 0.5"),
        ("ZCENTERY", "REAL DEFAULT 0.5"),
        ("ZSIZE", "REAL DEFAULT 0.3"),
    ],
    "ZPERSON": [
        ("Z_PK", "INTEGER PRIMARY KEY"),
        ("ZFULLNAME", "TEXT"),
        ("ZDISPLAYNAME", "TEXT"),
        ("ZDETECTIONTYPE", "INTEGER DEFAULT 1"),
        ("ZKEYFACE", "INTEGER"),
        ("ZTYPE", "INTEGER DEFAULT 0"),
        ("ZMERGETARGETPERSON", "INTEGER"),
    ],
    "ZMOMENT": [
        ("Z_PK", "INTEGER PRIMARY KEY"),
        ("ZTITLE", "TEXT"),
        ("ZSUBTITLE", "TEXT"),
    ],
}

_OPTIONAL_COLUMNS = {"ZISDETECTEDSCREENSHOT", "ZDEPTHTYPE", "ZOVERALLAESTHETICSCORE"}
_OPTIONAL_TABLES = {"ZEXTENDEDATTRIBUTES"}


def place_blob(country="España", region="Aragón", city="Zaragoza", street="Calle Mayor 1",
               iso="ES", country_code=None) -> bytes:
    """NSKeyedArchiver (bplist) equivalent to Photos' ZREVERSELOCATIONDATA.

    Root: {postalAddress: {...}, countryCode: "ES"}. The address goes as an NSDictionary with
    NS.keys/NS.objects (all UIDs) and each string as an NSString object.
    """
    postal = {"_country": country, "_state": region, "_city": city, "_street": street}
    if iso is not None:
        postal["_ISOCountryCode"] = iso

    objs: list = ["$null"]  # index 0 = $null, as in NSKeyedArchiver
    cls_dict = {"$classname": "NSDictionary", "$classes": ["NSDictionary", "NSObject"]}
    cls_str = {"$classname": "NSString", "$classes": ["NSString", "NSObject"]}
    # 1 root, 2 postal, 3 NSDictionary class, 4 NSString class
    objs += [None, None, cls_dict, cls_str]

    def add_str(text: str) -> plistlib.UID:
        objs.append({"$class": plistlib.UID(4), "NS.string": text})
        return plistlib.UID(len(objs) - 1)

    keys = [add_str(k) for k in postal]
    vals = [add_str(v) for v in postal.values()]
    objs[2] = {"$class": plistlib.UID(3), "NS.keys": keys, "NS.objects": vals}
    objs[1] = {"$class": plistlib.UID(3), "postalAddress": plistlib.UID(2),
               "countryCode": add_str(country_code if country_code is not None else (iso or ""))}

    data = {"$archiver": "NSKeyedArchiver", "$version": 100000,
            "$top": {"root": plistlib.UID(1)}, "$objects": objs}
    return plistlib.dumps(data, fmt=plistlib.FMT_BINARY)


class PhotosDBFactory:
    """Builds a synthetic Photos.sqlite step by step."""

    def __init__(self, path: str | Path, old: bool = False):
        self.path = Path(path)
        self.old = bool(old)
        # isolation_level=None: autocommit, so it can be read from another connection in ro mode
        self.conn = sqlite3.connect(str(self.path), isolation_level=None)
        self.columns: dict[str, set[str]] = {}
        self._create()

    # ------------------------------------------------------------ schema
    def _create(self):
        for table, cols in _COLUMNS.items():
            if self.old and table in _OPTIONAL_TABLES:
                continue
            defined = [(n, t) for n, t in cols if not (self.old and n in _OPTIONAL_COLUMNS)]
            self.columns[table] = {n for n, _ in defined}
            body = ", ".join(f"{n} {t}" for n, t in defined)
            self.conn.execute(f"CREATE TABLE {table} ({body})")

    # ------------------------------------------------------------ helpers
    def _next_pk(self, table: str) -> int:
        return self.conn.execute(f"SELECT coalesce(max(Z_PK), 0) + 1 FROM {table}").fetchone()[0]

    def _insert(self, table: str, row: dict) -> int:
        row = {k: v for k, v in row.items() if k in self.columns[table]}
        if "Z_PK" not in row:
            row["Z_PK"] = self._next_pk(table)
        self.conn.execute(
            f"INSERT INTO {table} ({', '.join(row)}) VALUES ({', '.join('?' * len(row))})",
            list(row.values()))
        return row["Z_PK"]

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.commit()
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    # ------------------------------------------------------------ rows
    def asset(self, uuid: str | None = None, *, kind: int = 0, subtype: int = 0,
              screenshot: bool = False, favorite: bool = False, hidden: bool = False,
              date: float = 0.0, moment: int | None = None, pick: int = 0,
              avalanche: str | None = None, dur: float = 0.0, depth: int = 0,
              aesthetic: float | None = None, folder: str = "DCIM/100APPLE",
              file: str | None = None, size: int = 0, impby: int = 0,
              bundle: str | None = None, hash_: str | None = None,
              original_name: str | None = None, place: bytes | None = None,
              camera: str | None = None, lens: str | None = None, focal35: float = 0,
              cloud: int = 1, width: int = 4032, height: int = 3024,
              trashed: int = 0, saved: int = 3, pk: int | None = None) -> int:
        """Add an asset (with its additional attributes and, if applicable, the extended ones)."""
        if pk is None:
            pk = self._next_pk("ZASSET")
        uuid = uuid or f"UUID-{pk:04d}"
        file = file or f"IMG_{pk:04d}.HEIC"
        if original_name is None:
            original_name = file
        self._insert("ZASSET", {
            "Z_PK": pk, "ZUUID": uuid, "ZKIND": int(kind), "ZKINDSUBTYPE": int(subtype),
            "ZISDETECTEDSCREENSHOT": int(bool(screenshot)), "ZAVALANCHEPICKTYPE": int(pick),
            "ZAVALANCHEUUID": avalanche, "ZFAVORITE": int(bool(favorite)),
            "ZDURATION": dur, "ZDATECREATED": date, "ZDEPTHTYPE": int(depth),
            "ZOVERALLAESTHETICSCORE": aesthetic, "ZHIDDEN": int(bool(hidden)),
            "ZDIRECTORY": folder, "ZFILENAME": file, "ZMOMENT": moment,
            "ZTRASHEDSTATE": int(trashed), "ZSAVEDASSETTYPE": int(saved),
            "ZCLOUDLOCALSTATE": cloud, "ZWIDTH": width, "ZHEIGHT": height,
        })
        self._insert("ZADDITIONALASSETATTRIBUTES", {
            "ZASSET": pk, "ZIMPORTEDBY": int(impby),
            "ZIMPORTEDBYBUNDLEIDENTIFIER": bundle, "ZORIGINALSTABLEHASH": hash_,
            "ZORIGINALFILENAME": original_name, "ZORIGINALFILESIZE": int(size),
            "ZREVERSELOCATIONDATA": place,
        })
        if "ZEXTENDEDATTRIBUTES" in self.columns and (camera or lens or focal35):
            self._insert("ZEXTENDEDATTRIBUTES", {
                "ZASSET": pk, "ZCAMERAMODEL": camera, "ZLENSMODEL": lens,
                "ZFOCALLENGTHIN35MM": focal35})
        return pk

    def face(self, asset: int, person: int | None = None, *, kind: int = 1,
             x: float = 0.5, y: float = 0.5, s: float = 0.3,
             hidden: bool = False, trashed: bool = False, pk: int | None = None) -> int:
        """Add a face (or a dog/cat: kind 3/4) to an asset."""
        row = {"ZASSETFORFACE": asset, "ZPERSONFORFACE": person,
               "ZDETECTIONTYPE": int(kind), "ZHIDDEN": int(bool(hidden)),
               "ZISINTRASH": int(bool(trashed)), "ZCENTERX": x,
               "ZCENTERY": y, "ZSIZE": s}
        if pk is not None:
            row["Z_PK"] = pk
        return self._insert("ZDETECTEDFACE", row)

    def person(self, name: str | None = None, *, kind: int = 1, ztype: int = 0,
               merge_into: int | None = None, keyface: int | None = None,
               full_name: str | None = None, pk: int | None = None) -> int:
        """Add a person. `merge_into` fills ZMERGETARGETPERSON."""
        row = {"ZFULLNAME": full_name if full_name is not None else name,
               "ZDISPLAYNAME": name, "ZDETECTIONTYPE": int(kind), "ZKEYFACE": keyface,
               "ZTYPE": int(ztype), "ZMERGETARGETPERSON": merge_into}
        if pk is not None:
            row["Z_PK"] = pk
        return self._insert("ZPERSON", row)

    def moment(self, title: str | None, subtitle: str | None = "", *,
               pk: int | None = None) -> int:
        row = {"ZTITLE": title, "ZSUBTITLE": subtitle}
        if pk is not None:
            row["Z_PK"] = pk
        return self._insert("ZMOMENT", row)
