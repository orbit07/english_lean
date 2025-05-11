export function showToast(message, isError = false, duration = 3000) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = `toast ${isError ? 'error' : ''}`;
  document.body.appendChild(toast);

  // CSS アニメーション用に次フレームで active クラス付与
  requestAnimationFrame(() => toast.classList.add('active'));

  setTimeout(() => {
    toast.classList.remove('active');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);
}