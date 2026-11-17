"""Made-up data to try the interface without iCloud, without an iPhone and without seeing anyone's photos."""
from __future__ import annotations

import random
import time
from datetime import datetime

from ..model import Item
from ..photosdb import Classification

PEOPLE = [("Ana", "person"), ("Luis", "person"), ("Marta", "person"), ("Pablo", "person"),
          ("Lucía", "person"), ("Toby", "dog"), ("", "person"), ("", "person")]
PLACES = [["España", "Aragón", "Zaragoza", "ES"], ["España", "Cataluña", "Barcelona", "ES"],
          ["España", "Comunidad de Madrid", "Madrid", "ES"], ["Portugal", "Lisboa", "Lisboa", "PT"],
          ["Francia", "Île-de-France", "París", "FR"], ["Italia", "Lazio", "Roma", "IT"],
          ["Polonia", "Pequeña Polonia", "Cracovia", "PL"]]
PLACE_COORDS = [(41.65, -0.88), (41.39, 2.17), (40.42, -3.70), (38.72, -9.14),
                (48.86, 2.35), (41.90, 12.50), (50.06, 19.94)]
CAMERAS = ["iPhone 15", "iPhone 11", "iPhone 13 mini"]


class DemoSource:
    name = "demo"
    permanent_delete = False
    download_threads = 4

    def __init__(self, n=3000):
        rnd = random.Random(7)
        self.items = []
        t0 = datetime(2021, 1, 1).timestamp()
        apps = ["camera"] * 10 + ["whatsapp"] * 3 + ["social", "other_apps", "airdrop", "messaging"]
        self._classification = Classification(places=PLACES, cameras=CAMERAS,
                                             moments=[["Escapada a Lisboa", "Lisboa"], ["Cumpleaños", "Zaragoza"]])
        last = t0
        for i in range(n):
            video = rnd.random() < 0.12
            series = not video and rnd.random() < 0.25
            date = last + rnd.uniform(0.5, 2.5) if series else t0 + rnd.random() * 6 * 365 * 86400
            last = date
            size = int(rnd.lognormvariate(17.5 if video else 14.5, 1.0))
            name = f"IMG_{i:04d}.{'MOV' if video else 'HEIC'}"
            e = Item(f"DEMO-{i:05d}", name, size, date, "video" if video else "photo", [(name, size, "original")])
            origin = rnd.choice(apps)
            c = [origin]
            if origin != "camera" and not video and rnd.random() < 0.5:
                c.append("screenshot")
            if not video and origin == "camera":
                r = rnd.random()
                c += ["live"] if r < 0.4 else ["portrait"] if r < 0.5 else ["selfie"] if r < 0.6 else []
                if rnd.random() < 0.05:
                    c.append("burst")
                if rnd.random() < 0.04:
                    c.append("poor")
                if rnd.random() < 0.06:
                    c += ["pet", "dog"]
            if video and rnd.random() < 0.1:
                c.append(rnd.choice(["slomo", "timelapse", "screen_recording"]))
            if rnd.random() < 0.03:
                c.append("favorite")
            if rnd.random() < 0.01:
                c.append("duplicate")
            e.cats = c
            e.dur = round(rnd.uniform(3, 600), 1) if video else 0
            ex = {"cam": rnd.randrange(len(CAMERAS)), "q": rnd.randint(5, 70)}
            if "selfie" in c:
                ex["lens"] = "front"
            elif origin == "camera":
                ex["lens"] = rnd.choice(["main", "main", "ultra", "tele"])
            if rnd.random() < 0.55:
                ex["pl"] = rnd.randrange(len(PLACES))
                lat, lon = PLACE_COORDS[ex["pl"]]
                ex["geo"] = [round(lat + rnd.uniform(-0.08, 0.08), 2), round(lon + rnd.uniform(-0.08, 0.08), 2)]
            if rnd.random() < 0.35:
                ex["p"] = sorted(rnd.sample(range(len(PEOPLE)), k=rnd.choice([1, 1, 2, 3])))
            e.extra = ex
            self.items.append(e)
        # runs of «similar» photos
        group, g = [], 0
        for e in sorted(self.items, key=lambda e: e.date):
            if group and e.date - group[-1].date > 3:
                self._close_series(group, g)
                g += 1 if len(group) > 1 else 0
                group = []
            if e.kind == "photo":
                group.append(e)
        self._close_series(group, g)
        counts = {}
        for e in self.items:
            for p in e.extra.get("p", []):
                counts[p] = counts.get(p, 0) + 1
        faces = [e for e in self.items if e.extra.get("p")]
        self._classification.people = [
            {"id": i, "name": n, "kind": t, "n": counts.get(i, 0),
             "face": ({"a": a, "x": .5, "y": .55, "s": .5}
                      if (a := next((e.id for e in faces if i in e.extra["p"]), None)) else None)}
            for i, (n, t) in enumerate(PEOPLE)]

    @staticmethod
    def _close_series(group, g):
        if len(group) < 2:
            return
        best = max(group, key=lambda e: e.extra.get("q", 0))
        for e in group:
            e.extra["g"] = g
            if e is best:
                e.extra["best"] = True
            else:
                e.cats.append("similar")

    def classification(self):
        return self._classification

    def list_items(self, progress):
        progress(len(self.items), len(self.items))
        return self.items

    def image(self, item, large=False):
        h = sum(map(ord, item.id)) * 47 % 360
        txt = f"{item.size / 1e6:.0f} MB"
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" '
               f'fill="hsl({h},42%,52%)"/><circle cx="150" cy="128" r="46" fill="rgba(255,255,255,.28)"/>'
               f'<text x="150" y="228" font-size="28" text-anchor="middle" fill="#fff" '
               f'font-family="system-ui,sans-serif">{"video" if item.kind == "video" else "photo"} · {txt}</text></svg>')
        return svg.encode(), "image/svg+xml"

    def open_video(self, item, range_header=None):
        return None

    def download(self, item, key, dest, chunk_cb):
        time.sleep(0.02)
        dest.write_bytes(b"demo " * 10)
        chunk_cb(item.size)
        return item.size

    def delete(self, item):
        time.sleep(0.01)
