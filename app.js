(function () {
  const input = document.getElementById('editor');
  const preview = document.getElementById('preview');

  if (!input || !preview) return;
  if (typeof marked === 'undefined') {
    preview.textContent = 'marked.js failed to load.';
    return;
  }

  marked.setOptions({ gfm: true, breaks: false });

  let timer = null;
  function render() {
    preview.innerHTML = marked.parse(input.value);
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(render, 100);
  });

  render();
})();
