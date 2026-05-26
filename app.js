(function () {
  const STORAGE_KEY = 'md-editor-draft';
  const SAVE_DEBOUNCE_MS = 500;
  const RENDER_DEBOUNCE_MS = 100;

  const input = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const clearBtn = document.getElementById('clear-btn');

  if (!input || !preview) return;
  if (typeof marked === 'undefined') {
    preview.textContent = 'marked.js failed to load.';
    return;
  }

  marked.setOptions({ gfm: true, breaks: false });

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved !== null) {
    input.value = saved;
  }

  let renderTimer = null;
  let saveTimer = null;

  function render() {
    preview.innerHTML = marked.parse(input.value);
  }

  input.addEventListener('input', () => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, RENDER_DEBOUNCE_MS);

    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, input.value);
      saveTimer = null;
    }, SAVE_DEBOUNCE_MS);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (saveTimer !== null) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      clearTimeout(renderTimer);
      input.value = '';
      localStorage.removeItem(STORAGE_KEY);
      render();
      input.focus();
    });
  }

  render();
})();
