(function () {
  const el = document.getElementById('clock');
  if (!el) return;

  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    const now = new Date();
    el.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  };

  tick();
  setInterval(tick, 1000);
})();
