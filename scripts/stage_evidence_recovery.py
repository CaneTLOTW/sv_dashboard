"""Stage a private new evidence journal from same-vehicle HA Store copies."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path

spec = importlib.util.spec_from_file_location("evidence", Path(__file__).parents[1]/"custom_components/sv_dashboard/evidence_archive.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
SUFFIXES = ("metrics","fuel_history","departure_plans","notifications","server_history","charge_curves")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--vehicle-prefix", required=True)
    parser.add_argument("--store", type=Path, action="append", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists() or args.output.is_symlink():
        raise ValueError("output exists")
    records = set()
    for path in args.store:
        raw = path.read_bytes()
        obj = json.loads(raw)
        key = obj.get("key")
        suffix = next((s for s in SUFFIXES if key == args.vehicle_prefix + "_" + s), None)
        if obj.get("version") != 1 or not suffix or not isinstance(obj.get("data"), dict):
            raise ValueError("unsupported or different vehicle Store")
        incoming = set(m.source_records(suffix, obj["data"]))
        records.update(incoming)
        print(suffix, len(incoming), hashlib.sha256(raw).hexdigest())
    if not records:
        raise ValueError("no evidence to import")
    # Reserve exclusively, then write a staging database; never replace a Store.
    fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    os.close(fd)
    count = m.write_records(args.output, list(records))
    if count != len(records):
        raise ValueError("staging record count mismatch")
    print("Unique evidence revisions:", count)
    print("Output SHA-256:", hashlib.sha256(args.output.read_bytes()).hexdigest())


if __name__ == "__main__":
    main()
