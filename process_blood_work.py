from __future__ import annotations

import hashlib
import re
import shutil
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import pdfplumber


BASE_DIR = Path(__file__).resolve().parent

PROCESSING_DIR = BASE_DIR / "processing"
PROCESSED_DIR = BASE_DIR / "processed"
ERROR_DIR = BASE_DIR / "error"
OUTPUT_DIR = BASE_DIR / "output"
GRAPHS_DIR = OUTPUT_DIR / "graphs"

RESULTS_FILE = OUTPUT_DIR / "blood_results.csv"
REPORT_FILE = OUTPUT_DIR / "processing_report.csv"


METRIC_ALIASES = {
    "hémoglobine": "Hemoglobin",
    "hemoglobine": "Hemoglobin",
    "hemoglobin": "Hemoglobin",
    "hgb": "Hemoglobin",

    "hématocrite": "Hematocrit",
    "hematocrite": "Hematocrit",
    "hematocrit": "Hematocrit",
    "hct": "Hematocrit",

    "érythrocytes": "Red Blood Cells",
    "erythrocytes": "Red Blood Cells",
    "globules rouges": "Red Blood Cells",
    "red blood cells": "Red Blood Cells",
    "rbc": "Red Blood Cells",

    "leucocytes": "White Blood Cells",
    "globules blancs": "White Blood Cells",
    "white blood cells": "White Blood Cells",
    "wbc": "White Blood Cells",

    "plaquettes": "Platelets",
    "platelets": "Platelets",
    "plt": "Platelets",

    "v.g.m": "MCV",
    "vgm": "MCV",
    "volume globulaire moyen": "MCV",
    "mcv": "MCV",

    "t.c.m.h": "MCH",
    "tcmh": "MCH",
    "mch": "MCH",

    "c.c.m.h": "MCHC",
    "ccmh": "MCHC",
    "mchc": "MCHC",

    "neutrophiles": "Neutrophils",
    "neutrophils": "Neutrophils",

    "lymphocytes": "Lymphocytes",
    "lymphocytes": "Lymphocytes",

    "monocytes": "Monocytes",
    "monocytes": "Monocytes",

    "éosinophiles": "Eosinophils",
    "eosinophiles": "Eosinophils",
    "eosinophils": "Eosinophils",

    "basophiles": "Basophils",
    "basophils": "Basophils",

    "glycémie": "Glucose",
    "glycemie": "Glucose",
    "glucose": "Glucose",

    "hémoglobine glyquée": "HbA1c",
    "hemoglobine glyquee": "HbA1c",
    "hba1c": "HbA1c",

    "créatinine": "Creatinine",
    "creatinine": "Creatinine",

    "urée": "Urea",
    "uree": "Urea",
    "urea": "Urea",

    "ferritine": "Ferritin",
    "ferritin": "Ferritin",

    "fer sérique": "Serum Iron",
    "fer serique": "Serum Iron",
    "serum iron": "Serum Iron",

    "cholestérol total": "Total Cholesterol",
    "cholesterol total": "Total Cholesterol",

    "cholestérol hdl": "HDL Cholesterol",
    "cholesterol hdl": "HDL Cholesterol",
    "hdl": "HDL Cholesterol",

    "cholestérol ldl": "LDL Cholesterol",
    "cholesterol ldl": "LDL Cholesterol",
    "ldl": "LDL Cholesterol",

    "triglycérides": "Triglycerides",
    "triglycerides": "Triglycerides",

    "sodium": "Sodium",
    "potassium": "Potassium",
    "calcium": "Calcium",

    "asat": "AST",
    "ast": "AST",
    "alat": "ALT",
    "alt": "ALT",
    "gamma gt": "Gamma GT",
    "ggt": "Gamma GT",

    "crp": "CRP",
    "protéine c réactive": "CRP",
    "proteine c reactive": "CRP",

    "tsh": "TSH",
    "vitamine d": "Vitamin D",
    "vitamin d": "Vitamin D",
    "vitamine b12": "Vitamin B12",
    "vitamin b12": "Vitamin B12",
}


