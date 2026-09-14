/**
 * StudyNotion Block Editor Engine
 * Handles Notion-style block lifecycle, slash command menu, keyboard shortcuts,
 * and active recall (toggle quizzing).
 */

class BlockEditor {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.onChange = options.onChange || (() => {});
    this.blocks = [];
    this.activeBlockIndex = -1;

    this.slashMenuEl = document.getElementById("slash-menu");
    this.slashListEl = document.getElementById("slash-menu-list");
    this.slashSelectedIndex = 0;
    this.slashFilteredCommands = [];
    this.slashTriggerBlockIndex = -1;

    this.initCommands();
    this.initEventListeners();
  }

  initCommands() {
    this.commands = [
      { id: "text", title: "일반 텍스트", desc: "기본 문단을 작성합니다", icon: "📝" },
      { id: "h1", title: "제목 1", desc: "대주제 헤딩 (H1)", icon: "H1" },
      { id: "h2", title: "제목 2", desc: "중주제 헤딩 (H2)", icon: "H2" },
      { id: "h3", title: "제목 3", desc: "소주제 헤딩 (H3)", icon: "H3" },
      { id: "todo", title: "할 일 목록", desc: "체크리스트 작성", icon: "☑️" },
      { id: "toggle", title: "토글 목록 (자가시험)", desc: "질문을 적고 답을 숨겨 복습합니다", icon: "▶" },
      { id: "callout", title: "콜아웃 상자", desc: "핵심 요약이나 주의점 강조", icon: "💡" },
      { id: "code", title: "코드 블록", desc: "프로그래밍 코드 스니펫", icon: "</>" },
      { id: "math", title: "수식 공식", desc: "수학/과학 공식 표현", icon: "∑" },
      { id: "bullet", title: "글머리 기호 목록", desc: "점 기호 목록 작성", icon: "•" },
      { id: "number", title: "번호 매기기 목록", desc: "순서가 있는 목록 작성", icon: "1." },
      { id: "quote", title: "인용구", desc: "중요 문장이나 인용문", icon: "❝" },
      { id: "divider", title: "구분선", desc: "시각적 구분선 추가", icon: "―" }
    ];
  }

  initEventListeners() {
    // Click outside to close slash menu
    document.addEventListener("click", (e) => {
      if (!this.slashMenuEl.contains(e.target)) {
        this.hideSlashMenu();
      }
    });

    // Keyboard navigation in slash menu
    document.addEventListener("keydown", (e) => {
      if (!this.isSlashMenuVisible()) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.navigateSlashMenu(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.navigateSlashMenu(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        this.executeSelectedSlashCommand();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.hideSlashMenu();
      }
    });
  }

  loadBlocks(blocks) {
    if (!blocks || blocks.length === 0) {
      this.blocks = [this.createEmptyBlock("text")];
    } else {
      this.blocks = JSON.parse(JSON.stringify(blocks));
    }
    this.render();
  }

  createEmptyBlock(type = "text", content = "") {
    return {
      id: "b_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      type: type,
      content: content,
      checked: false,
      header: type === "toggle" ? "질문이나 개념을 입력하세요" : "",
      icon: "💡",
      color: "blue",
      language: "python"
    };
  }

  render() {
    this.container.innerHTML = "";
    this.blocks.forEach((block, index) => {
      const blockEl = this.createBlockElement(block, index);
      this.container.appendChild(blockEl);
    });
  }

  createBlockElement(block, index) {
    const el = document.createElement("div");
    el.className = "editor-block";
    el.setAttribute("data-type", block.type);
    el.setAttribute("data-index", index);

    // Block Handle (drag / add)
    const handle = document.createElement("div");
    handle.className = "block-handle";
    handle.innerHTML = "⠿";
    handle.title = "블록 옵션 / 드래그";
    handle.onclick = (e) => {
      e.stopPropagation();
      this.showBlockOptionsMenu(index, handle);
    };
    el.appendChild(handle);

    // Block specific structure
    if (block.type === "todo") {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "todo-checkbox";
      checkbox.checked = !!block.checked;
      if (block.checked) el.classList.add("checked");

      checkbox.onchange = (e) => {
        block.checked = e.target.checked;
        if (block.checked) el.classList.add("checked");
        else el.classList.remove("checked");
        this.notifyChange();
      };
      el.appendChild(checkbox);

      const contentEl = this.createContentEditable(block, index, "할 일을 입력하세요...");
      el.appendChild(contentEl);

    } else if (block.type === "bullet") {
      const prefix = document.createElement("span");
      prefix.className = "block-prefix";
      prefix.textContent = "•";
      el.appendChild(prefix);

      const contentEl = this.createContentEditable(block, index, "목록 항목...");
      el.appendChild(contentEl);

    } else if (block.type === "number") {
      const prefix = document.createElement("span");
      prefix.className = "block-prefix";
      prefix.textContent = `${index + 1}.`;
      el.appendChild(prefix);

      const contentEl = this.createContentEditable(block, index, "목록 항목...");
      el.appendChild(contentEl);

    } else if (block.type === "toggle") {
      const headerRow = document.createElement("div");
      headerRow.className = "toggle-header-row";

      const arrow = document.createElement("span");
      arrow.className = "toggle-arrow";
      arrow.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
      arrow.onclick = (e) => {
        e.stopPropagation();
        el.classList.toggle("collapsed");
      };
      headerRow.appendChild(arrow);

      const headerContent = document.createElement("div");
      headerContent.className = "block-content toggle-header-content";
      headerContent.contentEditable = "true";
      headerContent.innerHTML = block.header || "토글 질문/주제...";
      headerContent.oninput = () => {
        block.header = headerContent.innerHTML;
        this.notifyChange();
      };
      this.attachKeydownEvents(headerContent, index);
      headerRow.appendChild(headerContent);
      el.appendChild(headerRow);

      const body = document.createElement("div");
      body.className = "toggle-body";
      const bodyContent = this.createContentEditable(block, index, "정답 또는 상세 내용을 입력하세요...");
      body.appendChild(bodyContent);
      el.appendChild(body);

    } else if (block.type === "callout") {
      const icon = document.createElement("span");
      icon.className = "callout-icon";
      icon.textContent = block.icon || "💡";
      icon.onclick = () => {
        const nextIcon = prompt("콜아웃 이모지를 입력하세요:", block.icon || "💡");
        if (nextIcon) {
          block.icon = nextIcon;
          icon.textContent = nextIcon;
          this.notifyChange();
        }
      };
      el.appendChild(icon);

      const contentEl = this.createContentEditable(block, index, "강조할 핵심 내용...");
      el.appendChild(contentEl);

    } else if (block.type === "code") {
      const header = document.createElement("div");
      header.className = "code-header";

      const langTag = document.createElement("span");
      langTag.className = "code-lang-tag";
      langTag.textContent = block.language || "CODE";
      langTag.onclick = () => {
        const nextLang = prompt("프로그래밍 언어를 입력하세요 (예: python, js, c, java, sql):", block.language || "python");
        if (nextLang) {
          block.language = nextLang.toLowerCase();
          langTag.textContent = block.language;
          this.notifyChange();
        }
      };
      header.appendChild(langTag);

      const copyBtn = document.createElement("button");
      copyBtn.className = "code-copy-btn";
      copyBtn.textContent = "복사";
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(block.content || "");
        copyBtn.textContent = "복사됨!";
        setTimeout(() => { copyBtn.textContent = "복사"; }, 1500);
      };
      header.appendChild(copyBtn);
      el.appendChild(header);

      const contentEl = document.createElement("div");
      contentEl.className = "block-content";
      contentEl.contentEditable = "true";
      contentEl.spellcheck = false;
      contentEl.textContent = block.content || "";
      contentEl.oninput = () => {
        block.content = contentEl.textContent;
        this.notifyChange();
      };
      contentEl.onkeydown = (e) => {
        if (e.key === "Tab") {
          e.preventDefault();
          document.execCommand("insertText", false, "  ");
        }
      };
      el.appendChild(contentEl);

    } else if (block.type === "math") {
      const contentEl = this.createContentEditable(block, index, "LaTeX 수식을 입력하세요 (예: E = mc^2)");
      el.appendChild(contentEl);

    } else if (block.type === "divider") {
      const line = document.createElement("div");
      line.className = "divider-line";
      el.appendChild(line);

    } else {
      // Regular text / Heading 1, 2, 3 / Quote
      let placeholder = "내용을 입력하거나 '/'를 눌러 명령을 실행하세요...";
      if (block.type === "h1") placeholder = "제목 1";
      else if (block.type === "h2") placeholder = "제목 2";
      else if (block.type === "h3") placeholder = "제목 3";
      else if (block.type === "quote") placeholder = "인용문...";

      const contentEl = this.createContentEditable(block, index, placeholder);
      el.appendChild(contentEl);
    }

    return el;
  }

  createContentEditable(block, index, placeholder) {
    const el = document.createElement("div");
    el.className = "block-content";
    el.contentEditable = "true";
    el.setAttribute("placeholder", placeholder);
    el.innerHTML = block.content || "";

    el.oninput = (e) => {
      block.content = el.innerHTML;
      this.handleInputForSlashMenu(el, index);
      this.notifyChange();
    };

    this.attachKeydownEvents(el, index);
    return el;
  }

  attachKeydownEvents(contentEl, index) {
    contentEl.onkeydown = (e) => {
      // Enter key -> create new block
      if (e.key === "Enter" && !e.shiftKey && !this.isSlashMenuVisible()) {
        e.preventDefault();
        this.insertBlockAfter(index);
        return;
      }

      // Backspace on empty block -> remove or convert
      if (e.key === "Backspace" && contentEl.textContent.trim() === "") {
        if (this.blocks[index].type !== "text") {
          e.preventDefault();
          this.convertBlockType(index, "text");
          return;
        } else if (this.blocks.length > 1) {
          e.preventDefault();
          this.deleteBlock(index);
          return;
        }
      }

      // Arrow navigation
      if (e.key === "ArrowUp" && !this.isSlashMenuVisible()) {
        const prevBlock = this.container.children[index - 1];
        if (prevBlock) {
          const prevContent = prevBlock.querySelector(".block-content");
          if (prevContent) {
            prevContent.focus();
            this.placeCaretAtEnd(prevContent);
          }
        }
      } else if (e.key === "ArrowDown" && !this.isSlashMenuVisible()) {
        const nextBlock = this.container.children[index + 1];
        if (nextBlock) {
          const nextContent = nextBlock.querySelector(".block-content");
          if (nextContent) {
            nextContent.focus();
          }
        }
      }
    };
  }

  insertBlockAfter(index, type = "text") {
    const newBlock = this.createEmptyBlock(type);
    this.blocks.splice(index + 1, 0, newBlock);
    this.render();
    this.focusBlock(index + 1);
    this.notifyChange();
  }

  deleteBlock(index) {
    this.blocks.splice(index, 1);
    this.render();
    const targetIdx = Math.max(0, index - 1);
    this.focusBlock(targetIdx, true);
    this.notifyChange();
  }

  convertBlockType(index, newType) {
    const b = this.blocks[index];
    b.type = newType;
    if (newType === "toggle" && !b.header) {
      b.header = b.content || "토글 질문/주제";
      b.content = "";
    }
    this.render();
    this.focusBlock(index);
    this.notifyChange();
  }

  focusBlock(index, atEnd = false) {
    const blockEl = this.container.children[index];
    if (blockEl) {
      const contentEl = blockEl.querySelector(".block-content");
      if (contentEl) {
        contentEl.focus();
        if (atEnd) {
          this.placeCaretAtEnd(contentEl);
        }
      }
    }
  }

  placeCaretAtEnd(el) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // =========================================================================
  // Slash Command Menu Logic
  // =========================================================================
  handleInputForSlashMenu(contentEl, index) {
    const text = contentEl.textContent;
    const slashIdx = text.lastIndexOf("/");

    if (slashIdx !== -1) {
      const query = text.substring(slashIdx + 1).toLowerCase().trim();
      this.showSlashMenu(contentEl, index, query);
    } else {
      this.hideSlashMenu();
    }
  }

  showSlashMenu(targetEl, blockIndex, query) {
    this.slashTriggerBlockIndex = blockIndex;
    this.slashFilteredCommands = this.commands.filter(cmd => 
      cmd.title.toLowerCase().includes(query) || 
      cmd.id.toLowerCase().includes(query) ||
      cmd.desc.toLowerCase().includes(query)
    );

    if (this.slashFilteredCommands.length === 0) {
      this.hideSlashMenu();
      return;
    }

    this.slashSelectedIndex = 0;
    this.renderSlashMenuItems();

    // Position menu below block
    const rect = targetEl.getBoundingClientRect();
    this.slashMenuEl.style.top = `${rect.bottom + window.scrollY + 4}px`;
    this.slashMenuEl.style.left = `${rect.left + window.scrollX}px`;
    this.slashMenuEl.classList.remove("hidden");
  }

  renderSlashMenuItems() {
    this.slashListEl.innerHTML = "";
    this.slashFilteredCommands.forEach((cmd, i) => {
      const item = document.createElement("div");
      item.className = `slash-menu-item ${i === this.slashSelectedIndex ? "selected" : ""}`;
      item.innerHTML = `
        <div class="slash-item-icon">${cmd.icon}</div>
        <div class="slash-item-info">
          <span class="slash-item-title">${cmd.title}</span>
          <span class="slash-item-desc">${cmd.desc}</span>
        </div>
      `;
      item.onclick = (e) => {
        e.stopPropagation();
        this.executeSlashCommand(cmd.id);
      };
      this.slashListEl.appendChild(item);
    });
  }

  navigateSlashMenu(direction) {
    if (this.slashFilteredCommands.length === 0) return;
    this.slashSelectedIndex = (this.slashSelectedIndex + direction + this.slashFilteredCommands.length) % this.slashFilteredCommands.length;
    this.renderSlashMenuItems();
    const selected = this.slashListEl.children[this.slashSelectedIndex];
    if (selected) selected.scrollIntoView({ block: "nearest" });
  }

  executeSelectedSlashCommand() {
    if (this.slashFilteredCommands.length > 0) {
      const cmd = this.slashFilteredCommands[this.slashSelectedIndex];
      this.executeSlashCommand(cmd.id);
    }
  }

  executeSlashCommand(commandId) {
    const idx = this.slashTriggerBlockIndex;
    if (idx >= 0 && idx < this.blocks.length) {
      // Clear trailing /query from block content
      const block = this.blocks[idx];
      let text = block.content.replace(/<[^>]+>/g, "");
      const slashIdx = text.lastIndexOf("/");
      if (slashIdx !== -1) {
        text = text.substring(0, slashIdx);
      }
      block.content = text;
      this.convertBlockType(idx, commandId);
    }
    this.hideSlashMenu();
  }

  hideSlashMenu() {
    this.slashMenuEl.classList.add("hidden");
    this.slashTriggerBlockIndex = -1;
  }

  isSlashMenuVisible() {
    return !this.slashMenuEl.classList.contains("hidden");
  }

  // =========================================================================
  // Active Recall: Toggle Quiz Mode
  // =========================================================================
  toggleAllToggles(shouldCollapse = null) {
    const toggleBlocks = this.container.querySelectorAll('.editor-block[data-type="toggle"]');
    if (toggleBlocks.length === 0) {
      return 0;
    }

    let collapse;
    if (shouldCollapse !== null) {
      collapse = shouldCollapse;
    } else {
      // Toggle state based on first element
      collapse = !toggleBlocks[0].classList.contains("collapsed");
    }

    toggleBlocks.forEach(el => {
      if (collapse) el.classList.add("collapsed");
      else el.classList.remove("collapsed");
    });

    return collapse;
  }

  showBlockOptionsMenu(index, handleEl) {
    const action = confirm("이 블록을 삭제하시겠습니까? (취소 시 유지)");
    if (action) {
      this.deleteBlock(index);
    }
  }

  notifyChange() {
    this.onChange(this.getBlocks());
  }

  getBlocks() {
    return JSON.parse(JSON.stringify(this.blocks));
  }
}

