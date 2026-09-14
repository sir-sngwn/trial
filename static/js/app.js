/**
 * StudyNotion - Main Application Controller
 * Handles SPA navigation, API calls, auto-save, Pomodoro study timer,
 * modals, and Notion-like aesthetics.
 */

class StudyNotionApp {
  constructor() {
    this.pages = [];
    this.currentPage = null;
    this.currentFilter = "all";
    this.saveTimeout = null;
    this.isSaving = false;

    // Pomodoro Timer State
    this.timerSeconds = 25 * 60;
    this.timerInitialSeconds = 25 * 60;
    this.timerInterval = null;
    this.timerRunning = false;
    this.timerMode = "focus"; // 'focus' (25m) or 'break' (5m)

    this.initElements();
    this.initEditor();
    this.initTheme();
    this.initEventListeners();
    this.loadInitialData();
  }

  initElements() {
    // Layout & Navigation
    this.sidebarEl = document.getElementById("sidebar");
    this.btnCollapseSidebar = document.getElementById("btn-collapse-sidebar");
    this.btnExpandSidebar = document.getElementById("btn-expand-sidebar");
    this.sidebarResizer = document.getElementById("sidebar-resizer");
    this.breadcrumbCurrent = document.getElementById("breadcrumb-current");
    this.saveIndicator = document.getElementById("sidebar-save-indicator");

    // Lists
    this.favoritesListEl = document.getElementById("favorites-list");
    this.pagesListEl = document.getElementById("pages-list");
    this.favoritesGroupEl = document.getElementById("favorites-group");

    // Page Header & Controls
    this.pageCoverEl = document.getElementById("page-cover");
    this.btnChangeCover = document.getElementById("btn-change-cover");
    this.btnRemoveCover = document.getElementById("btn-remove-cover");
    this.btnAddCover = document.getElementById("btn-add-cover");
    this.btnPageIcon = document.getElementById("btn-page-icon");
    this.pageTitleInput = document.getElementById("page-title-input");
    this.pageStatusSelect = document.getElementById("page-status-select");
    this.btnToggleFavorite = document.getElementById("btn-toggle-favorite");
    this.btnToggleQuiz = document.getElementById("btn-toggle-quiz");
    this.btnExportMd = document.getElementById("btn-export-md");
    this.btnDeletePage = document.getElementById("btn-delete-page");
    this.tagsListEl = document.getElementById("tags-list");
    this.tagInput = document.getElementById("tag-input");
    this.pageStudyTimeEl = document.getElementById("page-study-time");

    // Pomodoro Widget
    this.timerDisplay = document.getElementById("timer-display");
    this.timerBadge = document.getElementById("timer-mode");
    this.btnTimerToggle = document.getElementById("btn-timer-toggle");
    this.btnTimerReset = document.getElementById("btn-timer-reset");
    this.iconPlay = document.getElementById("icon-play");
    this.iconPause = document.getElementById("icon-pause");

    // Quick Actions
    this.btnNewPage = document.getElementById("btn-new-page");
    this.btnAddRootPage = document.getElementById("btn-add-root-page");
    this.btnOpenSearch = document.getElementById("btn-open-search");
    this.btnOpenStats = document.getElementById("btn-open-stats");
    this.btnToggleTheme = document.getElementById("btn-toggle-theme");

    // Modals
    this.searchModal = document.getElementById("search-modal");
    this.globalSearchInput = document.getElementById("global-search-input");
    this.searchResultsList = document.getElementById("search-results-list");

    this.statsModal = document.getElementById("stats-modal");
    this.statsBody = document.getElementById("stats-body");
    this.btnCloseStats = document.getElementById("btn-close-stats");

    this.emojiModal = document.getElementById("emoji-modal");
    this.emojiGrid = document.getElementById("emoji-grid");
    this.btnCloseEmoji = document.getElementById("btn-close-emoji");

    this.coverModal = document.getElementById("cover-modal");
    this.coverPresets = document.getElementById("cover-presets");
    this.btnCloseCover = document.getElementById("btn-close-cover");
    this.coverUrlInput = document.getElementById("cover-url-input");
    this.btnApplyCoverUrl = document.getElementById("btn-apply-cover-url");

    this.editorBottomArea = document.getElementById("editor-bottom-area");
  }

