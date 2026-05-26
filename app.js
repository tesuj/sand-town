(() => {
  'use strict';

  const STORAGE_KEY = 'planner.tasks.v1';

  const form = document.getElementById('add-form');
  const input = document.getElementById('new-task');
  const list = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  const counter = document.getElementById('counter');
  const clearDoneBtn = document.getElementById('clear-done');

  /** @type {{id: string, text: string, done: boolean}[]} */
  let tasks = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // Quota exceeded or storage unavailable — silently ignore for demo app.
    }
  }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function render() {
    list.replaceChildren();

    for (const task of tasks) {
      const li = document.createElement('li');
      li.className = 'task' + (task.done ? ' done' : '');
      li.dataset.id = task.id;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.id = 'task-' + task.id;

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = task.text;

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'delete-btn';
      del.setAttribute('aria-label', 'Удалить задачу');
      del.textContent = '×';

      li.append(checkbox, label, del);
      list.append(li);
    }

    const hasTasks = tasks.length > 0;
    emptyState.hidden = hasTasks;

    const remaining = tasks.filter(t => !t.done).length;
    const doneCount = tasks.length - remaining;
    counter.textContent = hasTasks
      ? `Осталось: ${remaining} из ${tasks.length}`
      : '';
    clearDoneBtn.hidden = doneCount === 0;
  }

  function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    tasks.push({ id: makeId(), text: trimmed, done: false });
    save();
    render();
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.done = !task.done;
    save();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    save();
    render();
  }

  function clearDone() {
    tasks = tasks.filter(t => !t.done);
    save();
    render();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addTask(input.value);
    input.value = '';
    input.focus();
  });

  list.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const li = target.closest('.task');
    if (!li) return;
    const id = li.dataset.id;
    if (!id) return;

    if (target.matches('input[type="checkbox"]')) {
      toggleTask(id);
    } else if (target.matches('.delete-btn')) {
      deleteTask(id);
    }
  });

  clearDoneBtn.addEventListener('click', clearDone);

  render();
})();
