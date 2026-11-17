# 🧹 iCleaning

[Español](README.md) · **English**

iCleaning is a free, open source (MIT licensed) tool for reviewing your iPhone
photo library from your computer, sorted by how much space each item takes,
quickly choosing what you want to keep, and saving it to your PC. Afterwards you
can delete what you no longer need from the iPhone or iCloud to free up space.

It is meant for people whose library is full and who do not want to spend hours
scrolling on a phone screen. Everything happens on your computer: your photos
never go through any server of ours.

> iPhone only. It does not work with Android.

## ✨ What you can do

### Two ways to connect the iPhone

| Mode | How it works | When to use it |
|---|---|---|
| **iCloud** | You sign in with your Apple ID on the app's own page: password and two-factor verification code (2FA). | Your photos are in iCloud and you want to browse them without cables. |
| **Cable** | You connect the iPhone over USB and the app reads from it directly, without writing anything. iCloud is not used. | You do not use iCloud, or you have photos that have not been uploaded yet. You only see what is stored on the iPhone itself (with "Optimize iPhone Storage", some photos only live in iCloud). |

### Cleanup suggestions

- **Long videos**, the ones taking up the most space.
- **Screenshots** and **screen recordings**.
- **WhatsApp and social networks**: photos and videos received or saved from
  apps.
- **Leftover burst photos**: the shots in a burst that are not the selected one.
- **Duplicates**.
- **Similar photos**, with the best candidate suggested.
- **Likely failures**, based on the aesthetic score computed by the iPhone
  itself.

### Search and filter

- **Photos-style search**: by people, places, dates, apps and types.
- **People and pets**.
- **Places**: country › city, computed by the iPhone, with no internet
  connection.
- **Content types**: videos, selfies, Live Photos, portraits, panoramas, slow
  motion, time-lapse, screenshots and recordings.
- **Timeline** to pick a date range.
- **Filters** by size, duration, lens (front, ultra wide, telephoto…) and camera.
- **Offline map**: your photos on a world map bundled with the app; your locations never leave your computer.
- **Storage report**: what takes up the most space, by year, type and app.
- **Large view** with a video player.

### Select and save

- **Quick selection**: click, Shift+click for a range, drag to paint, and
  Ctrl/Cmd+A to select everything currently filtered.
- **Save to a folder of your choice**, including an external drive, **organized
  your way**: Year/Month, Year, Country/City, Person, Type, App/Year, all in one
  folder, or your own template with a live preview. The original date is
  preserved.
- Optional **XMP tags** next to each photo (people, place and type), readable by
  Lightroom, digiKam and other programs.
- The **originals are saved unedited**. Edits made on the iPhone (crops,
  filters…) are not included.
- **Interface in Spanish and English** and a **dark mode**.

## 🔌 Classification: connect the iPhone once over cable

Suggestions by people, places, apps, types and bursts are computed from the
iPhone's Photos database. In **cable mode** this happens automatically. In
**iCloud mode** you connect the iPhone **over cable once** and let the app copy
that database in read-only mode.

Without that step, the **size, date and type** filters still work, but automatic
classification does not.

## 🗑️ Deleting photos

Save whatever you want to keep before deleting. The app asks for **double
confirmation**, and the delete button **becomes active after 7 seconds** so you
have time to read what you are about to remove.

| Mode | What happens when you delete |
|---|---|
| **iCloud** | Photos go to "Recently Deleted" for 30 days. They **still take up space** in iCloud until you empty that folder. |
| **Cable** | Deletion is **permanent**. It only works if "iCloud Photos" is turned off on the iPhone. It is an **experimental** feature. |

## 🔒 Privacy and security

- **Everything happens on your computer.** The interface is a page served by the
  app itself on `127.0.0.1`, so it is not reachable from your local network or
  the internet.
- Each launch generates a **random token**, and the app checks the `Host` and
  `Origin` headers in addition to applying CSP headers.
- **No telemetry or analytics.** The app only connects to Apple (iCloud) and, in
  cable mode, to the iPhone.
- **Your password is never stored.**
- The **iCloud session is stored encrypted**. The key lives in the system
  keychain (Keychain on macOS, Credential Manager on Windows, Secret
  Service/keyring on Linux). If no keychain is available, it is stored in a file
  only your user can read.
