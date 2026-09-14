"""
StudyNotion Database Manager (SQLite)
Zero-dependency, thread-safe SQLite storage for notes, blocks, and study sessions.
"""

import json
import os
import sqlite3
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "study.db")


def get_connection() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Initialize SQLite tables and insert initial sample study notes if empty."""
    conn = get_connection()
    cursor = conn.cursor()

    # Pages table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_id INTEGER,
            title TEXT NOT NULL DEFAULT '제목 없음',
            icon TEXT DEFAULT '📝',
            cover TEXT DEFAULT '',
            status TEXT DEFAULT '시작 전',  -- '시작 전', '공부 중', '복습 필요', '완료'
            tags TEXT DEFAULT '[]',          -- JSON array of tag strings
            blocks_json TEXT DEFAULT '[]',   -- JSON array of blocks
            study_seconds INTEGER DEFAULT 0, -- Accumulated study time
            is_favorite INTEGER DEFAULT 0,   -- 0 or 1
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES pages (id) ON DELETE CASCADE
        )
    """)

    # Study sessions log table (for Pomodoro and study streak)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS study_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            page_id INTEGER,
            duration_seconds INTEGER NOT NULL,
            session_date DATE DEFAULT (DATE('now', 'localtime')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (page_id) REFERENCES pages (id) ON DELETE SET NULL
        )
    """)

    conn.commit()

    # Seed initial tutorial/sample pages if empty
    cursor.execute("SELECT COUNT(*) FROM pages")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_sample_data(cursor)
        conn.commit()

    conn.close()


def seed_sample_data(cursor: sqlite3.Cursor):
    """Seed initial welcoming and sample study notes for computer science / general study."""
    welcome_blocks = [
        {
            "id": "b1",
            "type": "callout",
            "icon": "💡",
            "color": "blue",
            "content": "<b>StudyNotion에 오신 것을 환영합니다!</b><br>공부한 지식을 체계적으로 정리하고, <b>토글(Toggle)을 통한 자가시험(Active Recall)</b>과 <b>뽀모도로 타이머</b>로 완벽하게 복습하세요."
        },
        {
            "id": "b2",
            "type": "h2",
            "content": "⚡ 빠른 시작 가이드"
        },
        {
            "id": "b3",
            "type": "todo",
            "checked": True,
            "content": "새 페이지 만들기: 왼쪽 사이드바의 <b>+ 새 페이지</b> 클릭"
        },
        {
            "id": "b4",
            "type": "todo",
            "checked": False,
            "content": "슬래시 커맨드 사용해보기: 새 줄에서 <code>/</code>를 입력하면 제목, 토글, 콜아웃, 코드 블록을 만들 수 있습니다."
        },
        {
            "id": "b5",
            "type": "todo",
            "checked": False,
            "content": "토글로 암기 시험보기: <b>토글 접기/펴기</b> 버튼을 눌러 자가 퀴즈 모드를 체험해보세요!"
        },
        {
            "id": "b6",
            "type": "todo",
            "checked": False,
            "content": "상단 뽀모도로 타이머로 오늘 25분 집중 공부 시작하기"
        },
        {
            "id": "b7",
            "type": "h2",
            "content": "🧠 액티브 리콜 (Active Recall) 공부 예시"
        },
        {
            "id": "b8",
            "type": "toggle",
            "header": "Q. 파이썬의 GIL(Global Interpreter Lock)이란 무엇인가요?",
            "content": "하나의 스레드만이 파이썬 바이트코드를 실행할 수 있도록 인터프리터를 잠그는 뮤텍스(Mutex) 메커니즘입니다. 멀티코어 환경에서도 CPU 바운드 작업은 병렬 실행이 제한되지만, 메모리 관리(참조 카운팅)가 안전하고 단일 스레드 성능이 뛰어납니다."
        },
        {
            "id": "b9",
            "type": "toggle",
            "header": "Q. 이진 탐색 트리(BST)와 해시 테이블의 탐색 시간 복잡도 비교",
            "content": "• 이진 탐색 트리: 평균 O(log N), 최악(경사 트리) O(N)<br>• 균형 이진 탐색 트리(AVL/Red-Black): 항상 O(log N)<br>• 해시 테이블: 평균 O(1), 해시 충돌 최악의 경우 O(N)"
        },
        {
            "id": "b10",
            "type": "code",
            "language": "python",
            "content": "# 이진 탐색 기본 알고리즘\ndef binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1"
        },
        {
            "id": "b11",
            "type": "h2",
            "content": "📐 수식 및 공식 정리 예시"
        },
        {
            "id": "b12",
            "type": "math",
            "content": "f(x) = \\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}"
        }
    ]

    cursor.execute("""
        INSERT INTO pages (id, title, icon, cover, status, tags, blocks_json, study_seconds, is_favorite)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        1,
        "👋 StudyNotion 시작하기 및 사용법",
        "🚀",
        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "공부 중",
        json.dumps(["가이드", "튜토리얼"], ensure_ascii=False),
        json.dumps(welcome_blocks, ensure_ascii=False),
        1500,
        1
    ))

    # Sample subpage 1: Computer Science
    cs_blocks = [
        {
            "id": "cs1",
            "type": "callout",
            "icon": "💻",
            "color": "green",
            "content": "<b>컴퓨터 구조 & 운영체제 핵심 요약</b><br>시험 전 또는 면접 전 반드시 복습해야 할 주요 개념 정리"
        },
        {
            "id": "cs2",
            "type": "h2",
            "content": "1. 프로세스와 스레드"
        },
        {
            "id": "cs3",
            "type": "toggle",
            "header": "Q. 프로세스와 스레드의 결정적인 차이점은?",
            "content": "<b>프로세스</b>는 운영체제로부터 독자적인 자원(메모리 영역: Code, Data, Stack, Heap)을 할당받는 작업 단위이며,<br><b>스레드</b>는 프로세스 내부에서 Code, Data, Heap을 공유하고 독립적인 Stack 영역만 갖는 실행 흐름 단위입니다."
        },
        {
            "id": "cs4",
            "type": "toggle",
            "header": "Q. 가상 메모리와 페이징(Paging)의 개념",
            "content": "물리 메모리 크기의 한계를 극복하기 위해 보조기억장치(디스크)를 주기억장치처럼 사용하는 기술. 프로세스를 일정 크기의 '페이지(Page)'로 나누고, 물리 메모리를 '프레임(Frame)'으로 나누어 매핑(Page Table)합니다."
        },
        {
            "id": "cs5",
            "type": "h2",
            "content": "2. 학습 체크리스트"
        },
        {
            "id": "cs6",
            "type": "todo",
            "checked": True,
            "content": "프로세스 동기화 (뮤텍스, 세마포어) 이해하기"
        },
        {
            "id": "cs7",
            "type": "todo",
            "checked": False,
            "content": "교착 상태(Deadlock) 4가지 발생 조건 복습하기"
        }
    ]

    cursor.execute("""
        INSERT INTO pages (id, title, icon, cover, status, tags, blocks_json, study_seconds, is_favorite)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        2,
        "💻 컴퓨터공학 핵심 요약",
        "🖥️",
        "linear-gradient(135deg, #2af598 0%, #009efd 100%)",
        "복습 필요",
        json.dumps(["CS", "운영체제", "전공"], ensure_ascii=False),
        json.dumps(cs_blocks, ensure_ascii=False),
        2400,
        1
    ))

    # Log initial study sessions for today
    cursor.execute("""
        INSERT INTO study_sessions (page_id, duration_seconds, session_date)
        VALUES (1, 1500, DATE('now', 'localtime')), (2, 2400, DATE('now', 'localtime'))
    """)


def get_all_pages() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, parent_id, title, icon, cover, status, tags, study_seconds, is_favorite, created_at, updated_at
        FROM pages
        ORDER BY is_favorite DESC, updated_at DESC
    """)
    rows = cursor.fetchall()
    pages = []
    for r in rows:
        tags = []
        try:
            tags = json.loads(r["tags"]) if r["tags"] else []
        except Exception:
            tags = []
        pages.append({
            "id": r["id"],
            "parent_id": r["parent_id"],
            "title": r["title"] or "제목 없음",
            "icon": r["icon"] or "📝",
            "cover": r["cover"] or "",
            "status": r["status"] or "시작 전",
            "tags": tags,
            "study_seconds": r["study_seconds"] or 0,
            "is_favorite": bool(r["is_favorite"]),
            "created_at": r["created_at"],
            "updated_at": r["updated_at"]
        })
    conn.close()
    return pages


