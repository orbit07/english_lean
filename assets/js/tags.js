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

// タグを削除する関数
export function removeTag(tag) {
    state.availableTags = state.availableTags.filter(t => t !== tag);
    state.selectedTags = state.selectedTags.filter(t => t !== tag);
    if (state.activeTagFilter === tag) {
        state.activeTagFilter = null;
    }
    renderTagList();
    saveAvailableTags(); // タグ削除時に保存
    loadAllPhrases();
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
        const tagButton = document.createElement("button");
        tagButton.textContent = tag;
        tagButton.classList.add('tag-button');
        tagButton.style.backgroundColor = state.selectedTags.includes(tag) ? "#4b6cb7" : "#f0f4fc";
        tagButton.style.color = state.selectedTags.includes(tag) ? "white" : "#333";
        tagButton.onclick = () => toggleTag(tag);
    
        // 削除ボタン
        const removeButton = document.createElement("button");
        removeButton.textContent = "❌";
        removeButton.style.margin = "0.2em";
        removeButton.onclick = () => removeTag(tag);
    
        container.appendChild(tagButton);
        container.appendChild(removeButton);
    });
}

// phrases.js から呼ばれ、フォーム側のタグボタンを最新状態に合わせて更新する
export function updateTagButtons() {
    renderTagList();
}