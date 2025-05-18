// tags.js — タグ管理モジュール（タグは index で管理）
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
    // 編集モード: タグ名を更新（インデックスは変えない）
    const idx = editingTagIndex;
    const oldTag = state.availableTags[idx];
    if (oldTag === newTag) {
      // 変更なし
      resetEditMode();
      return;
    }
    // 関連フレーズ件数確認
    const count = await countPhrasesWithTag(idx);
    const ok = window.confirm(
      `このタグを編集すると、関連する ${count} 件のフレーズのタグが変更されます。\n本当に編集しますか？`
    );
    if (!ok) return;

    // タグ名更新（フレーズ内は index なので変更不要）
    state.availableTags[idx] = newTag;
    if (state.activeTagFilter === idx) state.activeTagFilter = idx;

    resetEditMode();
  } else {
    // 新規追加
    if (state.availableTags.includes(newTag)) return;
    state.availableTags.push(newTag);
  }

  input.value = '';
  updateAllTagLists();
  saveAvailableTags();
}

export function toggleTag(index) {
  const sel = state.selectedTags;
  const pos = sel.indexOf(index);
  if (pos > -1) sel.splice(pos,1);
  else           sel.push(index);
  updateAllTagLists();
}

// --------------------------------------------------
// 件数確認 & 一括削除ヘルパ
// --------------------------------------------------

function countPhrasesWithTag(tagIdx) {
  return new Promise(resolve => {
    const tx = state.db.transaction('phrases','readonly');
    const store = tx.objectStore('phrases');
    store.getAll().onsuccess = e => {
      const cnt = e.target.result.filter(p=>p.tags?.includes(tagIdx)).length;
      resolve(cnt);
    };
  });
}

function deleteTagGlobally(tagIdx) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction('phrases','readwrite');
    const store = tx.objectStore('phrases');
    store.getAll().onsuccess = e => {
      e.target.result.forEach(p => {
        if (!p.tags) return;
        // 削除対象と一致するタグを外し、index を詰める
        p.tags = p.tags
          .filter(idx => idx !== tagIdx)
          .map(idx => idx > tagIdx ? idx-1 : idx);
        store.put(p);
      });
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeTag(tagIdx) {
  const count = await countPhrasesWithTag(tagIdx);
  const ok = window.confirm(
    `このタグを削除すると、関連する ${count} 件のフレーズからタグが削除されます。\n本当に削除しますか？`
  );
  if (!ok) return;

  try {
    await deleteTagGlobally(tagIdx);
    // availableTags, selectedTags, activeTagFilter を更新
    state.availableTags.splice(tagIdx,1);
    state.selectedTags = state.selectedTags
      .filter(idx=>idx!==tagIdx)
      .map(idx=> idx>tagIdx ? idx-1 : idx);
    if (state.activeTagFilter === tagIdx) state.activeTagFilter = null;

    saveAvailableTags();
    updateAllTagLists();
    loadAllPhrases();
  } catch(err) {
    alert('削除に失敗しました。もう一度お試しください。');
    console.error(err);
  }
}

// --------------------------------------------------
// タグフィルター
// --------------------------------------------------

export function toggleTagFilter(tagIdx) {
  state.activeTagFilter = state.activeTagFilter === tagIdx ? null : tagIdx;
  loadAllPhrases();
  updateAllTagLists();
}
export function toggleTagFilterFromList(tagIdx) { toggleTagFilter(tagIdx); }

// --------------------------------------------------
// ビュー更新 — フォーム用
// --------------------------------------------------

export function renderTagList() {
  const container = document.getElementById('tagList');
  if (!container) return;
  container.innerHTML = state.availableTags.map((tag,i)=>{
    const sel = state.selectedTags.includes(i) ? ' selected' : '';
    return `
      <li class="tagButton-wrapper">
        <button class="tagButton-screen${sel}" data-index="${i}">#${tag}</button>
        <button type="button" class="edit-tag-button" data-index="${i}"><img src="assets/img/edit_tag.svg" alt="Edit"></button>
        <button type="button" class="remove-button" data-index="${i}"><img src="assets/img/delete.svg" alt="Delete"></button>
      </li>`;
  }).join('');

  container.onclick = e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = parseInt(btn.dataset.index,10);
    if (btn.classList.contains('tagButton-screen')) toggleTag(idx);
    else if (btn.classList.contains('remove-button')) removeTag(idx);
    else if (btn.classList.contains('edit-tag-button')) startEditTag(idx);
  };
}

function startEditTag(index) {
  const input = document.getElementById('tagInput');
  input.value = state.availableTags[index];
  document.getElementById('addTagButton').innerHTML = '<img src="assets/img/edit_tag.svg" alt="Edit">Edit';
  editingTagIndex = index;
}

// phrases.js から呼び出し
export function updateTagButtons() { updateAllTagLists(); }

// --------------------------------------------------
// ビュー更新 — ヘッダー用
// --------------------------------------------------

export function renderHeaderTagList() {
  const container = document.getElementById('headerTagList');
  if (!container) return;
  container.innerHTML = state.availableTags.map((tag,i)=>{
    const act = (state.activeTagFilter === i) ? ' active' : '';
    return `<button type="button" class="tagButton${act}" data-index="${i}">#${tag}</button>`;
  }).join('');
  container.onclick = e => {
    const btn = e.target.closest('button.tagButton');
    if(!btn) return;
    toggleTagFilterFromList(parseInt(btn.dataset.index,10));
  };
}

// フォーム／ヘッダー 両方更新
export function updateAllTagLists() {
  renderTagList();
  renderHeaderTagList();
}

function resetEditMode() {
  editingTagIndex = null;
  document.getElementById('addTagButton').textContent = 'Add';
  document.getElementById('tagInput').value = '';
}
