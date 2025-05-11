import { showScreen } from './ui.js';
import { openDB } from './db.js';

// ページ読み込み時に初期化処理を実行
window.onload = () => {
  showScreen('list');
  openDB();
  document.getElementById('formButton').addEventListener('click', () => showScreen('form'));
  document.getElementById('listButton').addEventListener('click', () => showScreen('list'));
  const filterSelect = document.getElementById("filterSelect");
  if (filterSelect) {
    filterSelect.value = "all";
  }
};