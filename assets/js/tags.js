// tags.js — タグ管理モジュール
// 必要な関数や変数をインポート
import { state } from './state.js';
import { saveAvailableTags, loadAllPhrases } from './db.js';

// --------------------------------------------------
// タグ CRUD
// --------------------------------------------------

// タグを追加する関数
export function addTag() {
  const tagInput = document.getElementById('tagInput');
  const tag = tagInput.value.trim();
  if (tag && !state.availableTags.includes(tag)) {
    state.availableTags.push(tag);
    tagInput.value = '';
    renderTagList();
    saveAvailableTags();
  }
}

// タグを選択 / 解除する関数
export function toggleTag(tag) {
  const idx = state.selectedTags.indexOf(tag);
  if (idx > -1) {
    state.selectedTags.splice(idx, 1);
  } else {
    state.selectedTags.push(tag);
  }
  renderTagList();
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
    renderTagList();
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

  // 1) HTML を生成
  container.innerHTML = state.availableTags.map(tag => {
    const isSel = state.selectedTags.includes(tag) ? ' selected' : '';
    return `
      <li class="tagButton-wrapper${isSel}">
        <button class="tagButton-screen" data-tag="${tag}">#${tag}</button>
        <button class="remove-button" data-tag="${tag}">❌</button>
      </li>`;
  }).join('');

  // 2) クリック処理 — イベント委任
  container.onclick = e => {
    const target = e.target;
    if (target.matches('.tagButton')) {
      toggleTag(target.dataset.tag);
    } else if (target.matches('.remove-button')) {
      removeTag(target.dataset.tag);
    }
  };
}

// phrases.js から呼び出されるヘルパ
export function updateTagButtons() {
  renderTagList();
}
