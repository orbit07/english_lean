import { openDB, loadAllPhrases } from './db.js';
import { showScreen } from './ui.js';
import { savePhrase, exportPhrases, importPhrases } from './phrases.js';
import { addTag } from './tags.js';

// ページ読み込み時に初期化処理を実行
window.onload = () => {
  showScreen('list');
  openDB();

  document.getElementById('formButton').addEventListener('click', () => showScreen('form'));
  document.getElementById('listButton').addEventListener('click', () => showScreen('list'));
  document.getElementById('addTagButton').addEventListener('click', () => addTag());
  document.getElementById('saveButton').addEventListener('click', () => savePhrase());
  document.getElementById('exportBtn').addEventListener('click', () => exportPhrases());
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importInput').click());
  document.getElementById('importInput').addEventListener('change', e => importPhrases(e));

  const filterSelect = document.getElementById('filterSelect');
  
  if (filterSelect) {
    filterSelect.value = "all";
    filterSelect.addEventListener('change', () => {
      loadAllPhrases();  // DB から全件を読み直して applyFilter() を再実行
    });
  }

  if (searchInput) {
    // 入力のたびに一覧を再描画
    searchInput.addEventListener('input', () => {
      loadAllPhrases();
    });
  }

};