document.addEventListener("DOMContentLoaded", () => {
  renderCurrentYear();
  functionGallery.initialize();
});

function renderCurrentYear() {
  const yearElement = document.getElementById("year");
  if (yearElement) yearElement.textContent = String(new Date().getFullYear());
}

const storageKey = "function-gallery-items";

const functionGallery = {
  items: [],
  editingId: null,

  initialize() {
    this.cacheDom();
    this.bindEvents();
    this.loadItems();
    this.renderItems();
  },

  cacheDom() {
    this.editorPanel = document.getElementById("editorPanel");
    this.editorForm = document.getElementById("editorForm");
    this.editorTitle = document.getElementById("editorTitle");
    this.editorStatus = document.getElementById("editorStatus");
    this.itemId = document.getElementById("itemId");
    this.itemName = document.getElementById("itemName");
    this.itemDesc = document.getElementById("itemDesc");
    this.itemCode = document.getElementById("itemCode");

    this.itemsList = document.getElementById("itemsList");
    this.itemsEmpty = document.getElementById("itemsEmpty");

    this.newItemButton = document.getElementById("newItemButton");
    this.itemTemplate = document.getElementById("itemTemplate");
    this.cancelEditButton = document.getElementById("cancelEdit");
  },

  bindEvents() {
    this.editorForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveItem();
    });

    this.cancelEditButton.addEventListener("click", () => {
      this.clearEditor();
      this.editorStatus.textContent = "";
    });

    this.newItemButton.addEventListener("click", () => {
      this.beginCreate();
    });

    this.itemsList.addEventListener("click", (event) => {
      const target = event.target;
      const itemElement = target.closest(".item");
      if (!itemElement) return;
      const id = itemElement.dataset.id;
      if (!id) return;

      if (target.classList.contains("item-code-btn")) {
        this.toggleCodePanel(itemElement, id);
      } else if (target.classList.contains("item-preview-btn")) {
        this.togglePreviewPanel(itemElement, id);
      } else if (target.classList.contains("item-edit-btn")) {
        this.beginEdit(id);
      } else if (target.classList.contains("item-delete-btn")) {
        this.deleteItem(id);
      } else if (target.classList.contains("copy-btn")) {
        this.copyCode(itemElement, id);
      }
    });
  },

  loadItems() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) this.items = JSON.parse(raw);
      if (!Array.isArray(this.items)) this.items = [];
    } catch {
      this.items = [];
    }

    if (this.items.length === 0) {
      this.items = this.seedItems();
      this.persist();
    }
  },

  seedItems() {
    const now = Date.now();
    return [
      {
        id: crypto.randomUUID(),
        name: "Counter Button",
        description: "A tiny counter that increments on click.",
        code:
`<button id="btn" style="padding:.6rem 1rem;border-radius:10px;border:1px solid #333;background:#0a84ff;color:white">Count: <span id="count">0</span></button>
<script>
  const btn = document.getElementById('btn');
  const count = document.getElementById('count');
  let n = 0; btn.addEventListener('click', ()=>{ n++; count.textContent = n; });
</script>`,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        name: "Toast Notification",
        description: "Show a transient toast message.",
        code:
`<style>
  .toast{position:fixed;inset:auto 1rem 1rem auto;background:#111;border:1px solid #333;color:#e6e6e9;padding:.6rem .8rem;border-radius:10px;opacity:0;transform:translateY(8px);transition:.25s}
  .toast.show{opacity:1;transform:translateY(0)}
</style>
<button id="show">Show Toast</button>
<div id="toast" class="toast">Hello from the toast!</div>
<script>
  const t=document.getElementById('toast');
  const s=document.getElementById('show');
  s.addEventListener('click',()=>{t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1500);});
</script>`,
        createdAt: now,
        updatedAt: now,
      }
    ];
  },

  persist() {
    window.localStorage.setItem(storageKey, JSON.stringify(this.items));
  },

  renderItems() {
    this.itemsList.innerHTML = "";
    const hasItems = this.items.length > 0;
    this.itemsEmpty.style.display = hasItems ? "none" : "block";
    if (!hasItems) return;

    for (const item of this.items) {
      const li = this.itemTemplate.content.firstElementChild.cloneNode(true);
      li.dataset.id = item.id;
      li.querySelector(".item-name").textContent = item.name;
      li.querySelector(".item-desc").textContent = item.description;
      // Store code on element for quick access
      li.dataset.code = item.code;
      this.itemsList.appendChild(li);
    }
  },

  beginCreate() {
    this.editingId = null;
    this.editorTitle.textContent = "Add Function";
    this.itemId.value = "";
    this.itemName.value = "";
    this.itemDesc.value = "";
    this.itemCode.value = "";
    this.itemName.focus();
  },

  beginEdit(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    this.editingId = id;
    this.editorTitle.textContent = "Edit Function";
    this.itemId.value = id;
    this.itemName.value = item.name;
    this.itemDesc.value = item.description;
    this.itemCode.value = item.code;
    this.itemName.focus();
    this.editorStatus.textContent = "Editing…";
  },

  saveItem() {
    const name = this.itemName.value.trim();
    const description = this.itemDesc.value.trim();
    const code = this.itemCode.value;

    if (!name || !description || !code) {
      this.editorStatus.textContent = "Please fill out all fields.";
      return;
    }

    const now = Date.now();
    if (this.editingId) {
      const item = this.items.find(i => i.id === this.editingId);
      if (!item) return;
      item.name = name;
      item.description = description;
      item.code = code;
      item.updatedAt = now;
      this.editorStatus.textContent = "Saved changes.";
    } else {
      const newItem = {
        id: crypto.randomUUID(),
        name,
        description,
        code,
        createdAt: now,
        updatedAt: now,
      };
      this.items.unshift(newItem);
      this.editorStatus.textContent = "Added.";
    }

    this.persist();
    this.renderItems();
    this.clearEditorFieldsOnly();
  },

  deleteItem(id) {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) return;
    this.items.splice(index, 1);
    this.persist();
    this.renderItems();
  },

  clearEditor() {
    this.editingId = null;
    this.editorTitle.textContent = "Add Function";
    this.clearEditorFieldsOnly();
  },

  clearEditorFieldsOnly() {
    this.itemId.value = "";
    this.itemName.value = "";
    this.itemDesc.value = "";
    this.itemCode.value = "";
  },

  toggleCodePanel(itemElement, id) {
    const panel = itemElement.querySelector(".code-panel");
    const codeBlock = panel.querySelector("code");
    if (panel.classList.contains("is-hidden")) {
      const item = this.items.find(i => i.id === id);
      codeBlock.textContent = item ? item.code : itemElement.dataset.code || "";
      panel.classList.remove("is-hidden");
    } else {
      panel.classList.add("is-hidden");
    }
  },

  togglePreviewPanel(itemElement, id) {
    const panel = itemElement.querySelector(".preview-panel");
    const frame = panel.querySelector(".preview-frame");
    if (panel.classList.contains("is-hidden")) {
      const item = this.items.find(i => i.id === id);
      const srcdoc = this.buildPreviewHtml(item ? item.code : itemElement.dataset.code || "");
      frame.srcdoc = srcdoc;
      panel.classList.remove("is-hidden");
    } else {
      frame.srcdoc = "";
      panel.classList.add("is-hidden");
    }
  },

  buildPreviewHtml(code) {
    const hasHtml = /<\s*html[\s>]/i.test(code) || /<\s*body[\s>]/i.test(code);
    if (hasHtml) return code;
    return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>html,body{background:#0b0b0f;color:#e6e6e9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial;margin:0;padding:1rem} button{cursor:pointer}</style>
</head><body>${code}</body></html>`;
  },

  copyCode(itemElement, id) {
    const codeBlock = itemElement.querySelector(".code-panel code");
    const text = codeBlock.textContent || "";
    navigator.clipboard.writeText(text).then(() => {
      this.toast("Copied");
    }).catch(() => {
      this.toast("Copy failed");
    });
  },

  toast(message) {
    this.editorStatus.textContent = message;
    setTimeout(() => { if (this.editorStatus.textContent === message) this.editorStatus.textContent = ""; }, 1200);
  }
};