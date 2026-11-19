// 文件分享站前端逻辑
// 从 files.json 读取文件清单，渲染列表 / 网格，支持搜索、下载、复制链接。
// files.json 由 build-manifest.mjs 扫描 files/ 目录自动生成。

const state = {
  files: [],
  view: "list",
  query: "",
};

const els = {
  list: document.getElementById("file-list"),
  search: document.getElementById("search"),
  empty: document.getElementById("empty-state"),
  noResults: document.getElementById("no-results"),
  toggles: Array.from(document.querySelectorAll(".toggle-btn")),
};

/** 把字节数格式化为人类可读大小 */
function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return bytes + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return value.toFixed(value >= 100 ? 0 : 1) + " " + units[i];
}

/** 根据扩展名返回图标与类型标签 */
function iconFor(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const map = {
    pdf: ["📕", "PDF"],
    doc: ["📘", "Word"],
    docx: ["📘", "Word"],
    xls: ["📗", "Excel"],
    xlsx: ["📗", "Excel"],
    ppt: ["📙", "PowerPoint"],
    pptx: ["📙", "PowerPoint"],
    txt: ["📄", "文本"],
    md: ["📝", "Markdown"],
    zip: ["🗜️", "压缩包"],
    rar: ["🗜️", "压缩包"],
    "7z": ["🗜️", "压缩包"],
    gz: ["🗜️", "压缩包"],
    tar: ["🗜️", "压缩包"],
    jpg: ["🖼️", "图片"],
    jpeg: ["🖼️", "图片"],
    png: ["🖼️", "图片"],
    gif: ["🖼️", "图片"],
    webp: ["🖼️", "图片"],
    svg: ["🖼️", "图片"],
    mp4: ["🎬", "视频"],
    mov: ["🎬", "视频"],
    mkv: ["🎬", "视频"],
    webm: ["🎬", "视频"],
    mp3: ["🎵", "音频"],
    wav: ["🎵", "音频"],
    flac: ["🎵", "音频"],
    m4a: ["🎵", "音频"],
    js: ["📜", "JS"],
    ts: ["📜", "TS"],
    html: ["🌐", "HTML"],
    css: ["🎨", "CSS"],
    json: ["🗂️", "JSON"],
    exe: ["⚙️", "程序"],
    apk: ["🤖", "APK"],
  };
  return map[ext] || ["📄", ext ? ext.toUpperCase() : "文件"];
}

/** 把文件名转成安全的显示文本（转义 HTML） */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 相对路径 → 可访问的 URL（保持中文路径可用） */
function fileUrl(path) {
  return "files/" + path.split("/").map(encodeURIComponent).join("/");
}

/** 渲染单个文件卡片 */
function renderCard(file) {
  const [icon, tag] = iconFor(file.name);
  const card = document.createElement("div");
  card.className = "file-card";
  const size = formatSize(file.size);
  const metaParts = [tag];
  if (size) metaParts.push(size);
  if (file.mtime) metaParts.push(new Date(file.mtime).toLocaleDateString("zh-CN"));

  card.innerHTML = `
    <div class="file-icon" aria-hidden="true">${icon}</div>
    <div class="file-info">
      <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
      <div class="file-meta">${escapeHtml(metaParts.join(" · "))}</div>
    </div>
    <div class="file-actions">
      <a class="btn btn-primary" href="${escapeHtml(fileUrl(file.path))}" download="${escapeHtml(file.name)}">⬇ 下载</a>
      <button class="btn btn-ghost copy-btn" title="复制下载链接">🔗</button>
    </div>
  `;
  card.querySelector(".copy-btn").addEventListener("click", () => {
    const url = new URL(fileUrl(file.path), location.href).href;
    navigator.clipboard?.writeText(url).then(
      () => flashCopied(card),
      () => prompt("复制此下载链接：", url)
    );
  });
  return card;
}

/** 复制成功的小反馈 */
function flashCopied(card) {
  const btn = card.querySelector(".copy-btn");
  const old = btn.textContent;
  btn.textContent = "✅";
  setTimeout(() => (btn.textContent = old), 1200);
}

/** 应用搜索过滤 */
function applyFilter() {
  const q = state.query.trim().toLowerCase();
  const filtered = q
    ? state.files.filter((f) => f.name.toLowerCase().includes(q))
    : state.files;
  render(filtered);
  els.empty.hidden = state.files.length !== 0;
  els.noResults.hidden = filtered.length !== 0 || state.files.length === 0;
}

/** 渲染文件列表 */
function render(files) {
  els.list.innerHTML = "";
  els.list.classList.toggle("grid-view", state.view === "grid");
  for (const file of files) {
    els.list.appendChild(renderCard(file));
  }
}

/** 切换视图 */
function setView(view) {
  state.view = view;
  els.toggles.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  applyFilter();
}

/** 加载清单 */
async function load() {
  try {
    const res = await fetch("files.json", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    state.files = Array.isArray(data.files) ? data.files : [];
  } catch (err) {
    console.error("加载文件清单失败：", err);
    state.files = [];
  }
  applyFilter();
}

// 事件绑定
els.search.addEventListener("input", (e) => {
  state.query = e.target.value;
  applyFilter();
});
els.toggles.forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

load();