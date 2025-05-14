// 必要な関数や変数をインポート
import { state } from './state.js';
import { saveAvailableTags, loadAllPhrases } from './db.js';

// ---------------- タグ CRUD ----------------
// タグを追加する関数
export function addTag() {
    const tagInput = document.getElementById("tagInput");
    const tag = tagInput.value.trim();
    if (tag && !state.availableTags.includes(tag)) {
        state.availableTags.push(tag);
        tagInput.value = "";
        renderTagList();
        saveAvailableTags(); // タグ追加時に保存
    }
}

// タグを選択または解除する関数
export function toggleTag(tag) {
    const index = state.selectedTags.indexOf(tag);
    if (index > -1) {
        state.selectedTags.splice(index, 1);
    } else {
        state.selectedTags.push(tag);
    }
    renderTagList();
}

// 1) 件数を数える
function countPhrasesWithTag(tag) {
  return new Promise(resolve => {
    const tx    = state.db.transaction('phrases', 'readonly');
    const store = tx.objectStore('phrases');
    store.getAll().onsuccess = e => {
      const count = e.target.result.filter(p => (p.tags ?? []).includes(tag)).length;
      resolve(count);
    };
  });
}

// 2) 全フレーズからタグを外す
function deleteTagGlobally(tag) {
  return new Promise((resolve, reject) => {
    const tx    = state.db.transaction('phrases', 'readwrite');
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
    tx.onerror    = () => reject(tx.error);
  });
}

// 3) エントリーポイント
export async function removeTag(tag) {
  const count = await countPhrasesWithTag(tag);

  const ok = window.confirm(
    `このタグを削除すると、関連する ${count} 件のフレーズからタグが削除されます。\n本当に削除しますか？`
  );
  if (!ok) return;

  try {
    await deleteTagGlobally(tag);

    // タグリストから削除
    state.availableTags = state.availableTags.filter(t => t !== tag);

    // ★ 追加: UI の一時状態もクリア
    state.selectedTags   = state.selectedTags.filter(t => t !== tag);
    if (state.activeTagFilter === tag) {
    state.activeTagFilter = null;
    }

    saveAvailableTags();
    renderTagList();
    loadAllPhrases();

  } catch (err) {
    alert('削除に失敗しました。もう一度お試しください。');
    console.error(err);
  }
}

// -------------- タグフィルター --------------
// タグフィルターを切り替える関数
export function toggleTagFilter(tag) {
    state.activeTagFilter = (state.activeTagFilter === tag) ? null : tag;
    loadAllPhrases();
}
  
// タグフィルターをリストから切り替える関数
export function toggleTagFilterFromList(tag) {
    toggleTagFilter(tag);
}

// -------------- ビュー更新 --------------
// タグリストを描画する関数
export function renderTagList() {
    const container = document.getElementById("tagList");
    if (!container) return;
    container.innerHTML = "";
    state.availableTags.forEach(tag => {
        // メインボタン
        const isSelected = state.selectedTags.includes(tag);
        const tagButton = document.createElement("button");
        tagButton.textContent = `#${tag}`;
        tagButton.classList.add('tagButton');
        tagButton.classList.toggle('selected', isSelected);
        tagButton.onclick = () => toggleTag(tag);
    
        // 削除ボタン
        const removeButton = document.createElement("button");
        removeButton.textContent = "❌";
        removeButton.classList.add('remove-button');
        removeButton.onclick = () => removeTag(tag);
    
        container.appendChild(tagButton);
        container.appendChild(removeButton);
    });
}

// phrases.js から呼ばれ、フォーム側のタグボタンを最新状態に合わせて更新する
export function updateTagButtons() {
    renderTagList();
}