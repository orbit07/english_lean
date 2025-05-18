// tags.js — タグ管理モジュール
// 必要な関数や変数をインポート
import { state } from './state.js';
import { saveAvailableTags, loadAllPhrases } from './db.js';

// 編集対象タグのインデックス
let editingTagIndex = null;

// --------------------------------------------------
// タグ CRUD
// --------------------------------------------------

export async function addTag() {
  const input = document.getElementById('tagInput');
  const newTag = input.value.trim();
  if (!newTag) return;

  if (editingTagIndex !== null) {
    // 編集モード: 既存タグの名称変更
    const oldTag = state.availableTags[editingTagIndex];
    if (oldTag === newTag) {
      // 変更なし
      editingTagIndex = null;
      document.getElementById('addTagButton').textContent = 'Add';
      input.value = '';
      return;
    }
    // 件数を確認
    const count = await countPhrasesWithTag(oldTag);
    const ok = window.confirm(
      `このタグを編集すると、関連する ${count} 件のフレーズのタグが変更されます。\n本当に編集しますか？`
    );
    if (!ok) return;

    // DB 内のタグを一括変更
    await renameTagGlobally(oldTag, newTag);

    // availableTags と selectedTags を更新
    state.availableTags[editingTagIndex] = newTag;
    state.selectedTags = state.selectedTags.map(t => t === oldTag ? newTag : t);
    if (state.activeTagFilter === oldTag) state.activeTagFilter = newTag;

    editingTagIndex = null;
    document.getElementById('addTagButton').innerHTML = '<img src="assets/img/add.svg" alt="">Add';
  } else {
    // 新規追加
    if (state.availableTags.includes(newTag)) return;
    state.availableTags.push(newTag);
  }
  input.value = '';
  updateAllTagLists();
  saveAvailableTags();
}

export function toggleTag(tag) {
  const idx = state.selectedTags.indexOf(tag);
  if (idx > -1) state.selectedTags.splice(idx, 1);
  else           state.selectedTags.push(tag);
  updateAllTagLists();
}

// --------------------------------------------------
// 件数確認・タグ操作ヘルパ
// --------------------------------------------------

function countPhrasesWithTag(tag) {
  return new Promise(resolve => {
    const tx = state.db.transaction('phrases', 'readonly');
    const store = tx.objectStore('phrases');
    store.getAll().onsuccess = e => {
      const cnt = e.target.result.filter(p => p.tags?.includes(tag)).length;
      resolve(cnt);
    };
  });
}

function renameTagGlobally(oldTag, newTag) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction('phrases', 'readwrite');
    const store = tx.objectStore('phrases');
    store.getAll().onsuccess = e => {
      e.target.result.forEach(p => {
        if (p.tags?.includes(oldTag)) {
          p.tags = p.tags.map(t => t === oldTag ? newTag : t);
          store.put(p);
        }
      });
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// --------------------------------------------------
// タグ削除・一括削除
// --------------------------------------------------

async function removeTag(tag) {
  const count = await countPhrasesWithTag(tag);
  const ok = window.confirm(
    `このタグを削除すると、関連する ${count} 件のフレーズからタグが削除されます。\n本当に削除しますか？`
  );
  if (!ok) return;

  try {
    await deleteTagGlobally(tag);
    state.availableTags = state.availableTags.filter(t => t !== tag);
    state.selectedTags = state.selectedTags.filter(t => t !== tag);
    if (state.activeTagFilter === tag) state.activeTagFilter = null;
    saveAvailableTags();
    updateAllTagLists();
    loadAllPhrases();
  } catch (err) {
    alert('削除に失敗しました。もう一度お試しください。');
    console.error(err);
  }
}
export { removeTag };

// --------------------------------------------------
// タグフィルター
// --------------------------------------------------

export function toggleTagFilter(tag) {
  state.activeTagFilter = state.activeTagFilter === tag ? null : tag;
  loadAllPhrases();
  updateAllTagLists();
}
export function toggleTagFilterFromList(tag) { toggleTagFilter(tag); }

// --------------------------------------------------
// ビュー更新 — フォーム用
// --------------------------------------------------

export function renderTagList() {
  const container = document.getElementById('tagList');
  if (!container) return;
  container.innerHTML = state.availableTags.map((tag,i) => {
    const isSel = state.selectedTags.includes(tag) ? ' selected' : '';
    return `
      <li class="tagButton-wrapper">
        <button class="tagButton-screen${isSel}" data-tag="${tag}">#${tag}</button>
        <button type="button" class="edit-tag-button" data-index="${i}"><img src="assets/img/edit_tag.svg" alt="Edit"></button>
        <button type="button" class="remove-button" data-tag="${tag}"><img src="assets/img/delete.svg" alt="Delete"></button>
      </li>`;
  }).join('');
  container.onclick = e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.classList.contains('tagButton-screen')) toggleTag(btn.dataset.tag);
    else if (btn.classList.contains('remove-button')) removeTag(btn.dataset.tag);
    else if (btn.classList.contains('edit-tag-button')) startEditTag(parseInt(btn.dataset.index,10));
  };
}

function startEditTag(index) {
  const tag = state.availableTags[index];
  document.getElementById('tagInput').value = tag;
  document.getElementById('addTagButton').innerHTML = '<img src="assets/img/edit.svg" alt="Edit">Edit';
  editingTagIndex = index;
}

// phrases.js から呼び出されるヘルパ
export function updateTagButtons() { updateAllTagLists(); }

// --------------------------------------------------
// ビュー更新 — ヘッダー用
// --------------------------------------------------

export function renderHeaderTagList() {
  const container = document.getElementById('headerTagList');
  if (!container) return;
  container.innerHTML = state.availableTags.map(tag => {
    const active = state.activeTagFilter === tag ? ' active' : '';
    return `<button type="button" class="tagButton${active}" data-tag="${tag}">#${tag}</button>`;
  }).join('');
  container.onclick = e => {
    const btn = e.target.closest('button.tagButton');
    if (!btn) return; toggleTagFilterFromList(btn.dataset.tag);
  };
}

// フォーム／ヘッダー 両方を更新
export function updateAllTagLists() {
  renderTagList();
  renderHeaderTagList();
}
