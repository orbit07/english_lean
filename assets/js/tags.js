// 必要な関数や変数をインポート
import { state } from './state.js';
import { saveAvailableTags, loadAllPhrases } from './db.js';

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

// タグの選択状態を切り替える関数
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

// タグフィルターを切り替える関数
export function toggleTagFilter(tag) {
    state.activeTagFilter = (state.activeTagFilter === tag) ? null : tag;
    loadAllPhrases();
}
  
// タグフィルターをリストから切り替える関数
export function toggleTagFilterFromList(tag) {
    state.activeTagFilter = (state.activeTagFilter === tag) ? null : tag;
    loadAllPhrases();
}

// タグリストを描画する関数
export function renderTagList() {
    const container = document.getElementById("tagList");
    container.innerHTML = "";
    state.availableTags.forEach(tag => {
        const tagButton = document.createElement("button");
        tagButton.textContent = tag;
        tagButton.style.margin = "0.2em";
        tagButton.style.backgroundColor = state.selectedTags.includes(tag) ? "#4b6cb7" : "#f0f4fc";
        tagButton.style.color = state.selectedTags.includes(tag) ? "white" : "#333";
        tagButton.onclick = () => toggleTag(tag);
    
        const removeButton = document.createElement("button");
        removeButton.textContent = "❌";
        removeButton.style.margin = "0.2em";
        removeButton.onclick = () => removeTag(tag);
    
        container.appendChild(tagButton);
        container.appendChild(removeButton);
    });
}