- iCloud mode uses the **unofficial iCloud API** through the
  [pyicloud](https://github.com/timlaing/pyicloud) library. Apple may change it
  and break it.
- iCleaning is **not affiliated with Apple**. iPhone and iCloud are trademarks
  of Apple Inc.

### If you have Advanced Data Protection enabled

iCloud will not allow photo access from outside until you turn on "Access iCloud
Data on the Web" in **Settings › your name › iCloud**. Do that before trying to
sign in to iCloud mode.

### Where it stores its data

| System | Folder |
|---|---|
| Linux | `~/.local/share/iCleaning` |
| macOS | `~/Library/Application Support/iCleaning` |
| Windows | `%LOCALAPPDATA%\iCleaning` |

That folder holds the encrypted session, thumbnails, the library list and the
copy of the Photos database.

You can **sign out and delete the app's local data** from the account menu. This
does not touch photos you have already saved to your PC.

## ⬇️ Installation

Download the file from the repository's **Releases page** on GitHub.

| Platform | File |
|---|---|
| Windows | `iCleaning-windows-x64.exe` |
| macOS (Apple Silicon) | `iCleaning-macos-arm64.zip` |
| macOS (Intel) | `iCleaning-macos-x64.zip` |
| Linux | `iCleaning-linux-x64` |

### Windows

1. Run `iCleaning-windows-x64.exe`.
2. The first time, SmartScreen will warn that the app is not signed. Click
   **"More info" › "Run anyway"**.
3. For **cable mode** you need the **"Apple Devices"** app from the Microsoft
   Store, or iTunes installed.

### macOS

1. Unzip the archive that matches your Mac.
2. The app is not signed by Apple. The first time, macOS will refuse to open it:
   go to **System Settings › Privacy & Security** and click **"Open Anyway"**.
3. **Cable mode** needs nothing else installed.
4. The app **has no window of its own**: it opens your browser. To exit, use
   **"Quit"** in the account menu.

### Linux

1. Download `iCleaning-linux-x64` and make it executable:
   ```sh
   chmod +x iCleaning-linux-x64
   ```
2. Run it.
3. For **cable mode** you need `usbmuxd` installed. If deleting over cable says
   the iPhone is busy, close your file manager (GNOME/KDE may hold on to the
   device).

### Verifying the download

The Releases page also includes `SHA256SUMS.txt`. You can check the integrity of
the downloaded file:

```sh
# Windows
certutil -hashfile iCleaning-windows-x64.exe SHA256

# macOS
shasum -a 256 <file>

# Linux
sha256sum -c SHA256SUMS.txt --ignore-missing
```

### When you launch it

- Your browser opens with the interface.
- If it is already running, launching it again just takes you to the same page.
- It shuts itself down if no tab is open for a while and no jobs are running.

## ❓ Frequently asked questions

**I am not receiving the verification code (2FA).**
On the iPhone, go to **Settings › your name › Sign-In & Security › Get
Verification Code**.

**I deleted photos and iCloud is still full.**
Deleted photos go to "Recently Deleted" and keep taking up space for 30 days.
Empty that folder on the iPhone to actually free it.

**Is quality lost when saving?**
No. The original is saved, without recompression or modification.

**I edited a photo on the iPhone and the edit is missing.**
The original is saved without the edit. Changes made in the iPhone Photos app are
not included.

**Does it work with Android?**
No, iPhone only.

## 🛠️ Development

Requirements: Python 3.11 or newer and [uv](https://github.com/astral-sh/uv).

```sh
uv venv .venv --python 3.12
VIRTUAL_ENV=$PWD/.venv uv pip install -r requirements.txt
python -m icleaning
```

Useful options:

| Option | What it does |
|---|---|
| `--demo` | Fake data, to try it without iCloud or an iPhone. |
| `--no-open` | Do not open the browser automatically. |
| `--port` | Choose the local port. |
| `--data` | App data folder (the system one by default). |
| `--no-auto-quit` | Do not quit when no tabs are left open. |
| `--verbose` | Verbose logging. |

Tests:

```sh
pytest
```

### Structure

```
icleaning/
├── main.py          entry point
├── app.py           application logic
├── server.py        local interface server
├── photosdb.py      Photos database reader
├── organize.py      folder templates and XMP
├── secure_store.py  encrypted storage and keychain
├── sources/
│   ├── icloud.py    iCloud mode (pyicloud)
│   ├── usb.py       cable mode
│   ├── ptp*.py      iPhone PTP protocol
│   └── demo.py      fake data for --demo
└── web/             interface
```

### Executables

Binaries are built with PyInstaller:

```sh
pyinstaller packaging/icleaning.spec
```

The CI workflow lives in `.github/workflows/build.yml`: it builds the Windows,
macOS and Linux versions and publishes a **draft release** with `SHA256SUMS.txt`
to verify the downloads.

## 📄 License

MIT. See [LICENSE](LICENSE).

iPhone and iCloud are trademarks of Apple Inc. This project is not affiliated
with Apple.
