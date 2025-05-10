import { availableTags, selectedTags, activeTagFilter } from './state.js';
import { saveAvailableTags } from './db.js';
import { loadAllPhrases } from './db.js';
import { renderTagList } from './tags.js';

// タグを追加する関数
export function addTag() {
    const tagInput = document.getElementById("tagInput");
    const tag = tagInput.value.trim();
    if (tag && !availableTags.includes(tag)) {
        availableTags.push(tag);
        tagInput.value = "";
        renderTagList();
        saveAvailableTags(); // タグ追加時に保存
    }
}

// タグの選択状態を切り替える関数
export function toggleTag(tag) {
    const index = selectedTags.indexOf(tag);
    if (index > -1) {
        selectedTags.splice(index, 1);
    } else {
        selectedTags.push(tag);
    }
    renderTagList();
}

// タグを削除する関数
export function removeTag(tag) {
    availableTags = availableTags.filter(t => t !== tag);
    selectedTags = selectedTags.filter(t => t !== tag);
    if (activeTagFilter === tag) {
        activeTagFilter = null;
    }
    renderTagList();
    saveAvailableTags(); // タグ削除時に保存
    loadAllPhrases();
}

// タグフィルターを切り替える関数
export function toggleTagFilter(tag) {
    activeTagFilter = (activeTagFilter === tag) ? null : tag;
    loadAllPhrases();
}

// タグフィルターをリストから切り替える関数
export function toggleTagFilterFromList(tag) {
    activeTagFilter = (activeTagFilter === tag) ? null : tag;
    loadAllPhrases();
}

// タグリストを描画する関数
export function renderTagList() {
    const container = document.getElementById("tagList");
    container.innerHTML = "";
    availableTags.forEach(tag => {
        const tagButton = document.createElement("button");
        tagButton.textContent = tag;
        tagButton.style.margin = "0.2em";
        tagButton.style.backgroundColor = selectedTags.includes(tag) ? "#4b6cb7" : "#f0f4fc";
        tagButton.style.color = selectedTags.includes(tag) ? "white" : "#333";
        tagButton.onclick = () => toggleTag(tag);
    
        const removeButton = document.createElement("button");
        removeButton.textContent = "❌";
        removeButton.style.margin = "0.2em";
        removeButton.onclick = () => removeTag(tag);
    
        container.appendChild(tagButton);
        container.appendChild(removeButton);
    });
}