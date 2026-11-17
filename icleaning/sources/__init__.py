"""Photo sources: where the photo library comes from. iPhone only.

- `demo`   made-up data (to try the interface without iCloud or an iPhone).
- `icloud` iCloud Photos with the user's Apple ID (pyicloud).
- `usb`    the iPhone over cable, without iCloud (pymobiledevice3 to read; PTP to delete).

Contract every source fulfils (used by icleaning.app and icleaning.model.Jobs):

    name: str                      "demo" | "icloud" | "usb"
    permanent_delete: bool         True if deleting skips «Recently Deleted» (usb)
    download_threads: int          parallel downloads when saving

    list_items(progress) -> list[Item]
        progress(done: int, total: int) is called from time to time.
    read_cache() -> list[Item] | None              (optional) list from the previous start
    classification() -> photosdb.Classification | None   (optional) if the source brings its own
    image(item, large: bool) -> (bytes, mime) | (None, None)
    open_video(item, range_header: str | None) -> response | None
        response: context manager with .status_code (200/206), .headers (dict with Content-Length,
        Content-Range, Accept-Ranges when applicable) and .iter_content(n) -> bytes.
    download(item, key: str, dest: Path, chunk_cb) -> int (bytes written)
        key is the third position of each tuple in item.parts. chunk_cb(n) for every chunk.
    delete(item) -> None   (raises if it fails)
    delete_many(items) -> Iterator[(Item, Exception | None)]   (optional; takes precedence)
"""
