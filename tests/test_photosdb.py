"""Tests for `icleaning.photosdb` with a synthetic Photos.sqlite (never a real one)."""
from __future__ import annotations

import plistlib

import pytest

from photosdb_factory import place_blob
from icleaning.photosdb import (APPLE_EPOCH, MIN_PHOTOS_UNNAMED, Classification,
                                  classify, name_date_key, place_from_blob, unarchive)


def cats(cls: Classification, uuid: str) -> list:
    return cls.info[uuid.upper()]["c"]


# ------------------------------------------------------------------ categories by source

@pytest.mark.parametrize("bundle, category", [
    ("net.whatsapp.WhatsApp", "whatsapp"),
    ("com.burbn.instagram", "social"),
    ("com.zhiliaoapp.musically", "social"),
    ("com.burbn.barcelona", "social"),
    ("ph.telegra.Telegraph", "messaging"),
    ("com.facebook.Messenger", "messaging"),
    ("com.apple.sharingd.ShareSheet", "airdrop"),
    ("com.spotify.client", "other_apps"),
    ("com.apple.mobilesafari", "other_apps"),
    ("com.apple.DocumentsApp", "other_apps"),
])
def test_source_by_bundle(factory, bundle, category):
    factory.asset(uuid="U1", bundle=bundle)
    cls = classify(factory.path)
    assert cats(cls, "U1") == [category]


def test_camera_by_bundle_and_by_imported(factory):
    factory.asset(uuid="C1", bundle="com.apple.camera", date=0)
    factory.asset(uuid="C2", impby=1, date=100)   # imported from the camera roll
    factory.asset(uuid="C3", impby=2, date=200)
    factory.asset(uuid="C4", impby=1, bundle="com.apple.mobilesafari", date=300)
    cls = classify(factory.path)
    assert cats(cls, "C1") == ["camera"]
    assert cats(cls, "C2") == ["camera"]
    assert cats(cls, "C3") == ["camera"]
    assert cats(cls, "C4") == ["other_apps"]       # with a bundle, the bundle wins


def test_screen_recording(factory):
    factory.asset(uuid="G1", subtype=103, kind=1)               # by ZKINDSUBTYPE
    factory.asset(uuid="G2", bundle="com.apple.replayd", kind=1)  # by bundle
    cls = classify(factory.path)
    assert "screen_recording" in cats(cls, "G1")
    assert "screen_recording" in cats(cls, "G2")


def test_screenshot(factory):
    factory.asset(uuid="S1", screenshot=True)
    factory.asset(uuid="S2", subtype=10)
    cls = classify(factory.path)
    assert cats(cls, "S1") == ["screenshot"]
    assert cats(cls, "S2") == ["screenshot"]


def test_burst_only_with_pick_2(factory):
    factory.asset(uuid="R1", avalanche="AVAL-1", pick=1)
    factory.asset(uuid="R2", avalanche="AVAL-1", pick=2)
    factory.asset(uuid="R3", avalanche="AVAL-2", pick=0)   # pick 0 is not a burst
    cls = classify(factory.path)
    assert "burst" not in cats(cls, "R1")
    assert "burst" in cats(cls, "R2")
    assert "burst" not in cats(cls, "R3")


@pytest.mark.parametrize("subtype, category", [
    (2, "live"),
    (1, "panorama"),
    (101, "slomo"),
    (102, "timelapse"),
])
def test_subtypes(factory, subtype, category):
    factory.asset(uuid="T1", subtype=subtype, kind=1 if subtype in (101, 102) else 0)
    assert category in cats(classify(factory.path), "T1")


def test_portrait_only_in_photo(factory):
    factory.asset(uuid="P1", depth=1)
    factory.asset(uuid="P2", depth=1, kind=1)
    cls = classify(factory.path)
    assert "portrait" in cats(cls, "P1")
    assert "portrait" not in cats(cls, "P2")


def test_selfie_with_front_lens(factory):
    factory.asset(uuid="F1", lens="Front Camera", focal35=24)
    factory.asset(uuid="F2", lens="Back Camera", focal35=24)
    factory.asset(uuid="F3", lens="Front Camera", screenshot=True)
    cls = classify(factory.path)
    assert "selfie" in cats(cls, "F1")
    assert cls.info["F1"]["lens"] == "front"
    assert "selfie" not in cats(cls, "F2")
    assert cls.info["F2"]["lens"] == "main"
    assert "selfie" not in cats(cls, "F3")     # a screenshot with the front lens is not a selfie


def test_lens_targets_by_focal_length(factory):
    factory.asset(uuid="O1", lens="Back", focal35=13)
    factory.asset(uuid="O2", lens="Back", focal35=77)
    cls = classify(factory.path)
    assert cls.info["O1"]["lens"] == "ultra"
    assert cls.info["O2"]["lens"] == "tele"