def get_page_by_id(page_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, parent_id, title, icon, cover, status, tags, blocks_json, study_seconds, is_favorite, created_at, updated_at
        FROM pages
        WHERE id = ?
    """, (page_id,))
    r = cursor.fetchone()
    if not r:
        conn.close()
        return None

    try:
        tags = json.loads(r["tags"]) if r["tags"] else []
    except Exception:
        tags = []

    try:
        blocks = json.loads(r["blocks_json"]) if r["blocks_json"] else []
    except Exception:
        blocks = []

    page = {
        "id": r["id"],
        "parent_id": r["parent_id"],
        "title": r["title"] or "제목 없음",
        "icon": r["icon"] or "📝",
        "cover": r["cover"] or "",
        "status": r["status"] or "시작 전",
        "tags": tags,
        "blocks": blocks,
        "study_seconds": r["study_seconds"] or 0,
        "is_favorite": bool(r["is_favorite"]),
        "created_at": r["created_at"],
        "updated_at": r["updated_at"]
    }
    conn.close()
    return page


def create_page(title: str = "제목 없음", icon: str = "📝", parent_id: Optional[int] = None, tags: Optional[List[str]] = None) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    initial_blocks = [
        {
            "id": "b_" + str(int(time.time() * 1000)),
            "type": "text",
            "content": ""
        }
    ]
    cursor.execute("""
        INSERT INTO pages (title, icon, parent_id, tags, blocks_json, status, updated_at)
        VALUES (?, ?, ?, ?, ?, '시작 전', CURRENT_TIMESTAMP)
    """, (
        title or "제목 없음",
        icon or "📝",
        parent_id,
        json.dumps(tags or [], ensure_ascii=False),
        json.dumps(initial_blocks, ensure_ascii=False)
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id


def update_page(page_id: int, data: Dict[str, Any]) -> bool:
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []

    if "title" in data:
        fields.append("title = ?")
        values.append(data["title"])
    if "icon" in data:
        fields.append("icon = ?")
        values.append(data["icon"])
    if "cover" in data:
        fields.append("cover = ?")
        values.append(data["cover"])
    if "status" in data:
        fields.append("status = ?")
        values.append(data["status"])
    if "tags" in data:
        fields.append("tags = ?")
        values.append(json.dumps(data["tags"], ensure_ascii=False))
    if "blocks" in data:
        fields.append("blocks_json = ?")
        values.append(json.dumps(data["blocks"], ensure_ascii=False))
    if "study_seconds" in data:
        fields.append("study_seconds = ?")
        values.append(data["study_seconds"])
    if "is_favorite" in data:
        fields.append("is_favorite = ?")
        values.append(1 if data["is_favorite"] else 0)
    if "parent_id" in data:
        fields.append("parent_id = ?")
        values.append(data["parent_id"])

    if not fields:
        conn.close()
        return False

    fields.append("updated_at = CURRENT_TIMESTAMP")
    query = f"UPDATE pages SET {', '.join(fields)} WHERE id = ?"
    values.append(page_id)

    cursor.execute(query, values)
    conn.commit()
    affected = cursor.rowcount > 0
    conn.close()
    return affected


def delete_page(page_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM pages WHERE id = ?", (page_id,))
    conn.commit()
    affected = cursor.rowcount > 0
    conn.close()
    return affected


def log_study_session(page_id: Optional[int], duration_seconds: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO study_sessions (page_id, duration_seconds, session_date)
        VALUES (?, ?, DATE('now', 'localtime'))
    """, (page_id, duration_seconds))
    if page_id:
        cursor.execute("""
            UPDATE pages
            SET study_seconds = study_seconds + ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (duration_seconds, page_id))
    conn.commit()
    conn.close()
    return True


def get_study_stats() -> Dict[str, Any]:
    """Retrieve overall study statistics, streak, and status counts."""
    conn = get_connection()
    cursor = conn.cursor()

    # Total pages and status counts
    cursor.execute("SELECT status, COUNT(*) as count FROM pages GROUP BY status")
    status_counts = {"시작 전": 0, "공부 중": 0, "복습 필요": 0, "완료": 0}
    total_notes = 0
    for r in cursor.fetchall():
        st = r["status"]
        c = r["count"]
        status_counts[st] = c
        total_notes += c

    # Total study time
    cursor.execute("SELECT COALESCE(SUM(duration_seconds), 0) FROM study_sessions")
    total_study_seconds = cursor.fetchone()[0]

    # Today's study time
    cursor.execute("""
        SELECT COALESCE(SUM(duration_seconds), 0)
        FROM study_sessions
        WHERE session_date = DATE('now', 'localtime')
    """)
    today_study_seconds = cursor.fetchone()[0]

    # Active study days count
    cursor.execute("SELECT COUNT(DISTINCT session_date) FROM study_sessions")
    active_days = cursor.fetchone()[0]

    # Recent study sessions
    cursor.execute("""
        SELECT s.duration_seconds, s.session_date, s.created_at, p.title, p.icon
        FROM study_sessions s
        LEFT JOIN pages p ON s.page_id = p.id
        ORDER BY s.created_at DESC
        LIMIT 10
    """)
    recent_sessions = [
        {
            "duration_seconds": r["duration_seconds"],
            "session_date": r["session_date"],
            "created_at": r["created_at"],
            "title": r["title"] or "일반 학습",
            "icon": r["icon"] or "⏱️"
        }
        for r in cursor.fetchall()
    ]

    conn.close()

    return {
        "total_notes": total_notes,
        "status_counts": status_counts,
        "total_study_seconds": total_study_seconds,
        "today_study_seconds": today_study_seconds,
        "active_days": active_days,
        "recent_sessions": recent_sessions
    }