def create_directories() -> None:
    directories = [
        PROCESSING_DIR,
        PROCESSED_DIR,
        ERROR_DIR,
        OUTPUT_DIR,
        GRAPHS_DIR,
    ]

    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)


def calculate_file_hash(file_path: Path) -> str:
    digest = hashlib.sha256()

    with file_path.open("rb") as file:
        for chunk in iter(lambda: file.read(8192), b""):
            digest.update(chunk)

    return digest.hexdigest()


def extract_pdf_text(pdf_path: Path) -> str:
    pages: list[str] = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            pages.append(page_text)

    return "\n".join(pages)


def extract_test_date(
    text: str,
    filename: str,
) -> pd.Timestamp:
    print(f"Extracting test date from: {filename}")

    filename_patterns = [
        (
            r"(?<!\d)(\d{8})(?!\d)",
            "%Y%m%d",
        ),
        (
            r"(?<!\d)(\d{4}-\d{2}-\d{2})(?!\d)",
            "%Y-%m-%d",
        ),
        (
            r"(?<!\d)(\d{2}-\d{2}-\d{4})(?!\d)",
            "%d-%m-%Y",
        ),
    ]

    for pattern, date_format in filename_patterns:
        match = re.search(pattern, filename)

        if not match:
            continue

        try:
            date_value = datetime.strptime(
                match.group(1),
                date_format,
            )

            print(
                f"Date found in filename: "
                f"{date_value.date().isoformat()}"
            )

            return pd.Timestamp(date_value)

        except ValueError:
            continue

    text_patterns = [
        (
            r"\b(\d{2}/\d{2}/\d{4})\b",
            "%d/%m/%Y",
        ),
        (
            r"\b(\d{2}-\d{2}-\d{4})\b",
            "%d-%m-%Y",
        ),
        (
            r"\b(\d{4}-\d{2}-\d{2})\b",
            "%Y-%m-%d",
        ),
        (
            r"\b(\d{8})\b",
            "%Y%m%d",
        ),
    ]

    for pattern, date_format in text_patterns:
        matches = re.findall(pattern, text)

        for matched_date in matches:
            try:
                date_value = datetime.strptime(
                    matched_date,
                    date_format,
                )

                print(
                    f"Date found in PDF text: "
                    f"{date_value.date().isoformat()}"
                )

                return pd.Timestamp(date_value)

            except ValueError:
                continue

    raise ValueError(
        f"No test date found in PDF text or filename: {filename}"
    )


def normalize_metric_name(raw_name: str) -> str | None:
    normalized = raw_name.strip().lower()

    normalized = re.sub(
        r"\s+",
        " ",
        normalized,
    )

    for alias, canonical_name in sorted(
        METRIC_ALIASES.items(),
        key=lambda item: len(item[0]),
        reverse=True,
    ):
        if alias in normalized:
            return canonical_name

    return None


def parse_number(value: str) -> float:
    cleaned_value = value.strip()

    cleaned_value = cleaned_value.replace("\u00a0", "")
    cleaned_value = cleaned_value.replace(" ", "")
    cleaned_value = cleaned_value.replace(",", ".")

    cleaned_value = re.sub(
        r"^[<>]=?\s*",
        "",
        cleaned_value,
    )

    return float(cleaned_value)


def extract_reference_range(
    line: str,
) -> tuple[float | None, float | None]:
    range_patterns = [
        r"(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)",
        r"de\s+(\d+(?:[.,]\d+)?)\s+à\s+(\d+(?:[.,]\d+)?)",
    ]

    for pattern in range_patterns:
        match = re.search(
            pattern,
            line,
            flags=re.IGNORECASE,
        )

        if match:
            return (
                parse_number(match.group(1)),
                parse_number(match.group(2)),
            )

    return None, None


