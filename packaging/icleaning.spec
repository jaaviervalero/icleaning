# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller: one spec for Windows, macOS and Linux.

Run from the repository root:  pyinstaller packaging/icleaning.spec

- Windows and Linux: a single windowless executable (onefile) with an icon.
- macOS: "iCleaning.app" with LSUIElement, so it has no Dock icon: the app only serves the
  local page and opens the browser; it is closed from the page ("Quit") or quits by itself
  when no tab has been open for a while.
"""
import glob
import os
import sys

from PyInstaller.utils.hooks import (collect_all, collect_data_files, collect_submodules,
                                     copy_metadata, get_package_paths)

ROOT = os.path.abspath(os.path.join(SPECPATH, ".."))
ICON_PNG = os.path.join(ROOT, "packaging", "icon.png")
ICON_ICO = os.path.join(ROOT, "packaging", "icon.ico")
ICON_ICNS = os.path.join(ROOT, "packaging", "icon.icns")
VERSION = "0.9.0"

# The UI is static HTML/CSS/JS served by the app from inside the package.
datas = [(os.path.join(ROOT, "icleaning", "web"), "icleaning/web")]
binaries = []

# Library data files (device lists, certificates, templates...).
datas += collect_data_files("pymobiledevice3")
datas += collect_data_files("pyicloud")

# keyring, pymobiledevice3 and pyicloud read importlib.metadata / entry points at run time.
datas += copy_metadata("keyring")
datas += copy_metadata("pymobiledevice3")
datas += copy_metadata("pyicloud")

# keyring loads its backends by name, and pymobiledevice3/pyicloud resolve some modules dynamically.
hiddenimports = collect_submodules("keyring.backends")
hiddenimports += collect_submodules("pymobiledevice3")
hiddenimports += collect_submodules("pyicloud")

if sys.platform.startswith("linux"):
    # Secret Service keyring backend pieces (imported dynamically).
    hiddenimports += ["jaraco.classes", "jaraco.context", "jaraco.functools", "secretstorage", "jeepney"]
    # python-gphoto2 ships libgphoto2 and loads its camera/port drivers as plugins at run time.
    g_datas, g_binaries, g_hidden = collect_all("gphoto2")
    datas += g_datas
    binaries += g_binaries
    hiddenimports += g_hidden
    # collect_all() leaves out the plugin *.so files (it skips shared libraries), and libgphoto2
    # needs them to find the iPhone (CAMLIBS) and open USB (IOLIBS). gphoto2/__init__.py points
    # both variables at these folders inside the package, so they keep the same relative layout.
    gphoto2_dir = get_package_paths("gphoto2")[1]
    for plugins in ("camlibs", "iolibs"):
        src = os.path.join(gphoto2_dir, "libgphoto2", plugins)
        dest = os.path.join("gphoto2", "libgphoto2", plugins)
        binaries += [(p, dest) for p in glob.glob(os.path.join(src, "*.so"))]

a = Analysis(
    [os.path.join(ROOT, "icleaning", "__main__.py")],
    pathex=[ROOT],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "IPython", "matplotlib"],
    noarchive=False,
)
pyz = PYZ(a.pure)

# UPX is off everywhere: compressed executables trigger more antivirus false positives.
if sys.platform == "darwin":
    exe = EXE(pyz, a.scripts, [], exclude_binaries=True, name="iCleaning", debug=False,
              bootloader_ignore_signals=False, strip=False, upx=False, console=False,
              disable_windowed_traceback=False)
    coll = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, name="iCleaning")
    app = BUNDLE(
        coll,
        name="iCleaning.app",
        icon=ICON_ICNS,
        bundle_identifier="io.github.icleaning",
        info_plist={
            "LSUIElement": True,
            "CFBundleDisplayName": "iCleaning",
            "CFBundleShortVersionString": VERSION,
            "CFBundleVersion": VERSION,
            "NSHighResolutionCapable": True,
        },
    )
else:
    exe = EXE(pyz, a.scripts, a.binaries, a.datas, [], name="iCleaning", debug=False,
              bootloader_ignore_signals=False, strip=False, upx=False, runtime_tmpdir=None,
              console=False, disable_windowed_traceback=False,
              icon=ICON_ICO if sys.platform == "win32" else ICON_PNG)
