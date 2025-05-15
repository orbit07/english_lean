// 必要な関数や変数をインポート
import { state } from './state.js';
import { showScreen, showVideo, parseTimeToSeconds, extractVideoId } from './ui.js';
import { renderTagList, toggleTagFilterFromList, updateTagButtons } from './tags.js';
import { loadAllPhrases } from './db.js';
import { showToast } from './toast.js';

// フレーズを保存する関数
export function savePhrase() {
    const url = document.getElementById("youtubeUrl").value.trim();
    const text = document.getElementById("phrase").value.trim();
    const rawTime = document.getElementById("startTime").value.trim();
    
    const videoId = extractVideoId(url);
    const time = parseTimeToSeconds(rawTime);

    if (!videoId || !text) {
      showToast('URL またはフレーズが未入力です', true);
      return;
    }
    if (!state.editingId) {
      state.currentVideoId = videoId;
    }

    if (videoId && !isNaN(time) && text) {
        const entry = {
          videoId,
          time,
          text: text,
          tags: [...state.selectedTags], // タグを保存
          favorite: false
        };
        console.log('▶️ before save', JSON.stringify(entry));   // ← ★ここ

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
            const req   = state.editingId !== null ? store.put(entry) : store.add(entry);
            req.onsuccess = () => {
              showToast(state.editingId ? '更新しました' : '保存しました');
              resetFormToNewEntry();            // フォームをクリア
              loadAllPhrases();                 // 一覧を再描画
            };
            req.onerror = () => console.error('フレーズの保存に失敗しました');
            tx.oncomplete = () => {
                resetFormToNewEntry();
                showVideo(videoId);
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
    container.innerHTML = "";
    phrases.forEach((p) => {
        const div = document.createElement("div");
        div.className = "phrase-item";
        const tagGroup = document.createElement("div");
        tagGroup.className = "tag-group";
        const minutes = Math.floor(p.time / 60);
        const seconds = p.time % 60;
        const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
        const phraseText = document.createElement("span");
    
        if (p.tags && p.tags.length > 0) {
            p.tags.forEach(tag => {
                const tagButton = document.createElement("button");
                tagButton.textContent = `#${tag}`;
                tagButton.classList.add('tagButton');
                if (state.activeTagFilter === tag) {
                  tagButton.classList.add('active');
                }
                tagButton.onclick = (e) => {
                    e.stopPropagation();
                    toggleTagFilterFromList(tag);
                };
                tagGroup.appendChild(tagButton);
            });
        }
    
        phraseText.textContent = `▶️ [${timeFormatted}] ${p.text}`;
        phraseText.classList.add('phrase_text');
        phraseText.onclick = () => {
            showScreen('list');
            showVideo(p.videoId);
            state.currentVideoId = p.videoId;
            loadAllPhrases();
            const iframe = document.getElementById("youtubePlayer");
            if (iframe) {
                iframe.src = `https://www.youtube.com/embed/${p.videoId}?start=${p.time}&autoplay=1`;
            }
        };
    
        const buttonGroup = document.createElement("div");
        buttonGroup.className = "button-group";
    
        const editBtn = document.createElement("button");
        editBtn.innerHTML = '<img src="assets/img/edit_blue.svg" alt="Edit">';
        editBtn.onclick = () => {
            document.getElementById("startTime").value = `${Math.floor(p.time/60)}:${(p.time%60).toString().padStart(2,'0')}`;
            document.getElementById("phrase").value = p.text;
            document.getElementById("youtubeUrl").value = `https://www.youtube.com/watch?v=${p.videoId}`;
            showVideo(p.videoId);
            state.currentVideoId = p.videoId; 
            state.editingId = p.id;
            state.selectedTags = [...(p.tags || [])];
            updateTagButtons();
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
    updateTagButtons();
}

// インポート・エクスポート
export async function exportPhrases() {
  const tx    = state.db.transaction('phrases', 'readonly');
  const store = tx.objectStore('phrases');

  // ★ Promise 化
  const all = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = () => reject(req.error);
  });

  const json  = JSON.stringify(all, null, 2);
  const blob  = new Blob([json], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `phrases_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importPhrases(e) {
  const file = e.target.files[0];
  if (!file) return;

  // 読み込み
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error();
  } catch {
    alert('ファイル形式が不正です');
    return;
  }

  // IndexedDB へ書き込み
  const tx    = state.db.transaction('phrases', 'readwrite');
  const store = tx.objectStore('phrases');
  for (const p of data) store.put(p);

  tx.oncomplete = () => {
    loadAllPhrases();
    alert('インポートが完了しました');
  };
  tx.onerror = () => alert('インポートに失敗しました');
};