def test_favorite_and_hidden(factory):
    factory.asset(uuid="X1", favorite=True, hidden=True)
    cls = classify(factory.path)
    assert "favorite" in cats(cls, "X1")
    assert "hidden" in cats(cls, "X1")
    assert cls.rows[0]["hidden"] is True


def test_pet_dog_and_cat(factory):
    a1 = factory.asset(uuid="M1")
    a2 = factory.asset(uuid="M2")
    a3 = factory.asset(uuid="M3")
    factory.face(a1, kind=3)                    # dog
    factory.face(a2, kind=4)                    # cat
    factory.face(a3, kind=3)
    factory.face(a3, kind=4)                    # both in the same photo
    cls = classify(factory.path)
    assert cats(cls, "M1") == ["pet", "dog"]
    assert cats(cls, "M2") == ["pet", "cat"]
    assert cats(cls, "M3") == ["pet", "cat", "dog"]


def test_duplicate_by_stable_hash(factory):
    factory.asset(uuid="D1", hash_="HASH-A")
    factory.asset(uuid="D2", hash_="HASH-A")
    factory.asset(uuid="D3", hash_="HASH-B")
    factory.asset(uuid="D4", hash_=None)
    cls = classify(factory.path)
    assert "duplicate" not in cats(cls, "D1")
    assert "duplicate" in cats(cls, "D2")
    assert "duplicate" not in cats(cls, "D3")
    assert "duplicate" not in cats(cls, "D4")


def test_outside_the_library(factory):
    factory.asset(uuid="V1", trashed=1)          # in the trash
    factory.asset(uuid="V2", saved=0)            # not a library asset
    factory.asset(uuid="V3", saved=5)
    cls = classify(factory.path)
    assert cls.info == {}
    assert cls.rows == []


# ------------------------------------------------------------------ people

def test_people_names_merge_face_and_order(factory):
    ana = factory.person("Ana")
    massive = factory.person(None)
    small = factory.person(None)
    old = factory.person("Old", ztype=-1)
    final = factory.person("Final")
    middle = factory.person(None, merge_into=final)
    tail = factory.person(None, merge_into=middle)

    a1 = factory.asset(uuid="A1")
    a2 = factory.asset(uuid="A2")
    a3 = factory.asset(uuid="A3")
    a4 = factory.asset(uuid="A4")
    a5 = factory.asset(uuid="A5")
    ana_face = factory.face(a1, ana, x=0.25, y=0.3, s=0.4)
    factory.conn.execute("UPDATE ZPERSON SET ZKEYFACE = ? WHERE Z_PK = ?", (ana_face, ana))
    factory.face(a2, ana)
    factory.face(a1, old)
    factory.face(a3, final)
    factory.face(a4, middle)
    factory.face(a5, tail)                      # chain tail -> middle -> final
    for i in range(MIN_PHOTOS_UNNAMED):
        factory.face(factory.asset(uuid=f"MF{i:02d}"), massive)
    for i in range(3):
        factory.face(factory.asset(uuid=f"PQ{i:02d}"), small)
    # hidden face and face of an asset in the trash: they do not count
    hidden = factory.asset(uuid="OC1")
    factory.face(hidden, ana, hidden=True)
    trash = factory.asset(uuid="BA1", trashed=1)
    factory.face(trash, ana)

    cls = classify(factory.path)
    names = [p["name"] for p in cls.people]
    assert names == ["Final", "Ana", ""]          # named first; then the massive one
    assert [p["n"] for p in cls.people] == [3, 2, MIN_PHOTOS_UNNAMED]
    assert [p["id"] for p in cls.people] == [0, 1, 2]
    assert all(p["kind"] == "person" for p in cls.people)

    p_ana = cls.people[1]
    assert p_ana["face"] == {"a": "A1", "x": 0.25, "y": 0.3, "s": 0.4}
    assert isinstance(ana_face, int)
    # the massive unnamed one has no key face
    assert cls.people[2]["face"] is None
    # the one with ZTYPE -1 does not appear
    assert "Old" not in names


def test_unnamed_people_below_threshold(factory):
    p = factory.person(None)
    for i in range(MIN_PHOTOS_UNNAMED - 1):
        factory.face(factory.asset(uuid=f"N{i:02d}"), p)
    assert classify(factory.path).people == []


def test_person_without_key_face(factory):
    factory.person("NoFace")
    p = factory.person("WithFace", keyface=None)
    a = factory.asset(uuid="K1")
    factory.face(a, p)
    cls = classify(factory.path)
    # NoFace has no faces (n=0) and is not listed
    assert [x["name"] for x in cls.people] == ["WithFace"]
    assert cls.people[0]["face"] is None


