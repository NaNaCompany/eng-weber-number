# 웨버수 계산기

선택한 길이와 상대속도에서 관성 효과와 계면장력 효과의 비를 계산합니다.

- ID: E132
- App: https://nanalab.kr/eng-weber-number/
- Repository: https://github.com/NaNaCompany/eng-weber-number
- Formula: We = ρV²L / σ

## Model and data

밀도·길이·속도는 같은 기준 상과 현상 정의에 맞추어 입력합니다. 두 상 사이의 일정한 계면장력을 사용합니다. We만으로 액적 파괴, 분무, 기포 형상이나 보편적인 임계값을 단정하지 않습니다.

Inputs normalize to SI. Repeated-input models support adding/removing actual input rows. Calculations, finite-number checks and physical-domain checks run locally; no external property database or solver API is used.

## Validation

Run node --test tests/*.test.mjs and python scripts/build-locales.py --check. tests/reference.json contains independently computed high-precision default and boundary references. The source notices distinguish original MIT work from citation-only external references.

## Static languages

Korean (existing root), English (`en/`), Spanish (`es/`), Simplified Chinese (`zh/`), Japanese (`ja/`) and German (`de/`). Each page has its own canonical URL, reciprocal hreflang, localized metadata, interface, validation messages and preview image. The language links work without JavaScript. Calculation code is shared and no runtime translation API is used.

Edit `localization/*.json` for text, `src/template.html` for the shared page, and run `python scripts/build-locales.py`. Run `python scripts/build-locales.py --check` and `npm test` before publishing. Decimal commas are accepted in Spanish and German; thousands separators are not supported.
