#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

required_files=(
  "README.md"
  "theme/layout.html"
  "theme/document.html"
  "components/header.html"
  "components/sidebar.html"
  "components/breadcrumbs.html"
  "components/doc-summary.html"
  "styles/tokens.css"
  "styles/typography.css"
  "styles/layout.css"
  "js/mobile-nav.js"
  "js/toc.js"
  "js/recents.js"
)

for relative_path in "${required_files[@]}"; do
  absolute_path="${ROOT_DIR}/${relative_path}"
  if [[ ! -s "${absolute_path}" ]]; then
    echo "Missing or empty required file: ${relative_path}" >&2
    exit 1
  fi
done

layout_path="${ROOT_DIR}/theme/layout.html"
document_path="${ROOT_DIR}/theme/document.html"

layout_placeholders=(
  "{{HEADER_HTML}}"
  "{{SIDEBAR_HTML}}"
  "{{DOCUMENT_HTML}}"
)

document_placeholders=(
  "{{BREADCRUMBS_HTML}}"
  "{{DOC_SUMMARY_HTML}}"
  "{{DOC_HTML}}"
)

for placeholder in "${layout_placeholders[@]}"; do
  if ! grep -Fq "${placeholder}" "${layout_path}"; then
    echo "Missing layout placeholder: ${placeholder}" >&2
    exit 1
  fi
done

for placeholder in "${document_placeholders[@]}"; do
  if ! grep -Fq "${placeholder}" "${document_path}"; then
    echo "Missing document placeholder: ${placeholder}" >&2
    exit 1
  fi
done

echo "Theme structure validation passed."