def test_face_points_to_included_asset(factory):
    p = factory.person("Ana")
    a = factory.asset(uuid="A1")
    face = factory.face(a, p)
    factory.conn.execute("UPDATE ZPERSON SET ZKEYFACE = ? WHERE ZDISPLAYNAME = 'Ana'", (face,))
    cls = classify(factory.path)
    assert cls.people[0]["face"]["a"] == "A1"


# ------------------------------------------------------------------ places and moments

def test_places_deduplicated_and_without_street(factory):
    zgz = place_blob()
    bcn = place_blob(country="España", region="Cataluña", city="Barcelona", iso="ES")
    factory.asset(uuid="L1", place=zgz)
    factory.asset(uuid="L2", place=zgz)            # same place: deduplicated
    factory.asset(uuid="L3", place=bcn)
    factory.asset(uuid="L4", place=None)
    cls = classify(factory.path)
    assert cls.places == [["España", "Aragón", "Zaragoza", "ES"],
                          ["España", "Cataluña", "Barcelona", "ES"]]
    assert cls.info["L1"]["pl"] == cls.info["L2"]["pl"] == 0
    assert cls.info["L3"]["pl"] == 1
    assert "pl" not in cls.info["L4"]
    assert "Calle Mayor" not in str(cls.places)


def test_place_iso_from_country_code():
    blob = place_blob(iso=None, country_code="pt")
    assert place_from_blob(blob) == ("España", "Aragón", "Zaragoza", "PT")


def test_place_blob_broken_or_empty(factory):
    assert place_from_blob(None) is None
    assert place_from_blob(b"not a plist") is None
    factory.asset(uuid="L1", place=b"junk")
    assert "pl" not in classify(factory.path).info["L1"]


def test_unarchive_returns_the_tree(factory):
    d = unarchive(place_blob(country="Portugal", region="Lisboa", city="Lisboa", iso="PT"))
    assert d["countryCode"] == "PT"
    assert d["postalAddress"]["_city"] == "Lisboa"
    assert d["postalAddress"]["_street"] == "Calle Mayor 1"


def test_place_blob_is_a_real_nskeyedarchiver():
    data = plistlib.loads(place_blob())
    assert data["$archiver"] == "NSKeyedArchiver"
    assert data["$version"] == 100000
    assert isinstance(data["$top"]["root"], plistlib.UID)
    postal = data["$objects"][data["$top"]["root"].data]["postalAddress"]
    address = data["$objects"][postal.data]
    assert all(isinstance(k, plistlib.UID) for k in address["NS.keys"])
    assert all(isinstance(v, plistlib.UID) for v in address["NS.objects"])


def test_moments(factory):
    m1 = factory.moment("Escapada a Lisboa", "Lisboa")
    factory.moment(None, "untitled")
    m3 = factory.moment("Cumpleaños", "Zaragoza")
    factory.asset(uuid="Z1", moment=m1)
    factory.asset(uuid="Z2", moment=m3)
    factory.asset(uuid="Z3")
    cls = classify(factory.path)
    assert cls.moments == [["Escapada a Lisboa", "Lisboa"], ["Cumpleaños", "Zaragoza"]]
    assert cls.info["Z1"]["m"] == 0
    assert cls.info["Z2"]["m"] == 1
    assert "m" not in cls.info["Z3"]


# ------------------------------------------------------------------ «similar» series

def test_similar_series_chain_and_best(factory):
    # chain with gaps of 2, 1 and 3 seconds: all in the same series
    factory.asset(uuid="S1", bundle="com.apple.camera", date=1000.0, aesthetic=0.20)
    factory.asset(uuid="S2", bundle="com.apple.camera", date=1002.0, aesthetic=0.50)
    factory.asset(uuid="S3", bundle="com.apple.camera", date=1003.0, aesthetic=0.30)
    factory.asset(uuid="S5", bundle="com.apple.camera", date=1006.0, aesthetic=0.40)
    # outside the series: video, screenshot and burst even if they fall in between
    factory.asset(uuid="VID", bundle="com.apple.camera", date=1001.0, kind=1)
    factory.asset(uuid="CAP", bundle="com.apple.camera", date=1001.5, screenshot=True)
    factory.asset(uuid="RAF", bundle="com.apple.camera", date=1001.8, avalanche="AV", pick=2)
    # lone photo, far from the chain
    factory.asset(uuid="SOLA", bundle="com.apple.camera", date=1020.0, aesthetic=0.10)

    cls = classify(factory.path)
    assert cls.info["S2"].get("best") is True
    assert all("similar" in cats(cls, u) for u in ("S1", "S3", "S5"))
    assert "similar" not in cats(cls, "S2")
    assert {cls.info[u]["g"] for u in ("S1", "S2", "S3", "S5")} == {0}
    for u in ("VID", "CAP", "RAF", "SOLA"):
        assert "similar" not in cats(cls, u)
        assert "g" not in cls.info[u]


