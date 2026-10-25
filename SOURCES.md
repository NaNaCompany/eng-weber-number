# 제작 및 출처 기록

애플리케이션 코드, 한국어 설명, 예제, SVG 아이콘과 PNG 대표 이미지는 2026-10-25에 직접 작성했습니다. 외부 교재의 문장·사진·도판·표·사이트 소스 코드는 포함하지 않았습니다. 외부 계산 패키지와 폰트 파일도 배포하지 않습니다. 코드와 자체 제작 에셋의 라이선스는 MIT이며 `LICENSE`에 전문이 있습니다.

아래 링크는 수학적 관계와 적용 가정을 확인할 참고문헌입니다. 링크 대상의 저작물이 이 저장소의 MIT 라이선스로 변경된다는 뜻이 아닙니다. NC·ND 조건이 있는 참고 사이트의 본문·도판·코드 역시 재배포하지 않습니다. 제조사 로고나 교재 그림은 사용하지 않았습니다.

## 물리상수

NIST가 제공하는 CODATA 2022 권고값을 2026-10-25에 확인했습니다. 전체 데이터베이스·표·설명은 복제하지 않고 계산에 필요한 수치와 출처를 기록했습니다.

| 기호 | 사용 값 (SI) | 구분 |
|---|---:|---|
| h | 6.62607015 × 10⁻³⁴ J·s | SI 정의상수 |
| c₀ | 299792458 m/s | SI 정의상수 |
| k_B | 1.380649 × 10⁻²³ J/K | SI 정의상수 |
| e | 1.602176634 × 10⁻¹⁹ C | SI 정의상수, eV 변환 |
| R | 8.31446261815324 J/(mol·K) | 정의상수 N_A k_B에서 유도 |
| ε₀ | 8.8541878188 × 10⁻¹² F/m | CODATA 2022 측정 기반 권고값 |
| μ₀ | 1.25663706127 × 10⁻⁶ N/A² | CODATA 2022 측정 기반 권고값 |
| σ_SB | 5.670374419 × 10⁻⁸ W/(m²·K⁴) | 정의상수에서 유도, 표시 자릿수로 반올림 |

- 출처: [NIST Fundamental Physical Constants](https://physics.nist.gov/cuu/Constants/), [CODATA 2022 값](https://physics.nist.gov/cuu/Constants/Table/allascii.txt).
- 이용 조건: [NIST copyright, fair use and licensing statements](https://www.nist.gov/open/license).
- NIST/CODATA의 보증이나 서비스 추천을 의미하지 않습니다. 계수와 결과는 일반적인 JavaScript 부동소수점 정밀도로 계산합니다.

## 게시자 통합 코드

사용자가 지정한 NaNaCompany.github.io의 Google Tag Manager, Google Analytics, AdSense 설정을 적용했습니다. Cloudflare는 사이트의 기존 공개 분석 설정을 사용하며 자동 삽입된 beacon이 있으면 추가하지 않습니다. Google·Cloudflare 스크립트는 각 공급자의 배포 서버에서 로드하며 공급자 저작권과 서비스 약관을 따릅니다.

## 이 도구의 공식 확인 출처


## Model references and additional constants

Only mathematical facts and model assumptions are referenced. No external prose, figures, tables, code or font files are redistributed. G = 6.67430e-11 m³/(kg·s²) and u = 1.66053906892e-27 kg are CODATA 2022 measured recommendations. The standard acceleration g0 = 9.80665 m/s² is exact by convention. hbar is computed as h/(2π); pc as AU × 648000/π, where AU = 149597870700 m. SI-prefix conversions and eV = e joules use the defined elementary charge.

- [MIT: Surface-tension dimensionless groups](https://web.mit.edu/2.25/www/225_sect_11.html)
- [MIT 2.25 · Surface-tension dimensionless groups, original notes](https://web.mit.edu/2.25/www_old.bak/notes/11.pdf)
