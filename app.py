"""
StudyNotion Backend Server
A zero-dependency HTTP REST API & static file server built on Python standard library.
"""

import base64
import json
import mimetypes
import os
import re
import socket
import sys
import urllib.parse
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from typing import Tuple

import database

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)


class StudyNotionHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, format, *args):
        # Clean logging
        sys.stdout.write(f"[{self.log_date_time_string()}] {format % args}\n")

    def _send_json(self, data, status=HTTPStatus.OK):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def _send_error(self, message, status=HTTPStatus.BAD_REQUEST):
        self._send_json({"error": message}, status=status)

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # Root redirect to index.html
        if path == "/" or path == "":
            self._serve_file(os.path.join(STATIC_DIR, "index.html"), "text/html; charset=utf-8")
            return

        # Static assets
        if path.startswith("/static/"):
            rel_path = path[len("/static/"):]
            file_path = os.path.join(STATIC_DIR, rel_path)
            self._serve_file(file_path)
            return

        # Uploaded files
        if path.startswith("/uploads/"):
            rel_path = path[len("/uploads/"):]
            file_path = os.path.join(UPLOADS_DIR, rel_path)
            self._serve_file(file_path)
            return

        # API: List all pages
        if path == "/api/pages":
            pages = database.get_all_pages()
            self._send_json({"pages": pages})
            return

        # API: Get single page details
        match_page = re.match(r"^/api/pages/(\d+)$", path)
        if match_page:
            page_id = int(match_page.group(1))
            page = database.get_page_by_id(page_id)
            if page:
                self._send_json({"page": page})
            else:
                self._send_error("페이지를 찾을 수 없습니다.", HTTPStatus.NOT_FOUND)
            return

        # API: Get study statistics
        if path == "/api/stats":
            stats = database.get_study_stats()
            self._send_json({"stats": stats})
            return

        # API: Export page as Markdown
        match_export = re.match(r"^/api/export/(\d+)$", path)
        if match_export:
            page_id = int(match_export.group(1))
            page = database.get_page_by_id(page_id)
            if not page:
                self._send_error("페이지를 찾을 수 없습니다.", HTTPStatus.NOT_FOUND)
                return

            md_content = self._page_to_markdown(page)
            body = md_content.encode("utf-8")
            filename = f"note_{page_id}.md"
            safe_title = re.sub(r'[^\w\-_\. ]', '_', page.get('title', 'note'))
            if safe_title:
                filename = f"{safe_title}.md"
            encoded_fn = urllib.parse.quote(filename)

            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/markdown; charset=utf-8")
            self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{encoded_fn}")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # 404 for unknown paths
        self._send_error("요청한 경로를 찾을 수 없습니다.", HTTPStatus.NOT_FOUND)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # API: Create new page
        if path == "/api/pages":
            data = self._read_json_body()
            title = data.get("title", "제목 없음")
            icon = data.get("icon", "📝")
            parent_id = data.get("parent_id")
            tags = data.get("tags", [])
            new_id = database.create_page(title=title, icon=icon, parent_id=parent_id, tags=tags)
            page = database.get_page_by_id(new_id)
            self._send_json({"page": page}, status=HTTPStatus.CREATED)
            return

        # API: Log study session (Pomodoro)
        if path == "/api/study/session":
            data = self._read_json_body()
            page_id = data.get("page_id")
            duration_seconds = int(data.get("duration_seconds", 0))
            if duration_seconds > 0:
                database.log_study_session(page_id, duration_seconds)
            self._send_json({"success": True})
            return

        # API: Upload image (base64)
        if path == "/api/upload":
            data = self._read_json_body()
            image_data = data.get("data")
            filename = data.get("filename", "image.png")
            if not image_data:
                self._send_error("이미지 데이터가 없습니다.")
                return

            # Strip data url prefix if present (e.g. data:image/png;base64,...)
            if "," in image_data:
                image_data = image_data.split(",", 1)[1]

            try:
                raw_bytes = base64.b64decode(image_data)
                # Ensure safe file name
                ext = os.path.splitext(filename)[1] or ".png"
                if not ext.lower() in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]:
                    ext = ".png"
                import uuid
                safe_name = f"{uuid.uuid4().hex[:12]}{ext}"
                file_path = os.path.join(UPLOADS_DIR, safe_name)
                with open(file_path, "wb") as f:
                    f.write(raw_bytes)
                url = f"/uploads/{safe_name}"
                self._send_json({"url": url, "filename": safe_name})
            except Exception as e:
                self._send_error(f"이미지 저장 실패: {str(e)}", HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        self._send_error("요청한 경로를 찾을 수 없습니다.", HTTPStatus.NOT_FOUND)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        match_page = re.match(r"^/api/pages/(\d+)$", path)
        if match_page:
            page_id = int(match_page.group(1))
            data = self._read_json_body()
            success = database.update_page(page_id, data)
            if success:
                page = database.get_page_by_id(page_id)
                self._send_json({"page": page})
            else:
                self._send_error("페이지 수정 실패 또는 변경 사항 없음.", HTTPStatus.BAD_REQUEST)
            return

        self._send_error("요청한 경로를 찾을 수 없습니다.", HTTPStatus.NOT_FOUND)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        match_page = re.match(r"^/api/pages/(\d+)$", path)
        if match_page:
            page_id = int(match_page.group(1))
            success = database.delete_page(page_id)
            if success:
                self._send_json({"success": True, "deleted_id": page_id})
            else:
                self._send_error("페이지 삭제 실패.", HTTPStatus.NOT_FOUND)
            return

        self._send_error("요청한 경로를 찾을 수 없습니다.", HTTPStatus.NOT_FOUND)

    def _read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        raw = self.rfile.read(content_length).decode("utf-8")
        try:
            return json.loads(raw)
        except Exception:
            return {}

    def _serve_file(self, file_path: str, content_type: str = None):
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            self._send_error("파일을 찾을 수 없습니다.", HTTPStatus.NOT_FOUND)
            return

        if content_type is None:
            content_type, _ = mimetypes.guess_type(file_path)
            if not content_type:
                content_type = "application/octet-stream"

        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self._send_error(f"파일 읽기 오류: {str(e)}", HTTPStatus.INTERNAL_SERVER_ERROR)

    def _page_to_markdown(self, page: dict) -> str:
        """Convert page and its blocks to clean GitHub-flavored Markdown."""
        lines = []
        icon = page.get("icon", "📝")
        title = page.get("title", "제목 없음")
        status = page.get("status", "시작 전")
        tags = page.get("tags", [])

        lines.append(f"# {icon} {title}\n")
        lines.append(f"> **상태:** `{status}` | **태그:** {', '.join(['#' + t for t in tags]) if tags else '없음'}\n")

        blocks = page.get("blocks", [])
        for b in blocks:
            b_type = b.get("type", "text")
            content = b.get("content", "")

            # HTML tag cleaning for basic export
            clean_content = content.replace("<br>", "\n").replace("<br/>", "\n")
            clean_content = re.sub(r'<[^>]+>', '', clean_content)

            if b_type == "h1":
                lines.append(f"\n# {clean_content}\n")
            elif b_type == "h2":
                lines.append(f"\n## {clean_content}\n")
            elif b_type == "h3":
                lines.append(f"\n### {clean_content}\n")
            elif b_type == "todo":
                checked = "x" if b.get("checked") else " "
                lines.append(f"- [{checked}] {clean_content}")
            elif b_type == "bullet":
                lines.append(f"- {clean_content}")
            elif b_type == "number":
                lines.append(f"1. {clean_content}")
            elif b_type == "toggle":
                header = b.get("header", "토글")
                lines.append(f"\n<details>\n<summary><b>{header}</b></summary>\n\n{clean_content}\n\n</details>\n")
            elif b_type == "callout":
                icon = b.get("icon", "💡")
                lines.append(f"\n> **{icon} 요약 / 알림**\n> {clean_content.replace(chr(10), chr(10) + '> ')}\n")
            elif b_type == "quote":
                lines.append(f"\n> {clean_content}\n")
            elif b_type == "code":
                lang = b.get("language", "")
                raw_code = b.get("content", "")
                lines.append(f"\n```{lang}\n{raw_code}\n```\n")
            elif b_type == "math":
                lines.append(f"\n$$\n{clean_content}\n$$\n")
            elif b_type == "divider":
                lines.append("\n---\n")
            else:
                if clean_content.strip():
                    lines.append(f"{clean_content}\n")

        return "\n".join(lines)


def find_free_port(start_port: int = 8000, max_attempts: int = 20) -> int:
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    return start_port


def run_server(port: int = 8000, auto_open: bool = False):
    database.init_db()
    actual_port = find_free_port(port)
    server_address = ("127.0.0.1", actual_port)
    httpd = ThreadingHTTPServer(server_address, StudyNotionHandler)
    url = f"http://localhost:{actual_port}"

    print("=" * 60)
    print("  📚 StudyNotion 서버가 성공적으로 시작되었습니다!")
    print(f"  👉 브라우저 주소: {url}")
    print("  종료하려면 터미널에서 Ctrl+C 를 누르세요.")
    print("=" * 60)

    if auto_open:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n서버를 종료합니다.")
        httpd.server_close()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="StudyNotion Local Server")
    parser.add_argument("--port", type=int, default=8000, help="Server port (default: 8000)")
    parser.add_argument("--no-open", action="store_true", help="Do not automatically open browser")
    args = parser.parse_args()

    run_server(port=args.port, auto_open=not args.no_open)

