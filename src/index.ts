import OverType from "overtype";

const DB_NAME = "markdownEditorDB";
const DB_STORE = "documents";

async function saveDocument(id: string, content: string, title: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("documents", "readwrite");
    const store = tx.objectStore("documents");
    store.put({ id, content, title, updated: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Debounce helper that works with functions taking parameters
function debounce<F extends (...args: any[]) => void>(fn: F, delay: number) {
  let timer: number | null = null;
  return (...args: Parameters<F>) => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

const saveAutosave = debounce(async (content: string, title: string) => {
  try {
    await saveDocument("autosave", content, title);
    console.log("Autosaved");
  } catch (err) {
    console.error("Autosave failed", err);
  }
}, 1000);

const [editor] = new OverType("#editor", {
  // options...
  autofocus: true,
  minHeight: "90vh",
  autoResize: true,
  textareaProps: {
    autocomplete: true,
    spellcheck: "default",
  },
  onChange: (value, instance) => {
    console.log("Content changed:", value);
    // Call autosave or other logic here using value
    const currentTitle = titleInput?.value || "Untitled";
    saveAutosave(value, currentTitle);
  },
});

const titleInput = document.querySelector<HTMLInputElement>(
  'input[name="title"]',
);

function sanitizeTitle(value: string): string {
  return (
    value
      // Remove reserved characters for Windows/macOS/Linux
      .replace(/[\\\/:*?"<>|#%&{}$!'@+=;`~]/g, "")
      // Convert runs of whitespace to a single space
      .replace(/\s+/g, " ")
      // Remove spaces at the start and end
      .trim()
      // Limit filename length to 100 characters
      .substring(0, 100)
  );
}

if (titleInput) {
  // const isoNow = new Date().toISOString().split("T")[0];
  // titleInput.value = isoNow + " Untitled"; // default value
  document.title = titleInput.value;

  titleInput.addEventListener("input", () => {
    let sanitized = sanitizeTitle(titleInput.value);

    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 100);
    }

    if (sanitized !== titleInput.value) {
      titleInput.value = sanitized; // update input field if any changes
    }

    document.title = sanitized || "Untitled";
  });

  titleInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Move to next focusable element: assume editor textarea is first child of OverType container
      const editorArea = document.querySelector(
        "#editor textarea",
      ) as HTMLTextAreaElement | null;
      if (editorArea) {
        editorArea.focus();
        editorArea.setSelectionRange(0, 0);
      }
    }
  });
}

const loadButton = document.getElementById("loadButton");
const fileInput =
  document.querySelector<HTMLInputElement>('input[type="file"]');

if (loadButton && fileInput) {
  loadButton.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;

        // Set editor value with the file content
        editor.setValue(content);

        // Also set the title input based on filename (without extension)
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        const sanitized = sanitizeTitle(nameWithoutExt);
        titleInput!.value = sanitized || "Untitled";
        document.title = titleInput!.value;
      };

      reader.readAsText(file);
    }
  });
}

const saveBtn = document.getElementById("saveBtn");
if (saveBtn) {
  saveBtn.addEventListener("click", () => {
    saveHandler();
  });
}

const newButton = document.getElementById("newButton");
if (newButton) {
  newButton.addEventListener("click", () => {
    newHandler();
  });
}

window.addEventListener("keydown", function (e) {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey;

  if (!isCtrlOrCmd) return;

  switch (e.key.toLowerCase()) {
    case "o": // Ctrl/Cmd + O
      e.preventDefault();
      openHandler();
      break;

    case "s": // Ctrl/Cmd + S
      e.preventDefault();
      saveHandler();
      break;

    case "n": // Ctrl/Cmd + N
      e.preventDefault();
      newHandler();
      break;
  }
});

function openHandler() {
  // Trigger load button click to open file selector dialog
  const loadButton = document.getElementById("loadButton");
  if (loadButton) {
    loadButton.click();
  }
}

function saveHandler() {
  if (!editor) return;

  const content = editor.getValue();
  let filename = "Untitled.md";

  if (titleInput && titleInput.value.trim() !== "") {
    filename = sanitizeTitle(titleInput.value) + ".md";
  }

  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

function newHandler() {
  if (!editor) return;

  // Clear editor content
  editor.setValue("");

  // Reset title input and document title
  if (titleInput) {
    // Reset to today's date plus "Untitled"
    const isoNow = new Date().toISOString().split("T")[0];
    titleInput.value = isoNow + " Untitled";
  }
  document.title = titleInput?.value || "Untitled";
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadDocument(
  id: string,
): Promise<{ content: string; title: string } | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) {
        resolve({
          content: request.result.content,
          title: request.result.title,
        });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

window.addEventListener("load", async () => {
  const saved = await loadDocument("autosave");
  if (saved && editor) {
    editor.setValue(saved.content);
    if (titleInput) {
      titleInput.value = saved.title;
      document.title = saved.title;
    }
  } else {
    // No saved autosave found - set default title
    if (titleInput) {
      const isoNow = new Date().toISOString().split("T")[0];
      titleInput.value = isoNow + " Untitled";
      document.title = titleInput.value;
    }
  }
});
