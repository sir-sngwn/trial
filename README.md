# 📚 StudyNotion (나만의 공부 기록 & 복습 서재)

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(Pure%20Stdlib)-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)

<br/>

**공부한 내용을 체계적으로 기록하고, 액티브 리콜(Active Recall) 토글과 뽀모도로 타이머로 완벽하게 복습할 수 있는 노션(Notion) 스타일의 웹 애플리케이션**

[시작하기](#-빠른-시작-quick-start) • [주요 기능](#-주요-기능) • [단축키 안내](#-단축키-안내) • [프로젝트 구조](#-프로젝트-구조)

</div>

---

## 📖 프로젝트 개요

> "공부한 내용을 단순히 모아두는 것을 넘어, **인출 연습(Active Recall)**과 **집중 관리(Pomodoro)**까지 한 곳에서 가능하도록 만든 개인 맞춤형 스터디 위키입니다."

- **⚡ Zero-Dependency**: `pip install`이나 `npm install` 같은 번거로운 설치 과정이 전혀 없습니다.
- **🚀 0.1초 원클릭 실행**: Python 3 표준 라이브러리와 SQLite만으로 어떤 환경에서든 즉시 구동됩니다.
- **🔒 로컬 우선(Local-First)**: 모든 작성 내용과 공부 시간 데이터는 내 컴퓨터의 로컬 SQLite DB에 안전하게 보관됩니다.

---

## ✨ 주요 기능 (Key Features)

### 1. 📝 노션(Notion) 감성의 블록 에디터
- **슬래시(`/`) 커맨드 메뉴**: 새 줄에서 `/` 입력 시 헤딩, 체크리스트, 토글, 코드 블록 등을 바로 선택
- **지원 블록 타입**:
  - `H1`, `H2`, `H3` : 계층적 제목 헤딩
  - `☑️ 할 일 목록 (Todo)` : 체크박스 클릭 시 취소선 및 완료 상태 전환
  - `• 글머리 기호` 및 `1. 번호 매기기` 목록
  - `▶ 토글 목록` : 질문을 적고 답을 숨겨두는 **액티브 리콜 핵심 기능**
  - `💡 콜아웃 상자` : 중요 공식, 시험 꿀팁, 주의사항 강조
  - `</> 코드 블록` : 언어 태그 지정 및 원클릭 복사 버튼
  - `∑ 수식 블록` : 수학/물리 공식을 깔끔하게 정리
  - `❝ 인용구` 및 `― 구분선`
- **실시간 자동 저장(Auto-save)**: 타이핑 멈춤 후 0.6초 내에 로컬 DB에 자동 영구 저장

---

### 2. 🧠 공부 & 복습 특화 시스템
- **액티브 리콜(Active Recall) 자가 퀴즈 모드**:
  - 상단 **[🧠 자가 퀴즈 모드]** 버튼을 누르면 노트 내 모든 토글이 한 번에 접힙니다.
  - 질문만 보며 스스로 개념을 떠올려본 후, 토글을 열어 즉시 정답을 확인할 수 있습니다.
- **뽀모도로 집중 타이머 (25분 집중 / 5분 휴식)**:
  - 상단 툴바에서 원클릭으로 집중 타이머를 시작/일시정지/리셋할 수 있습니다.
  - 집중 세션 종료 시 부드러운 웹 오디오(Web Audio API) 차임벨이 울립니다.
  - 해당 노트에서 집중한 시간이 누적 집계되어 기록됩니다.
- **학습 상태 관리**:
  - `⚪ 시작 전`, `🔵 공부 중`, `🟠 복습 필요`, `🟢 완료` 4단계 상태 태그
  - 사이드바에서 상태별 필터 칩을 클릭하여 복습이 필요한 노트를 빠르게 필터링

---

### 3. 🎨 커스터마이징 & 시각 디자인
- **아이콘 & 커버 배너**:
  - 30여 종의 공부/개발 추천 이모지 피커
  - 감각적인 그라디언트 프리셋 및 커스텀 이미지 URL 지원
- **과목/주제 태그(#) 시스템**:
  - `#CS`, `#알고리즘`, `#수학`, `#영어` 등 태그를 자유롭게 추가/삭제
- **다크 모드 & 라이트 모드**:
  - 눈의 피로를 덜어주는 노션 스타일 다크 테마 완벽 지원 (`localStorage` 자동 동기화)
- **마크다운(.md) 내보내기**:
  - 작성한 모든 노트를 표준 마크다운 형식으로 언제든 다운로드 가능

---

## 🚀 빠른 시작 (Quick Start)

### 요구 사양
- Python 3.8 이상 (별도 외부 패키지 설치 필요 없음)

### 방법 1. 원클릭 실행 스크립트 (권장)
```bash
# 1. 저장소 클론
git clone https://github.com/sir-sngwn/trial.git
cd trial

# 2. 실행 (서버 구동 및 브라우저 자동 실행)
./run.sh
```

### 방법 2. Python 명령어로 직접 실행
```bash
python3 app.py
```
실행 후 브라우저에서 **`http://localhost:8000`** 으로 접속합니다.  
*(포트 변경이 필요할 경우: `python3 app.py --port 3000`)*

---

## ⌨️ 단축키 안내 (Shortcuts)

| 키 바인딩 | 기능 설명 |
| :--- | :--- |
| `/` | 노션 블록 선택 팝업 메뉴 열기 |
| `Enter` | 새 블록 생성 및 다음 줄로 이동 |
| `Backspace` (빈 블록) | 블록 삭제 또는 일반 텍스트로 전환 |
| `Tab` (코드 블록) | 2칸 공백 들여쓰기 |
| `⌘ + K` 또는 `Ctrl + K` | 빠른 전체 검색 (노트 제목, 태그, 본문) |
| `Alt + N` | 새 공부 노트 즉시 생성 |
| `Ctrl + \` | 사이드바 접기 / 펼치기 |
| `ESC` | 열린 모달 창이나 메뉴 닫기 |

---

## 📁 프로젝트 구조

```
trial/
├── app.py              # Python 내장 http.server 기반 경량 RESTful API 서버
├── database.py         # SQLite3 스키마 정의 및 CRUD/통계 비즈니스 로직
├── run.sh              # 터미널 원클릭 실행 스크립트
├── .gitignore          # Git 추적 제외 설정 (DB 파일, 캐시 등)
├── README.md           # 프로젝트 문서
├── data/               # SQLite 데이터베이스 저장 디렉토리 (첫 실행 시 자동 생성)
│   └── study.db
├── uploads/            # 첨부 파일 및 이미지 디렉토리
└── static/             # 프론트엔드 정적 웹 리소스
    ├── index.html      # 노션 레이아웃 마크업
    ├── css/
    │   └── style.css   # 노션 테마 변수, 타이포그래피, 블록 스타일링
    └── js/
        ├── app.js      # SPA 상태 관리, 뽀모도로 타이머, 검색, API 연동
        └── editor.js   # 노션 블록 에디터 코어 & 슬래시 커맨드 엔진
```

---

## 🛠️ 기술 스택 (Tech Stack)

| 영역 | 기술 | 선정 사유 |
| :--- | :--- | :--- |
| **Backend** | Python 3 Standard Library | 별도 가상환경이나 `pip install` 없이 어디서든 즉시 실행 가능한 Zero-Dependency 달성 |
| **Database** | SQLite 3 | 파일 기반 무설치 DB, 완벽한 트랜잭션과 빠른 로컬 쿼리 속도 |
| **Frontend** | Vanilla ES6+ & CSS3 | 프레임워크 빌드 과정 없이 가볍고 빠른 반응 속도 및 완전한 노션 인터랙션 구현 |
| **Audio** | Web Audio API | 외부 mp3 파일 없이 순수 웹 신디사이저로 알림 차임벨 생성 |

---

## 📄 라이선스 (License)

This project is licensed under the MIT License.