"""Stream the family roster workbook into newline-delimited JSON for the MongoDB importer."""

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

from openpyxl import load_workbook

EXCEL_EPOCH = dt.date(1899, 12, 30)
MIN_DATE = dt.date(1900, 1, 1)
MAX_DATE = dt.date.today() + dt.timedelta(days=1)
SPACE = re.compile(r"\s+")


def clean(value):
    if value is None:
        return None
    text = SPACE.sub(" ", str(value)).strip()
    return text or None


def normalize_date(value):
    if isinstance(value, dt.datetime):
        value = value.date()
    elif isinstance(value, dt.date):
        pass
    elif isinstance(value, (int, float)):
        try:
            value = EXCEL_EPOCH + dt.timedelta(days=int(value))
        except (OverflowError, ValueError):
            return None
    else:
        return None

    if value is None or not (MIN_DATE <= value <= MAX_DATE):
        return None
    return value.isoformat()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    default_excel = Path(__file__).resolve().parents[2] / "R6_508K_HH.xlsx"
    parser.add_argument("excel", nargs="?", type=Path, default=default_excel)
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "data" / "members.ndjson",
    )
    args = parser.parse_args()

    if not args.excel.is_file():
        parser.error(f"Excel file not found: {args.excel}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    workbook = load_workbook(args.excel, read_only=True, data_only=True)
    sheet = workbook["data"] if "data" in workbook.sheetnames else workbook.active

    written = 0
    skipped = 0
    with args.output.open("w", encoding="utf-8") as output:
        for row in sheet.iter_rows(min_row=2, values_only=True):
            hh_id = clean(row[0])
            if not hh_id:
                skipped += 1
                continue

            sex = clean(row[6])
            sex = sex[:1].upper() if sex and sex[:1].upper() in ("M", "F") else None

            record = {
                "hh_id": hh_id,
                "last_name": clean(row[1]),
                "first_name": clean(row[2]),
                "middle_name": clean(row[3]),
                "ext_name": clean(row[4]),
                "birthdate": normalize_date(row[5]),
                "sex": sex,
                "province": clean(row[7]),
                "municipality": clean(row[8]),
                "barangay": clean(row[9]),
            }
            output.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
            written += 1

            if written % 100000 == 0:
                print(f"Converted {written:,} rows...", flush=True)

    workbook.close()
    print(f"Done: {written:,} rows written, {skipped:,} skipped -> {args.output}", flush=True)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