def test_series_separated_by_more_than_three_seconds(factory):
    factory.asset(uuid="S1", bundle="com.apple.camera", date=1000.0, aesthetic=0.5)
    factory.asset(uuid="S2", bundle="com.apple.camera", date=1003.5, aesthetic=0.5)
    cls = classify(factory.path)
    assert "similar" not in cats(cls, "S1")
    assert "similar" not in cats(cls, "S2")


# ------------------------------------------------------------------ probably poor

def test_poor_only_with_more_than_50_notes(factory):
    for i in range(50):
        factory.asset(uuid=f"F{i:02d}", bundle="com.apple.camera",
                      date=1000.0 + i * 60, aesthetic=(i + 1) / 100)
    cls = classify(factory.path)
    assert all("poor" not in info["c"] for info in cls.info.values())


def test_poor_8_percent_threshold_and_never_favorites(factory):
    for i in range(60):
        factory.asset(uuid=f"F{i:02d}", bundle="com.apple.camera",
                      date=1000.0 + i * 60, aesthetic=(i + 1) / 100,
                      favorite=(i == 0))
    cls = classify(factory.path)
    # sorted notes: 0.01..0.60; index int(60*0.08)=4 -> threshold 0.05
    poor = {f["uuid"] for f in cls.rows if "poor" in f["info"]["c"]}
    assert poor == {"F01", "F02", "F03", "F04"}
    assert "poor" not in cats(cls, "F00")   # the worst one, but a favorite
    assert "poor" not in cats(cls, "F05")


# ------------------------------------------------------------------ keys and rows

def test_name_date_key_and_lookup(factory):
    factory.asset(uuid="K1", file="IMG_0001.HEIC", date=500.0, size=2048)
    cls = classify(factory.path)
    info = cls.info["K1"]
    assert cls.lookup("k1") is info
    assert cls.lookup("K1", "IMG_0001.HEIC", 500 + APPLE_EPOCH) is info
    assert cls.lookup("DOES-NOT-EXIST") is None
    assert cls.lookup("", "IMG_0001.HEIC", 0) is None
    assert name_date_key("IMG_0001.HEIC", 500 + APPLE_EPOCH) == f"IMG_0001.HEIC|{500 + APPLE_EPOCH}"


def test_rows_with_raw_data(factory):
    factory.asset(uuid="FIL1", folder="/DCIM/100APPLE", file="IMG_0001.HEIC",
                  original_name="IMG_0001.HEIC", size=1234, date=100.0,
                  hidden=True, avalanche="AV", pick=2)
    cls = classify(factory.path)
    row = cls.rows[0]
    assert row["uuid"] == "FIL1"
    assert row["dir"] == "/DCIM/100APPLE"
    assert row["file"] == "IMG_0001.HEIC"
    assert row["name"] == "IMG_0001.HEIC"
    assert row["size"] == 1234
    assert row["date"] == 100.0 + APPLE_EPOCH
    assert row["hidden"] is True
    assert row["discarded_burst"] is True
    assert row["info"] is cls.info["FIL1"]


def test_name_in_rows_falls_back_to_file(factory):
    factory.asset(uuid="FIL2", file="VID_0002.MOV", original_name="")
    row = classify(factory.path).rows[0]
    assert row["name"] == "VID_0002.MOV"


# ------------------------------------------------------------------ old database and errors

def test_old_db_without_optional_columns(old_factory):
    old_factory.asset(uuid="OLD1", screenshot=True, depth=1, aesthetic=0.9,
                      camera="iPhone 8", lens="Back", focal35=28, subtype=10)
    cls = classify(old_factory.path)
    info = cls.info["OLD1"]
    assert "screenshot" in info["c"]           # by subtype 10, not by the missing column
    assert "portrait" not in info["c"]         # ZDEPTHTYPE does not exist
    assert "q" not in info                     # ZOVERALLAESTHETICSCORE does not exist
    assert "cam" not in info                   # there is no ZEXTENDEDATTRIBUTES
    assert cls.cameras == []


def test_nonexistent_path_or_none(tmp_path):
    for path in (None, tmp_path / "does-not-exist.sqlite"):
        cls = classify(path)
        assert cls.info == {} and cls.people == [] and cls.places == []
        assert cls.cameras == [] and cls.moments == [] and cls.rows == []
