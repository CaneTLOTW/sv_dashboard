"""Offline, non-overwriting staging of verified same-vehicle raw trip backups."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

module_path = Path(__file__).resolve().parents[1] / "custom_components/sv_dashboard/history_archive.py"
spec = importlib.util.spec_from_file_location("archive", module_path)
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)


def read_store(path):
    raw = path.read_bytes()
    value = json.loads(raw)
    if value.get("version") != 1 or not str(value.get("key", "")).endswith("_server_history"):
        raise ValueError("not a supported server history Store")
    rows = value["data"].get("server_trips_raw")
    if not isinstance(rows, list) or not rows:
        raise ValueError("raw server trip array missing or empty; stop")
    if any(not isinstance(row, dict) or not row.get("id") for row in rows):
        raise ValueError("invalid raw rows")
    return value["key"], rows, hashlib.sha256(raw).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--current", required=True, type=Path)
    parser.add_argument("--backup", action="append", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    key, current, current_hash = read_store(args.current)
    merged = archive.empty_trip_archive()
    for path in args.backup:
        other_key, rows, fingerprint = read_store(path)
        if other_key != key:
            raise ValueError("vehicle Store key mismatch")
        merged = archive.merge_trip_versions(merged, rows)
        print("Backup rows:", len(rows), "SHA-256:", fingerprint)
    merged = archive.merge_trip_versions(merged, current)
    latest = {str(row["id"]): row for row in archive.archive_rows(merged)}
    if any(latest[str(row["id"])] != row for row in current):
        raise ValueError("current row conflict; stop")
    if hashlib.sha256(args.current.read_bytes()).hexdigest() != current_hash:
        raise ValueError("current input changed; stop")
    result = {"version": 1, "minor_version": 1, "key": key.removesuffix("_server_history") + "_trip_archive", "data": merged}
    # Exclusive output: never overwrite a source or an existing archive.
    with args.output.open("x", encoding="utf-8") as stream:
        json.dump(result, stream, ensure_ascii=False, allow_nan=False)
    print("Current rows:", len(current), "SHA-256:", current_hash)
    print("Merged unique IDs:", len(latest), "distinct payload versions:", len(merged["versions"]))
    print("Output SHA-256:", hashlib.sha256(args.output.read_bytes()).hexdigest())


if __name__ == "__main__":
    main()