  initEditor() {
    const editorContainer = document.getElementById("editor-container");
    this.editor = new BlockEditor(editorContainer, {
      onChange: (blocks) => {
        this.scheduleAutoSave({ blocks: blocks });
      }
    });

    // Clicking bottom blank area appends new block
    this.editorBottomArea.onclick = () => {
      this.editor.insertBlockAfter(this.editor.blocks.length - 1);
    };
  }

  initTheme() {
    const savedTheme = localStorage.getItem("studynotion_theme") || "light";
    if (savedTheme === "dark") {
      document.body.classList.replace("theme-light", "theme-dark");
      this.updateThemeButton(true);
    }
  }

  updateThemeButton(isDark) {
    const icon = this.btnToggleTheme.querySelector(".theme-icon");
    const label = this.btnToggleTheme.querySelector(".theme-label");
    if (isDark) {
      icon.textContent = "☀️";
      label.textContent = "라이트 모드";
    } else {
      icon.textContent = "🌙";
      label.textContent = "다크 모드";
    }
  }

  initEventListeners() {
    // Theme toggle
    this.btnToggleTheme.onclick = () => {
      const isDark = document.body.classList.contains("theme-dark");
      if (isDark) {
        document.body.classList.replace("theme-dark", "theme-light");
        localStorage.setItem("studynotion_theme", "light");
        this.updateThemeButton(false);
      } else {
        document.body.classList.replace("theme-light", "theme-dark");
        localStorage.setItem("studynotion_theme", "dark");
        this.updateThemeButton(true);
      }
    };

    // Sidebar collapse & expand
    this.btnCollapseSidebar.onclick = () => this.toggleSidebar(true);
    this.btnExpandSidebar.onclick = () => this.toggleSidebar(false);

    // Sidebar Resizer (Drag to adjust width)
    let isResizing = false;
    this.sidebarResizer.onmousedown = (e) => {
      isResizing = true;
      this.sidebarResizer.classList.add("resizing");
      document.body.style.cursor = "col-resize";
    };
    document.onmousemove = (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(200, Math.min(500, e.clientX));
      this.sidebarEl.style.width = `${newWidth}px`;
    };
    document.onmouseup = () => {
      if (isResizing) {
        isResizing = false;
        this.sidebarResizer.classList.remove("resizing");
        document.body.style.cursor = "default";
      }
    };

    // Title editing
    this.pageTitleInput.oninput = () => {
      const newTitle = this.pageTitleInput.value.trim() || "제목 없음";
      this.breadcrumbCurrent.textContent = newTitle;
      this.scheduleAutoSave({ title: newTitle });
      this.updateSidebarPageTitle(this.currentPage.id, newTitle);
    };

    // Status selection
    this.pageStatusSelect.onchange = () => {
      const newStatus = this.pageStatusSelect.value;
      this.scheduleAutoSave({ status: newStatus });
      if (this.currentPage) this.currentPage.status = newStatus;
      this.renderSidebarPages();
    };

    // Favorite toggle
    this.btnToggleFavorite.onclick = () => {
      if (!this.currentPage) return;
      const nextFav = !this.currentPage.is_favorite;
      this.currentPage.is_favorite = nextFav;
      this.btnToggleFavorite.classList.toggle("active", nextFav);
      this.scheduleAutoSave({ is_favorite: nextFav });
      this.renderSidebarPages();
    };

    // Active Recall Quiz Mode (Toggle all)
    this.btnToggleQuiz.onclick = () => {
      const isCollapsed = this.editor.toggleAllToggles();
      const btnText = this.btnToggleQuiz.querySelector(".btn-text");
      if (isCollapsed) {
        btnText.textContent = "토글 모두 펴기";
      } else {
        btnText.textContent = "자가 퀴즈 모드";
      }
    };

    // Export Markdown
    this.btnExportMd.onclick = () => {
      if (!this.currentPage) return;
      window.location.href = `/api/export/${this.currentPage.id}`;
    };

    // Delete Page
    this.btnDeletePage.onclick = () => {
      if (!this.currentPage) return;
      if (confirm(`'${this.currentPage.title}' 노트를 삭제하시겠습니까?`)) {
        this.deleteCurrentPage();
      }
    };

    // New Page Buttons
    this.btnNewPage.onclick = () => this.createNewPage();
    this.btnAddRootPage.onclick = () => this.createNewPage();

    // Tags Management
    this.tagInput.onkeydown = (e) => {
      if (e.key === "Enter" && this.tagInput.value.trim()) {
        e.preventDefault();
        this.addTag(this.tagInput.value.trim());
        this.tagInput.value = "";
      }
    };

    // Status Filter Pills in Sidebar
    const filterContainer = document.getElementById("status-filters");
    filterContainer.onclick = (e) => {
      const pill = e.target.closest(".filter-pill");
      if (!pill) return;
      filterContainer.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      this.currentFilter = pill.getAttribute("data-filter");
      this.renderSidebarPages();
    };

    // Pomodoro Timer Buttons
    this.btnTimerToggle.onclick = () => this.toggleTimer();
    this.btnTimerReset.onclick = () => this.resetTimer();

    // Search Modal (Cmd+K / Ctrl+K)
    this.btnOpenSearch.onclick = () => this.openSearchModal();
    this.globalSearchInput.oninput = () => this.handleGlobalSearch();

    // Stats Dashboard Modal
    this.btnOpenStats.onclick = () => this.openStatsModal();
    this.btnCloseStats.onclick = () => this.statsModal.classList.add("hidden");

    // Emoji Picker Modal
    this.btnPageIcon.onclick = () => this.openEmojiModal();
    this.btnCloseEmoji.onclick = () => this.emojiModal.classList.add("hidden");

    // Cover Image Modal
    this.btnAddCover.onclick = () => this.openCoverModal();
    this.btnChangeCover.onclick = () => this.openCoverModal();
    this.btnRemoveCover.onclick = () => this.removeCover();
    this.btnCloseCover.onclick = () => this.coverModal.classList.add("hidden");
    this.btnApplyCoverUrl.onclick = () => {
      const url = this.coverUrlInput.value.trim();
      if (url) {
        this.setCover(url);
        this.coverModal.classList.add("hidden");
      }
    };

    // Global Shortcuts
    document.addEventListener("keydown", (e) => {
      // Cmd+K / Ctrl+K -> Search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        this.openSearchModal();
      }
      // Alt+N -> New Page
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        this.createNewPage();
      }
      // Ctrl+\ -> Toggle Sidebar
      if (e.ctrlKey && e.key === "\\") {
        e.preventDefault();
        const isCollapsed = this.sidebarEl.classList.contains("collapsed");
        this.toggleSidebar(!isCollapsed);
      }
      // Escape -> close modals
      if (e.key === "Escape") {
        this.searchModal.classList.add("hidden");
        this.statsModal.classList.add("hidden");
        this.emojiModal.classList.add("hidden");
        this.coverModal.classList.add("hidden");
      }
    });

    // Close modals when clicking backdrop
    [this.searchModal, this.statsModal, this.emojiModal, this.coverModal].forEach(modal => {
      modal.onclick = (e) => {
        if (e.target === modal) modal.classList.add("hidden");
      };
    });
  }

  toggleSidebar(collapse) {
    if (collapse) {
      this.sidebarEl.classList.add("collapsed");
      this.btnExpandSidebar.classList.remove("hidden");
    } else {
      this.sidebarEl.classList.remove("collapsed");
      this.btnExpandSidebar.classList.add("hidden");
    }
  }

  // =========================================================================
  // Data Loading & API Calls
  // =========================================================================
  async loadInitialData() {
    await this.fetchPages();
    if (this.pages.length > 0) {
      // Load first page
      await this.loadPage(this.pages[0].id);
    } else {
      await this.createNewPage("첫 번째 공부 노트", "📝");
    }
  }

  async fetchPages() {
    try {
      const res = await fetch("/api/pages");
      const data = await res.json();
      this.pages = data.pages || [];
      this.renderSidebarPages();
    } catch (err) {
      console.error("페이지 목록 조회 오류:", err);
    }
  }

  async loadPage(pageId) {
    try {
      const res = await fetch(`/api/pages/${pageId}`);
      if (!res.ok) throw new Error("페이지를 찾을 수 없습니다.");
      const data = await res.json();
      this.currentPage = data.page;

      this.renderCurrentPage();
      this.renderSidebarPages();
    } catch (err) {
      console.error("페이지 로드 실패:", err);
    }
  }

  renderCurrentPage() {
    if (!this.currentPage) return;
    const p = this.currentPage;

    // Title & breadcrumb
    this.pageTitleInput.value = p.title || "";
    this.breadcrumbCurrent.textContent = p.title || "제목 없음";
    document.title = `${p.title || "제목 없음"} - StudyNotion`;

    // Icon
    this.btnPageIcon.textContent = p.icon || "📝";

    // Cover
    if (p.cover) {
      this.pageCoverEl.style.backgroundImage = p.cover.startsWith("linear-gradient") ? p.cover : `url('${p.cover}')`;
      this.pageCoverEl.classList.add("has-cover");
      this.btnAddCover.style.display = "none";
    } else {
      this.pageCoverEl.classList.remove("has-cover");
      this.pageCoverEl.style.backgroundImage = "";
      this.btnAddCover.style.display = "inline-block";
    }

    // Status
    this.pageStatusSelect.value = p.status || "시작 전";

    // Favorite
    this.btnToggleFavorite.classList.toggle("active", !!p.is_favorite);

    // Tags
    this.renderTags();

    // Accumulated study time
    const mins = Math.floor((p.study_seconds || 0) / 60);
    this.pageStudyTimeEl.textContent = `${mins}분`;

    // Reset quiz mode button text
    const btnText = this.btnToggleQuiz.querySelector(".btn-text");
    btnText.textContent = "자가 퀴즈 모드";

    // Load blocks into editor
    this.editor.loadBlocks(p.blocks || []);
  }

  renderTags() {
    this.tagsListEl.innerHTML = "";
    const tags = this.currentPage.tags || [];
    tags.forEach(tag => {
      const badge = document.createElement("span");
      badge.className = "tag-badge";
      badge.innerHTML = `#${tag} <button class="tag-remove-btn" title="삭제">×</button>`;
      badge.querySelector(".tag-remove-btn").onclick = () => this.removeTag(tag);
      this.tagsListEl.appendChild(badge);
    });
  }

  addTag(tagText) {
    if (!this.currentPage) return;
    if (!this.currentPage.tags) this.currentPage.tags = [];
    if (!this.currentPage.tags.includes(tagText)) {
      this.currentPage.tags.push(tagText);
      this.renderTags();
      this.scheduleAutoSave({ tags: this.currentPage.tags });
    }
  }

  removeTag(tagText) {
    if (!this.currentPage || !this.currentPage.tags) return;
    this.currentPage.tags = this.currentPage.tags.filter(t => t !== tagText);
    this.renderTags();
    this.scheduleAutoSave({ tags: this.currentPage.tags });
  }

  renderSidebarPages() {
    this.favoritesListEl.innerHTML = "";
    this.pagesListEl.innerHTML = "";

    const filtered = this.pages.filter(p => {
      if (this.currentFilter === "all") return true;
      return p.status === this.currentFilter;
    });

    const favorites = filtered.filter(p => p.is_favorite);
    const allNotes = filtered;

    if (favorites.length === 0) {
      this.favoritesGroupEl.style.display = "none";
    } else {
      this.favoritesGroupEl.style.display = "block";
      favorites.forEach(p => {
        this.favoritesListEl.appendChild(this.createPageItemElement(p));
      });
    }

    if (allNotes.length === 0) {
      this.pagesListEl.innerHTML = `<li style="padding:10px;font-size:12px;color:var(--text-muted);">표시할 노트가 없습니다.</li>`;
    } else {
      allNotes.forEach(p => {
        this.pagesListEl.appendChild(this.createPageItemElement(p));
      });
    }
  }

  createPageItemElement(page) {
    const li = document.createElement("li");
    li.className = `page-item ${this.currentPage && this.currentPage.id === page.id ? "active" : ""}`;
    li.setAttribute("data-id", page.id);

    li.innerHTML = `
      <span class="page-item-icon">${page.icon || "📝"}</span>
      <span class="page-item-title">${page.title || "제목 없음"}</span>
      <span class="page-item-status-dot" data-status="${page.status || "시작 전"}" title="상태: ${page.status}"></span>
    `;

    li.onclick = () => {
      if (this.currentPage && this.currentPage.id === page.id) return;
      this.loadPage(page.id);
    };

    return li;
  }

  updateSidebarPageTitle(pageId, title) {
    document.querySelectorAll(`.page-item[data-id="${pageId}"] .page-item-title`).forEach(el => {
      el.textContent = title;
    });
  }

  async createNewPage(title = "새 공부 노트", icon = "📝") {
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, icon, tags: ["공부"] })
      });
      const data = await res.json();
      await this.fetchPages();
      await this.loadPage(data.page.id);
      this.pageTitleInput.focus();
      this.pageTitleInput.select();
    } catch (err) {
      console.error("새 페이지 생성 실패:", err);
    }
  }

  async deleteCurrentPage() {
    if (!this.currentPage) return;
    try {
      await fetch(`/api/pages/${this.currentPage.id}`, { method: "DELETE" });
      await this.fetchPages();
      if (this.pages.length > 0) {
        await this.loadPage(this.pages[0].id);
      } else {
        await this.createNewPage();
      }
    } catch (err) {
      console.error("페이지 삭제 실패:", err);
    }
  }

  // =========================================================================
  // Auto-Save System
  // =========================================================================
  scheduleAutoSave(updates) {
    if (!this.currentPage) return;
    Object.assign(this.currentPage, updates);

    this.setSavingIndicator(true);
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(async () => {
      await this.performAutoSave();
    }, 600);
  }

  async performAutoSave() {
    if (!this.currentPage) return;
    try {
      await fetch(`/api/pages/${this.currentPage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: this.currentPage.title,
          icon: this.currentPage.icon,
          cover: this.currentPage.cover,
          status: this.currentPage.status,
          tags: this.currentPage.tags,
          blocks: this.currentPage.blocks,
          is_favorite: this.currentPage.is_favorite,
          study_seconds: this.currentPage.study_seconds
        })
      });
    } catch (err) {
      console.error("자동 저장 실패:", err);
    } finally {
      this.setSavingIndicator(false);
    }
  }

  setSavingIndicator(saving) {
    if (saving) {
      this.saveIndicator.classList.add("saving");
      this.saveIndicator.querySelector(".indicator-text").textContent = "저장 중...";
    } else {
      this.saveIndicator.classList.remove("saving");
      this.saveIndicator.querySelector(".indicator-text").textContent = "저장됨";
    }
  }

  // =========================================================================
  // Pomodoro Study Timer
  // =========================================================================
  toggleTimer() {
    if (this.timerRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    if (this.timerRunning) return;
    this.timerRunning = true;
    this.iconPlay.classList.add("hidden");
    this.iconPause.classList.remove("hidden");

    this.timerInterval = setInterval(() => {
      this.timerSeconds--;
      this.updateTimerDisplay();

      // Accumulate study time if in focus mode
      if (this.timerMode === "focus" && this.currentPage) {
        this.currentPage.study_seconds = (this.currentPage.study_seconds || 0) + 1;
        if (this.timerSeconds % 30 === 0) {
          const mins = Math.floor(this.currentPage.study_seconds / 60);
          this.pageStudyTimeEl.textContent = `${mins}분`;
        }
      }

      if (this.timerSeconds <= 0) {
        this.handleTimerComplete();
      }
    }, 1000);
  }

  pauseTimer() {
    this.timerRunning = false;
    clearInterval(this.timerInterval);
    this.iconPlay.classList.remove("hidden");
    this.iconPause.classList.add("hidden");
  }

  resetTimer() {
    this.pauseTimer();
    this.timerSeconds = this.timerInitialSeconds;
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const m = Math.floor(this.timerSeconds / 60).toString().padStart(2, "0");
    const s = (this.timerSeconds % 60).toString().padStart(2, "0");
    this.timerDisplay.textContent = `${m}:${s}`;
  }

  async handleTimerComplete() {
    this.pauseTimer();
    this.playChime();

    if (this.timerMode === "focus") {
      // Log completed focus session to API
      try {
        await fetch("/api/study/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page_id: this.currentPage ? this.currentPage.id : null,
            duration_seconds: this.timerInitialSeconds
          })
        });
      } catch (e) {
        console.error("세션 기록 실패:", e);
      }

      alert("🎉 뽀모도로 집중 완료! 5분간 휴식을 취하세요.");
      this.timerMode = "break";
      this.timerBadge.textContent = "휴식";
      this.timerInitialSeconds = 5 * 60;
      this.timerSeconds = 5 * 60;
    } else {
      alert("⏰ 휴식이 끝났습니다! 다시 집중해볼까요?");
      this.timerMode = "focus";
      this.timerBadge.textContent = "집중";
      this.timerInitialSeconds = 25 * 60;
      this.timerSeconds = 25 * 60;
    }

    this.updateTimerDisplay();
  }

  playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {}
  }

  // =========================================================================
  // Quick Search (Cmd+K)
  // =========================================================================
  openSearchModal() {
    this.searchModal.classList.remove("hidden");
    this.globalSearchInput.value = "";
    this.globalSearchInput.focus();
    this.handleGlobalSearch();
  }

  handleGlobalSearch() {
    const q = this.globalSearchInput.value.toLowerCase().trim();
    if (!q) {
      this.searchResultsList.innerHTML = `<div class="search-empty-state">검색어를 입력하면 노트 제목, 태그, 본문에서 찾아드립니다.</div>`;
      return;
    }

    const matched = this.pages.filter(p => {
      const titleMatch = (p.title || "").toLowerCase().includes(q);
      const tagMatch = (p.tags || []).some(t => t.toLowerCase().includes(q));
      return titleMatch || tagMatch;
    });

    if (matched.length === 0) {
      this.searchResultsList.innerHTML = `<div class="search-empty-state">'${q}'에 대한 검색 결과가 없습니다.</div>`;
      return;
    }

    this.searchResultsList.innerHTML = "";
    matched.forEach(p => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      item.innerHTML = `
        <span style="font-size:20px;">${p.icon || "📝"}</span>
        <div class="search-result-info">
          <div class="search-result-title">${p.title || "제목 없음"}</div>
          <div class="search-result-snippet">상태: ${p.status} | 태그: ${(p.tags || []).map(t => '#' + t).join(' ')}</div>
        </div>
      `;
      item.onclick = () => {
        this.searchModal.classList.add("hidden");
        this.loadPage(p.id);
      };
      this.searchResultsList.appendChild(item);
    });
  }

  // =========================================================================
  // Study Dashboard Modal
  // =========================================================================
  async openStatsModal() {
    this.statsModal.classList.remove("hidden");
    this.statsBody.innerHTML = `<div style="text-align:center;padding:20px;">통계 데이터를 불러오는 중...</div>`;

    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      const s = data.stats;

      const totalMins = Math.floor(s.total_study_seconds / 60);
      const todayMins = Math.floor(s.today_study_seconds / 60);

      this.statsBody.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">총 작성 노트</span>
            <span class="stat-val">${s.total_notes}개</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">오늘 공부 시간</span>
            <span class="stat-val">${todayMins}분</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">총 누적 공부 시간</span>
            <span class="stat-val">${Math.floor(totalMins / 60)}시간 ${totalMins % 60}분</span>
          </div>
        </div>

        <div style="background:var(--bg-secondary);padding:14px;border-radius:var(--radius-md);border:1px solid var(--border-color);">
          <h4 style="font-size:13px;margin-bottom:10px;">📋 학습 상태별 노트 현황</h4>
          <div class="stat-status-bar">
            <div class="status-bar-item"><span>⚪ 시작 전</span> <strong>${s.status_counts['시작 전'] || 0}개</strong></div>
            <div class="status-bar-item"><span>🔵 공부 중</span> <strong>${s.status_counts['공부 중'] || 0}개</strong></div>
            <div class="status-bar-item"><span>🟠 복습 필요</span> <strong>${s.status_counts['복습 필요'] || 0}개</strong></div>
            <div class="status-bar-item"><span>🟢 학습 완료</span> <strong>${s.status_counts['완료'] || 0}개</strong></div>
          </div>
        </div>

        <div>
          <h4 style="font-size:13px;margin-bottom:10px;">⏱️ 최근 공부 세션 기록</h4>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${(s.recent_sessions || []).map(sess => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg-subtle);border-radius:var(--radius-sm);font-size:12px;border:1px solid var(--border-color);">
                <span>${sess.icon} ${sess.title}</span>
                <span style="color:var(--text-secondary);font-weight:600;">${Math.round(sess.duration_seconds / 60)}분 (${sess.session_date})</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      this.statsBody.innerHTML = `<div style="color:red;padding:20px;">통계 조회 실패: ${err.message}</div>`;
    }
  }

  // =========================================================================
  // Emoji & Cover Pickers
  // =========================================================================
  openEmojiModal() {
    this.emojiModal.classList.remove("hidden");
    const emojis = [
      "📝", "📚", "💻", "🧠", "🎯", "🚀", "💡", "🔬",
      "📐", "✏️", "📖", "🔍", "⚡", "⭐", "🔥", "☕",
      "📊", "📅", "🏆", "🎨", "🌐", "🤖", "📌", "🎓",
      "⚙️", "🧩", "🧪", "📈", "🕹️", "🎧", "💬", "🔑"
    ];
    this.emojiGrid.innerHTML = "";
    emojis.forEach(emo => {
      const btn = document.createElement("button");
      btn.className = "emoji-choice-btn";
      btn.textContent = emo;
      btn.onclick = () => {
        this.btnPageIcon.textContent = emo;
        if (this.currentPage) {
          this.currentPage.icon = emo;
          this.scheduleAutoSave({ icon: emo });
          this.updateSidebarPageIcon(this.currentPage.id, emo);
        }
        this.emojiModal.classList.add("hidden");
      };
      this.emojiGrid.appendChild(btn);
    });
  }

  updateSidebarPageIcon(pageId, icon) {
    document.querySelectorAll(`.page-item[data-id="${pageId}"] .page-item-icon`).forEach(el => {
      el.textContent = icon;
    });
  }

  openCoverModal() {
    this.coverModal.classList.remove("hidden");
    const presets = [
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "linear-gradient(135deg, #2af598 0%, #009efd 100%)",
      "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)",
      "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
      "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
      "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
    ];

    this.coverPresets.innerHTML = "";
    presets.forEach(grad => {
      const card = document.createElement("div");
      card.className = "cover-preset-card";
      card.style.background = grad;
      card.onclick = () => {
        this.setCover(grad);
        this.coverModal.classList.add("hidden");
      };
      this.coverPresets.appendChild(card);
    });
  }

  setCover(coverStyle) {
    if (!this.currentPage) return;
    this.currentPage.cover = coverStyle;
    this.pageCoverEl.style.backgroundImage = coverStyle.startsWith("linear-gradient") ? coverStyle : `url('${coverStyle}')`;
    this.pageCoverEl.classList.add("has-cover");
    this.btnAddCover.style.display = "none";
    this.scheduleAutoSave({ cover: coverStyle });
  }

  removeCover() {
    if (!this.currentPage) return;
    this.currentPage.cover = "";
    this.pageCoverEl.classList.remove("has-cover");
    this.pageCoverEl.style.backgroundImage = "";
    this.btnAddCover.style.display = "inline-block";
    this.scheduleAutoSave({ cover: "" });
  }
}

// Start application when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  window.app = new StudyNotionApp();
});

