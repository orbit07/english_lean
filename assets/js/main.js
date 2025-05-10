import { showScreen } from './ui.js';
import { openDB } from './db.js';
import { activeTagFilter } from './state.js';

// ページ読み込み時に初期化処理を実行
window.onload = () => {
  showScreen('list');
  openDB();
  const filterSelect = document.getElementById("filterSelect");
  if (filterSelect) {
    filterSelect.value = "all";
  }
};