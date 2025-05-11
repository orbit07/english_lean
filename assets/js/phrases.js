// 必要な関数や変数をインポート
import { state } from './state.js';
import { showScreen, showVideo, parseTimeToSeconds, extractVideoId } from './ui.js';
import { renderTagList, toggleTagFilterFromList } from './tags.js';
import { loadAllPhrases } from './db.js';
import { showToast } from './toast.js';

console.log('phrases.js state ID   :', state);

// フレーズを保存する関数
export function savePhrase() {
    const url = document.getElementById("youtubeUrl").value;
    const newVideoId = extractVideoId(url);
    const rawTime = document.getElementById("startTime").value.trim();
    const time = parseTimeToSeconds(rawTime);
    const text = document.getElementById("phrase").value.trim();

    if (newVideoId && !isNaN(time) && text) {
        const entry = {
            videoId: newVideoId,
            time,
            text,
            tags: [...state.selectedTags], // タグを保存
            favorite: false
        };

        if (state.editingId !== null) { // 編集時
            const tx = state.db.transaction("phrases", "readonly");
            tx.onerror = () => showToast('フレーズの取得に失敗しました', true);
            const store = tx.objectStore("phrases");
            const getRequest = store.get(state.editingId);
            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                entry.id = state.editingId;
                entry.favorite = existing ? existing.favorite : false;
                const tx2 = state.db.transaction("phrases", "readwrite");
                tx2.onerror = () => showToast('フレーズの保存に失敗しました', true);
                const store2 = tx2.objectStore("phrases");
                const req = store2.put(entry);
                req.onerror = () => console.error('フレーズの保存に失敗しました');
                tx2.oncomplete = () => {
                    resetFormToNewEntry();
                    loadAllPhrases();
                    showScreen('list');
                };
            };
            tx.onerror = () => console.error('フレーズの取得に失敗しました');
        } else { // 新規登録時
            const tx = state.db.transaction("phrases", "readwrite");
            tx.onerror = () => showToast('フレーズの保存に失敗しました', true);
            const store = tx.objectStore("phrases");
            const req = store.add(entry);
            req.onerror = () => console.error('フレーズの保存に失敗しました');
            tx.oncomplete = () => {
                resetFormToNewEntry();
                showVideo(newVideoId);
                loadAllPhrases();
                showScreen('list');
            };
        }
    }
}

// フレーズにフィルターを適用する関数
export function applyFilter(allPhrases) {
    const filterSelectElement = document.getElementById("filterSelect");
    const filter = filterSelectElement ? filterSelectElement.value : "all";
    let filtered;
  
    // 選択されているフィルター条件に応じてフレーズを絞り込む
    if (filter === "current") { // 「この動画のみ」でフィルター
        filtered = allPhrases.filter(p => p.videoId === state.currentVideoId);
    } else if (filter === "favorite") { // 「お気に入りのみ」でフィルター
        filtered = allPhrases.filter(p => p.favorite);
    } else { // 「すべてのフレーズ」でフィルター
        filtered = allPhrases;
    }
  
    // タグフィルターが設定されていれば、さらにタグで絞り込む
    if (state.activeTagFilter) {
        filtered = filtered.filter(p => p.tags && p.tags.includes(state.activeTagFilter));
    }
  
    renderPhraseList(filtered);
}

export function renderPhraseList(phrases) {
    const container = document.getElementById("phraseList");
    const tagGroup = document.createElement("div");
    container.innerHTML = "";
    phrases.forEach((p) => {
        const div = document.createElement("div");
        div.className = "phrase-item";
        const minutes = Math.floor(p.time / 60);
        const seconds = p.time % 60;
        const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
        const phraseText = document.createElement("span");
    
        tagGroup.className = "tag-group";
    
        if (p.tags && p.tags.length > 0) {
            p.tags.forEach(tag => {
                const tagBtn = document.createElement("button");
                tagBtn.textContent = `#${tag}`;
                tagBtn.style.margin = "0 0.2em";
                if (state.activeTagFilter === tag) {
                    tagBtn.classList.add("active-tag-filter");
                }
                tagBtn.onclick = (e) => {
                    e.stopPropagation();
                    toggleTagFilterFromList(tag);
                };
                tagGroup.appendChild(tagBtn);
            });
        }
    
        phraseText.textContent = `▶️ [${timeFormatted}] ${p.text}`;
        phraseText.style.cursor = "pointer";
        phraseText.onclick = () => {
            showScreen('list');
            showVideo(p.db);
            state.db = p.db;
            const iframe = document.getElementById("youtubePlayer");
            if (iframe) {
                iframe.src = `https://www.youtube.com/embed/${p.db}?start=${p.time}&autoplay=1`;
            }
        };
    
        const buttonGroup = document.createElement("div");
        buttonGroup.className = "button-group";
    
        const favoriteBtn = document.createElement("button");
        favoriteBtn.textContent = p.favorite ? "⭐️" : "☆";
        favoriteBtn.onclick = (e) => {
            e.stopPropagation();
            p.favorite = !p.favorite;
            const tx = state.db.transaction("phrases", "readwrite");
            tx.onerror = () => showToast('お気に入りの更新に失敗しました', true);
            const store = tx.objectStore("phrases");
            const req = store.put(p);
            req.onerror = () => console.error('お気に入りの更新に失敗しました');
            tx.oncomplete = () => loadAllPhrases();
        };
    
        const editBtn = document.createElement("button");
        editBtn.textContent = "✏️ Edit";
        editBtn.onclick = () => {
            document.getElementById("startTime").value = `${Math.floor(p.time/60)}:${(p.time%60).toString().padStart(2,'0')}`;
            document.getElementById("phrase").value = p.text;
            document.getElementById("youtubeUrl").value = `https://www.youtube.com/watch?v=${p.db}`;
            state.db = p.db;
            state.editingId = p.id;
            state.selectedTags = [...(p.tags || [])];
            renderTagList();
            document.getElementById("saveButton").textContent = "Update Phrase";
            showScreen('form');
        };
    
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑️ Delete";
        deleteBtn.onclick = () => {
            const tx = state.db.transaction("phrases", "readwrite");
            tx.onerror = () => showToast('フレーズの削除に失敗しました', true);
            const store = tx.objectStore("phrases");
            const req = store.delete(p.id);
            req.onerror = () => console.error('フレーズの削除に失敗しました');
            tx.oncomplete = () => loadAllPhrases();
        };
    
        buttonGroup.appendChild(favoriteBtn);
        buttonGroup.appendChild(editBtn);
        buttonGroup.appendChild(deleteBtn);
    
        div.appendChild(phraseText);
        div.appendChild(tagGroup);
        div.appendChild(buttonGroup);
        container.appendChild(div);
    });
}

// フォームを新規入力状態にリセットする関数
export function resetFormToNewEntry() {
    document.getElementById("startTime").value = "";
    document.getElementById("phrase").value = "";
    document.getElementById("youtubeUrl").value = "";
    document.getElementById("saveButton").textContent = "Save Phrase";
    state.editingId = null;
    state.selectedTags = [];
    renderTagList();
}