def extract_unit(line: str) -> str:
    units = [
        "10^12/L",
        "10^9/L",
        "10^6/mm3",
        "10^3/mm3",
        "G/L",
        "T/L",
        "g/L",
        "g/dL",
        "mg/L",
        "mg/dL",
        "µg/L",
        "ug/L",
        "mmol/L",
        "µmol/L",
        "umol/L",
        "nmol/L",
        "mL/min",
        "UI/L",
        "U/L",
        "pg",
        "fL",
        "%",
    ]

    for unit in units:
        match = re.search(
            re.escape(unit),
            line,
            flags=re.IGNORECASE,
        )

        if match:
            return match.group(0)

    return ""


def extract_first_value_after_metric(
    line: str,
    metric_text: str,
) -> float | None:
    metric_position = line.lower().find(metric_text.lower())

    if metric_position < 0:
        return None

    remaining_text = line[
        metric_position + len(metric_text):
    ]

    number_match = re.search(
        r"(?<!\d)[<>]?\s*\d+(?:[.,]\d+)?",
        remaining_text,
    )

    if not number_match:
        return None

    try:
        return parse_number(number_match.group(0))
    except ValueError:
        return None


def extract_metrics(
    text: str,
    test_date: pd.Timestamp,
    source_file: str,
    file_hash: str,
) -> list[dict]:
    results: list[dict] = []
    seen_parameters: set[tuple[str, float, str]] = set()

    for original_line in text.splitlines():
        line = original_line.strip()

        if not line:
            continue

        normalized_line = re.sub(
            r"\s+",
            " ",
            line,
        )

        parameter = normalize_metric_name(normalized_line)

        if parameter is None:
            continue

        matched_alias = None

        for alias in sorted(
            METRIC_ALIASES,
            key=len,
            reverse=True,
        ):
            if alias in normalized_line.lower():
                matched_alias = alias
                break

        if matched_alias is None:
            continue

        value = extract_first_value_after_metric(
            normalized_line,
            matched_alias,
        )

        if value is None:
            continue

        unit = extract_unit(normalized_line)

        reference_min, reference_max = extract_reference_range(
            normalized_line
        )

        duplicate_key = (
            parameter,
            value,
            unit.lower(),
        )

        if duplicate_key in seen_parameters:
            continue

        seen_parameters.add(duplicate_key)

        results.append(
            {
                "date": test_date.date().isoformat(),
                "parameter": parameter,
                "value": value,
                "unit": unit,
                "reference_min": reference_min,
                "reference_max": reference_max,
                "source_file": source_file,
                "file_hash": file_hash,
                "original_line": normalized_line,
            }
        )

    return results


def load_existing_results() -> pd.DataFrame:
    if not RESULTS_FILE.exists():
        return pd.DataFrame()

    try:
        return pd.read_csv(RESULTS_FILE)
    except pd.errors.EmptyDataError:
        return pd.DataFrame()


def save_results(new_results: list[dict]) -> None:
    if not new_results:
        return

    existing_results = load_existing_results()
    new_dataframe = pd.DataFrame(new_results)

    if existing_results.empty:
        combined = new_dataframe
    else:
        combined = pd.concat(
            [existing_results, new_dataframe],
            ignore_index=True,
        )

    duplicate_columns = [
        "date",
        "parameter",
        "value",
        "unit",
        "file_hash",
    ]

    available_duplicate_columns = [
        column
        for column in duplicate_columns
        if column in combined.columns
    ]

    combined = combined.drop_duplicates(
        subset=available_duplicate_columns
    )

    combined["date"] = pd.to_datetime(
        combined["date"],
        errors="coerce",
    )

    combined = combined.dropna(
        subset=["date"]
    )

    combined = combined.sort_values(
        by=["parameter", "unit", "date"]
    )

    combined["date"] = combined[
        "date"
    ].dt.strftime("%Y-%m-%d")

    combined.to_csv(
        RESULTS_FILE,
        index=False,
    )


