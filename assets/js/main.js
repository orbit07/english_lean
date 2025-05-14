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
  document.getElementById('importInput').addEventListener('change', () => importPhrases(e));

  const filterSelect = document.getElementById('filterSelect');
  filterSelect.addEventListener('change', () => loadAllPhrases());
  if (filterSelect) {
    filterSelect.value = "all";
  }
};