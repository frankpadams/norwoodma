# Importing historical member records

The source set contains the official uploaded reports for May 2024, May 2025, November 2025 and May 2026. Obtain the same PDFs and work outside the repository; never edit the scanned originals. October 24, 2024 voting results have no uploaded matching attendance sheet and are outside this cumulative dataset.

1. Extract PDF text with `pdftotext -layout`. Keep the exact PDF basename for each `.txt` output.
2. For the scanned attendance reports, render with system Poppler at 180–200 DPI. OCR each page sequentially using Tesseract `--psm 6 tsv txt`, with `OMP_THREAD_LIMIT=1`. Place the results at `SOURCE_DIR/ocr/PDF_BASENAME/ocr-N.tsv` and `.txt`. If a page produces empty OCR, crop only its right border/blank bottom and repeat. Parse TSV with `csv.QUOTE_NONE`; standalone quotation marks in OCR otherwise corrupt subsequent rows.
3. Run `python scripts/town-meeting/parse-votes.py SOURCE_DIR` and `python scripts/town-meeting/parse-attendance.py SOURCE_DIR`. Attendance counts must reconcile to the official per-night totals. The November 13, 2025 District 6 header OCR reads 3 absent rather than 8; the rows and document-wide total establish 8.
4. Run `python scripts/town-meeting/build-records.py SOURCE_DIR`. This reads the legacy 2026 and November 2025 source datasets and the extracted older reports, then writes the cumulative dataset and matching audit. Review every newly introduced OCR correction, ambiguous identity and source-total discrepancy.
5. Ensure every `article_target` resolves to exactly one static ledger row. The UI uses explicit motion IDs, never vote-total strings, to identify a vote. Update the JS/data cache versions when changing the schema.
6. Run the data and DOM checks in `scripts/town-meeting/validate-records.cjs`. The DOM checks use `linkedom` when supplied via `NODE_PATH`; that package is a QA dependency, not a site runtime dependency.

Matching preserves suffixes and distinguishes different given names within the same family. Missing roster entries never establish absence; missing voting cells never establish abstention. Do not infer individual motion dates from a combined report. Preserve both official summary totals and named-voter totals when the original report differs.
