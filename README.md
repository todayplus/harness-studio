# Harness Studio

AI 에이전트 **하네스**를 배우고, 조립하고, 진단하는 오프라인 PWA.
Claude Code · Codex 같은 코딩 에이전트를 개인 도구가 아니라 조직의 엔지니어링 시스템으로 얹기 위한 아키텍처 결정을 다룹니다.

## 무엇이 들어 있나

| 보기 | 내용 |
|---|---|
| **Learn** | PART 1–5 · 15개 챕터. 개념 블록, 일상 비유, 실무 체크리스트, 챕터별 퀴즈 2문항 |
| **Practice** | 플래시카드 33장(알고 있음/다시 보기 기록) · 시나리오 랩 8개(판정과 해설) |
| **Build** | 4문항 → 3계층 하네스 스택 · 파일 트리 · 다음 할 일 · 시작 파일 10종 생성(ZIP) |
| **Audio** | 챕터별 오디오 요약 15편(총 25분 36초, Adeline 내레이션). 하단 미니 플레이어 · 자동 다음 챕터 · 0.8–1.5배속 · 오프라인 캐시 |
| **Present** | 발표자 모드. 챕터 덱(개념·비유·체크·퀴즈·한 줄 정리)과 90분 워크숍 트랙. 구간 타이머·발표자 노트·정답 공개·전체화면 |
| **Diagnose** | 10문항 성숙도 진단 → L0–L4 판정 + 다음 단계 3개 |
| **Reference** | 실패 사례 6 · 직군별 적용 · 90분 워크숍 · 치트시트 12 · 기록 내보내기/가져오기 |

## 오디오

`audio/` 폴더의 mp3 15개가 서비스 워커에 캐시되어 오프라인에서도 재생됩니다.
원고는 `audio/scripts/`에 있고, 다시 만들려면:

```bash
gsk audio_generation "$(cat audio/scripts/c01.txt)" -m elevenlabs/v4-tts -p '{"speaker":"Adeline"}'
```

## 발표자 모드 단축키

| 키 | 동작 |
|---|---|
| `→` `Space` `Enter` | 다음 슬라이드 |
| `←` `Backspace` | 이전 슬라이드 |
| `N` | 발표자 노트 |
| `P` | 타이머 일시정지 |
| `F` | 전체화면 |
| `Esc` | 나가기 |

## 사용 가이드

`guide.html` — 용도, 화면별 기능, 발표자 모드 단축키, 오디오, 배포, 콘텐츠 수정, FAQ를 담은 단일 파일 문서.
앱의 **Reference → 데이터** 섹션에서도 열 수 있습니다.

## 앱으로 설치

- **Android / 데스크톱(Chrome·Edge)**: 주소창 오른쪽 설치 아이콘 또는 상단 **앱 설치** 버튼
- **iPhone / iPad(Safari)**: 공유 → **홈 화면에 추가**
- 설치 후에는 오프라인에서도 전체 콘텐츠가 열립니다(서비스 워커 캐시).

## 개발

```bash
python3 build.py          # src/* → index.html, harness-studio.html, sw.js
python3 -m http.server 8080   # 로컬 확인 (서비스 워커는 http에서만 동작)
```

소스는 `src/styles.css`, `src/data.js`(콘텐츠), `src/app.js`(로직)로 나뉘고,
`index.template.html`에 인라인되어 단일 파일 앱이 됩니다.

## 배포

`main` 브랜치에 푸시하면 GitHub Actions가 Pages로 배포합니다.
저장소 **Settings → Pages → Source: GitHub Actions** 를 한 번 선택하세요.

## 라이선스

콘텐츠는 이 저장소의 저작물입니다. 원문 도서(하네스 엔지니어링)의 본문을 복제하지 않았고,
개념 설명은 독자적으로 작성했습니다.