def file_was_processed(file_hash: str) -> bool:
    existing_results = load_existing_results()

    if existing_results.empty:
        return False

    if "file_hash" not in existing_results.columns:
        return False

    existing_hashes = (
        existing_results["file_hash"]
        .dropna()
        .astype(str)
        .tolist()
    )

    return file_hash in existing_hashes


def safe_destination(
    destination_directory: Path,
    filename: str,
) -> Path:
    destination = destination_directory / filename

    if not destination.exists():
        return destination

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    source_path = Path(filename)

    return destination_directory / (
        f"{source_path.stem}-{timestamp}{source_path.suffix}"
    )


def move_file(
    source: Path,
    destination_directory: Path,
) -> Path:
    destination = safe_destination(
        destination_directory,
        source.name,
    )

    shutil.move(
        str(source),
        str(destination),
    )

    return destination


def clear_old_graphs() -> None:
    for graph_file in GRAPHS_DIR.glob("*.png"):
        graph_file.unlink()


def generate_graphs() -> None:
    if not RESULTS_FILE.exists():
        print("No results file found. Graph generation skipped.")
        return

    data = pd.read_csv(
        RESULTS_FILE,
        parse_dates=["date"],
    )

    if data.empty:
        print("Results file is empty. Graph generation skipped.")
        return

    required_columns = {
        "date",
        "parameter",
        "value",
        "unit",
    }

    missing_columns = required_columns - set(data.columns)

    if missing_columns:
        raise ValueError(
            "Missing result columns: "
            + ", ".join(sorted(missing_columns))
        )

    clear_old_graphs()

    data["unit"] = data["unit"].fillna("")
    data["value"] = pd.to_numeric(
        data["value"],
        errors="coerce",
    )

    data = data.dropna(
        subset=["date", "parameter", "value"]
    )

    group_columns = [
        "parameter",
        "unit",
    ]

    for (
        parameter,
        unit,
    ), parameter_data in data.groupby(group_columns):
        parameter_data = parameter_data.sort_values(
            "date"
        )

        figure, axis = plt.subplots(
            figsize=(11, 6)
        )

        axis.plot(
            parameter_data["date"],
            parameter_data["value"],
            marker="o",
            linewidth=2,
        )

        for _, row in parameter_data.iterrows():
            axis.annotate(
                f"{row['value']:g}",
                (
                    row["date"],
                    row["value"],
                ),
                textcoords="offset points",
                xytext=(0, 8),
                ha="center",
            )

        if {
            "reference_min",
            "reference_max",
        }.issubset(parameter_data.columns):
            reference_rows = parameter_data.copy()

            reference_rows["reference_min"] = pd.to_numeric(
                reference_rows["reference_min"],
                errors="coerce",
            )

            reference_rows["reference_max"] = pd.to_numeric(
                reference_rows["reference_max"],
                errors="coerce",
            )

            reference_rows = reference_rows.dropna(
                subset=[
                    "reference_min",
                    "reference_max",
                ]
            )

            if not reference_rows.empty:
                reference_min = reference_rows[
                    "reference_min"
                ].iloc[-1]

                reference_max = reference_rows[
                    "reference_max"
                ].iloc[-1]

                axis.axhspan(
                    reference_min,
                    reference_max,
                    alpha=0.15,
                    label=(
                        f"Reference range: "
                        f"{reference_min:g} to "
                        f"{reference_max:g}"
                    ),
                )

                axis.legend()

        axis.set_title(
            f"{parameter} evolution"
        )

        axis.set_xlabel(
            "Blood test date"
        )

        if unit:
            axis.set_ylabel(
                f"{parameter} ({unit})"
            )
        else:
            axis.set_ylabel(parameter)

        axis.grid(
            True,
            alpha=0.3,
        )

        figure.autofmt_xdate()
        figure.tight_layout()

        safe_parameter = re.sub(
            r"[^A-Za-z0-9_-]+",
            "_",
            parameter,
        ).strip("_")

        safe_unit = re.sub(
            r"[^A-Za-z0-9_-]+",
            "_",
            unit,
        ).strip("_")

        if safe_unit:
            graph_filename = (
                f"{safe_parameter}_{safe_unit}.png"
            )
        else:
            graph_filename = (
                f"{safe_parameter}.png"
            )

        figure.savefig(
            GRAPHS_DIR / graph_filename,
            dpi=160,
            bbox_inches="tight",
        )

        plt.close(figure)

    print(f"Graphs generated in: {GRAPHS_DIR}")


