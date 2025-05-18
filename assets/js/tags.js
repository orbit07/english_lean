// tags.js — タグ管理モジュール
// 必要な関数や変数をインポート
import { state } from './state.js';
import { saveAvailableTags, loadAllPhrases } from './db.js';

// 編集対象タグのインデックス
let editingTagIndex = null;

// --------------------------------------------------
// タグ CRUD
// --------------------------------------------------

export function addTag() {
  const input = document.getElementById('tagInput');
  const tag = input.value.trim();
  if (!tag) return;

  if (editingTagIndex !== null) {
    // 編集モード: 既存タグを更新
    state.availableTags[editingTagIndex] = tag;
    editingTagIndex = null;
    document.getElementById('addTagButton').textContent = 'Add';
  } else {
    // 新規追加
    if (state.availableTags.includes(tag)) return;
    state.availableTags.push(tag);
  }
  input.value = '';
  updateAllTagLists();
  saveAvailableTags();
}

// タグを選択 / 解除する関数
export function toggleTag(tag) {
  const idx = state.selectedTags.indexOf(tag);
  if (idx > -1) {
    state.selectedTags.splice(idx, 1);
  } else {
    state.selectedTags.push(tag);
  }
  updateAllTagLists();
}

// --------------------------------------------------
// タグ削除 — 件数確認 → 一括削除
// --------------------------------------------------

// 1) 件数を数える
function countPhrasesWithTag(tag) {
  return new Promise(resolve => {
    const tx = state.db.transaction('phrases', 'readonly');
    const store = tx.objectStore('phrases');
    store.getAll().onsuccess = e => {
      const cnt = e.target.result.filter(p => (p.tags ?? []).includes(tag)).length;
      resolve(cnt);
    };
  });
}

// 2) 全フレーズからタグを外す
function deleteTagGlobally(tag) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction('phrases', 'readwrite');
    const store = tx.objectStore('phrases');

    store.getAll().onsuccess = e => {
      e.target.result.forEach(p => {
        if ((p.tags ?? []).includes(tag)) {
          p.tags = p.tags.filter(t => t !== tag);
          store.put(p);
        }
      });
    };

    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// 3) エントリーポイント
export async function removeTag(tag) {
  const count = await countPhrasesWithTag(tag);
  const ok = window.confirm(`このタグを削除すると、関連する ${count} 件のフレーズからタグが削除されます。\n本当に削除しますか？`);
  if (!ok) return;

  try {
    await deleteTagGlobally(tag);

    // タグリストと内部状態を更新
    state.availableTags = state.availableTags.filter(t => t !== tag);
    state.selectedTags  = state.selectedTags.filter(t => t !== tag);
    if (state.activeTagFilter === tag) state.activeTagFilter = null;

    saveAvailableTags();
    updateAllTagLists();
    loadAllPhrases();
  } catch (err) {
    alert('削除に失敗しました。もう一度お試しください。');
    console.error(err);
  }
}

// --------------------------------------------------
// タグフィルター
// --------------------------------------------------

export function toggleTagFilter(tag) {
  state.activeTagFilter = state.activeTagFilter === tag ? null : tag;
  loadAllPhrases();
  updateAllTagLists();
}
export function toggleTagFilterFromList(tag) {
  toggleTagFilter(tag);
}

// --------------------------------------------------
// ビュー更新
// --------------------------------------------------

export function renderTagList() {
  const container = document.getElementById('tagList');
  if (!container) return;

  container.innerHTML = state.availableTags.map((tag, i) => {
    const isSel = state.selectedTags.includes(tag) ? ' selected' : '';
    return `
      <li class="tagButton-wrapper">
        <button class="tagButton-screen${isSel}" data-tag="${tag}">#${tag}</button>
        <button type="button" class="edit-tag-button" data-index="${i}"><img src="assets/img/edit.svg" alt="Edit"></button>
        <button type="button" class="remove-button" data-tag="${tag}"><img src="assets/img/delete.svg" alt="Delete"></button>
      </li>`;
  }).join('');

  container.onclick = e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.classList.contains('tagButton-screen')) {
      toggleTag(btn.dataset.tag);
    } else if (btn.classList.contains('remove-button')) {
      removeTag(btn.dataset.tag);
    } else if (btn.classList.contains('edit-tag-button')) {
      startEditTag(parseInt(btn.dataset.index, 10));
    }
  };
}

function startEditTag(index) {
  const tag = state.availableTags[index];
  document.getElementById('tagInput').value = tag;
  document.getElementById('addTagButton').textContent = 'Edit';
  editingTagIndex = index;
}

// phrases.js から呼び出されるヘルパ
export function updateTagButtons() {
  updateAllTagLists();
}

// --------------------------------------------------
// ヘッダー下のタグリストを描画
// --------------------------------------------------
export function renderHeaderTagList() {
  const container = document.getElementById('headerTagList');
  if (!container) return;
  container.innerHTML = state.availableTags.map(tag => {
    // state.activeTagFilter と同じタグなら 'active' を足す
    const activeClass = state.activeTagFilter === tag ? ' active' : '';
    return `<button type="button" class="tagButton${activeClass}" data-tag="${tag}">#${tag}</button>`;
  }).join('');
  
  // クリックイベントはイベント委任でまとめて
  container.onclick = e => {
    const btn = e.target.closest('button.tagButton');
    if (!btn) return;
    toggleTagFilterFromList(btn.dataset.tag);
  };
}

// フォーム／ヘッダー 両方を更新するヘルパ
export function updateAllTagLists() {
  // フォーム下のタグボタン群を再描画
  renderTagList();
  // ヘッダー下のタグボタン群を再描画
  renderHeaderTagList();
}