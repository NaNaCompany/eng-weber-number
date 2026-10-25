# 웨버수 계산기 — 업데이트 기록

## 2026-10-25 최초 공개 준비

- 도구 ID: E132.
- 계산 모델: `We = ρV²L / σ`.
- 한국어·영어·스페인어·중국어 간체·일본어·독일어 정적 페이지를 제작했다.
- 코드·설명·예제·SVG 아이콘·PNG 이미지는 직접 작성했다. 참고문헌의 본문·도판·표·코드와 외부 폰트 파일을 재배포하지 않는다. 자체 제작물의 라이선스와 출처 구분은 `LICENSE`·`SOURCES.md`에 기록했다.
- 독립 고정밀 기준값, 물리적 경계 사례, 전체 입력·출력 단위, 오입력, 반복 입력 행과 수치 표현 범위를 검증했다. 해당 저장소의 실제 자동 테스트 25개와 정적 생성물 일치 검사를 통과했다.
- 브라우저에서 6개 언어 × 320px·1280px = 12건을 통과했다. 계산 결과·입력 오류·예제 재계산·출력 단위 변경·언어·화면 넘침·More Apps 위치를 확인했다. 반복 입력이 있는 도구는 행 추가·삭제·최소 행 제한·예제 복원도 실제 클릭으로 검사했다.
- 신규 60종 전체 자동 테스트 1,563개와 브라우저 검사 720건이 통과했다. 검증 당시 배포 자산의 지문을 보존하여 소스 변경 후 오래된 결과를 재사용하지 않는다.
- Google GTM·GA4·AdSense·Cloudflare 코드와 우측 하단 회색 More Apps 링크를 적용했다. 코드 존재 확인과 분석 이벤트 수집 실적은 구분한다.
- GitHub CI·Pages의 배포 커밋과 공개 파일 검증은 별도 배포 기록에서 확인한다.

## 공개 페이지와 사이트맵

- ko: https://nanalab.kr/eng-weber-number/
- en: https://nanalab.kr/eng-weber-number/en/
- es: https://nanalab.kr/eng-weber-number/es/
- zh: https://nanalab.kr/eng-weber-number/zh/
- ja: https://nanalab.kr/eng-weber-number/ja/
- de: https://nanalab.kr/eng-weber-number/de/

- 사이트맵: https://nanalab.kr/eng-weber-number/sitemap.xml
- 6개 URL, 상호 hreflang·x-default와 각 페이지의 canonical을 포함한다.
- 본사이트 앱 카드 대표 주소는 한국어 루트 1개다. 6개 언어 URL은 사이트맵에 함께 수록한다.
- 본사이트 카드·루트 사이트맵 연결은 작업 폴더 `UpdateQue.md` 후속 반영 대상으로 기록한다.