def append_report(
    filename: str,
    test_date: str,
    status: str,
    metrics_found: int,
    error_message: str = "",
) -> None:
    report_row = pd.DataFrame(
        [
            {
                "processed_at": datetime.now().isoformat(
                    timespec="seconds"
                ),
                "test_date": test_date,
                "filename": filename,
                "status": status,
                "metrics_found": metrics_found,
                "error": error_message,
            }
        ]
    )

    if REPORT_FILE.exists():
        report_row.to_csv(
            REPORT_FILE,
            mode="a",
            header=False,
            index=False,
        )
    else:
        report_row.to_csv(
            REPORT_FILE,
            index=False,
        )


def process_pdf(pdf_path: Path) -> None:
    print()
    print(f"Processing: {pdf_path.name}")

    file_hash = calculate_file_hash(pdf_path)

    if file_was_processed(file_hash):
        print(
            f"Already processed: {pdf_path.name}"
        )

        move_file(
            pdf_path,
            PROCESSED_DIR,
        )

        append_report(
            filename=pdf_path.name,
            test_date="",
            status="already_processed",
            metrics_found=0,
        )

        return

    test_date_text = ""

    try:
        text = extract_pdf_text(pdf_path)

        if not text.strip():
            raise ValueError(
                "No text was extracted. "
                "The PDF might be scanned."
            )

        test_date = extract_test_date(
            text=text,
            filename=pdf_path.name,
        )

        test_date_text = (
            test_date.date().isoformat()
        )

        results = extract_metrics(
            text=text,
            test_date=test_date,
            source_file=pdf_path.name,
            file_hash=file_hash,
        )

        if not results:
            raise ValueError(
                "No supported blood metrics were found"
            )

        save_results(results)

        move_file(
            pdf_path,
            PROCESSED_DIR,
        )

        append_report(
            filename=pdf_path.name,
            test_date=test_date_text,
            status="success",
            metrics_found=len(results),
        )

        print(
            f"Success: {pdf_path.name}"
        )

        print(
            f"Test date: {test_date_text}"
        )

        print(
            f"Metrics found: {len(results)}"
        )

    except Exception as error:
        move_file(
            pdf_path,
            ERROR_DIR,
        )

        append_report(
            filename=pdf_path.name,
            test_date=test_date_text,
            status="error",
            metrics_found=0,
            error_message=str(error),
        )

        print(
            f"Failed {pdf_path.name}: {error}"
        )


def find_pdf_files() -> list[Path]:
    return sorted(
        path
        for path in PROCESSING_DIR.iterdir()
        if path.is_file()
        and path.suffix.lower() == ".pdf"
    )


def main() -> None:
    create_directories()

    pdf_files = find_pdf_files()

    if not pdf_files:
        print(
            f"No PDF files found in: "
            f"{PROCESSING_DIR}"
        )
        return

    print(
        f"Found {len(pdf_files)} PDF file(s)"
    )

    for pdf_path in pdf_files:
        process_pdf(pdf_path)

    generate_graphs()

    print()
    print("Processing complete")
    print(f"Results: {RESULTS_FILE}")
    print(f"Graphs: {GRAPHS_DIR}")
    print(f"Report: {REPORT_FILE}")
    print(f"Processed PDFs: {PROCESSED_DIR}")
    print(f"Failed PDFs: {ERROR_DIR}")


if __name__ == "__main__":
    main()