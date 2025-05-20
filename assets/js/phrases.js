// 必要な関数や変数をインポート
import { state } from './state.js';
import { showScreen, showVideo, parseTimeToSeconds, extractVideoId } from './ui.js';
import { toggleTagFilterFromList, updateTagButtons } from './tags.js';
import { loadAllPhrases, deletePhrase } from './db.js';
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

    // ★ 検索ワード取得 ★
    const searchTerm = document.getElementById("searchInput").value.trim().toLowerCase();

    let filtered;
  
    // 選択されているフィルター条件に応じてフレーズを絞り込む
    if (filter === "current") { // 「この動画のみ」でフィルター
        filtered = allPhrases.filter(p => p.videoId === state.currentVideoId);
    } else if (filter === "favorite") { // 「お気に入りのみ」でフィルター
        filtered = allPhrases.filter(p => p.favorite);
    } else { // 「すべてのフレーズ」でフィルター
        filtered = allPhrases;
    }
  
    // タグフィルターが設定されていれば、さらにタグ（インデックス）で絞り込む
    if (state.activeTagFilter !== null) {
        filtered = filtered.filter(p =>
            p.tags?.includes(state.activeTagFilter)
        );
    }

    // ★ 検索フィルター（大文字小文字を無視） ★
    if (searchTerm) {
        filtered = filtered.filter(p =>
            p.text.toLowerCase().includes(searchTerm) ||
            // 時間コードも検索対象にしたいなら以下も加える
            // (`${Math.floor(p.time/60)}:${(p.time%60).toString().padStart(2,'0')}`)
            //   .includes(searchTerm)
            false
        );
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
            (p.tags || []).forEach(idx => {
                const tagButton = document.createElement("button");
                const tagName = state.availableTags[idx];
                tagButton.textContent = `#${tagName}`;
                tagButton.classList.add('tagButton');
                if (state.activeTagFilter === idx) {
                  tagButton.classList.add('active');
                }
                tagButton.onclick = (e) => {
                    e.stopPropagation();
                    toggleTagFilterFromList(idx);
                };
                tagGroup.appendChild(tagButton);
            });
        }
    
        phraseText.textContent = `[${timeFormatted}] ${p.text}`;
        phraseText.classList.add('phrase_text');
        phraseText.onclick = () => {
            

            // YouTube 再生
            const iframe = document.getElementById("youtubePlayer");
            if (iframe) {
                iframe.src = `https://www.youtube.com/embed/${p.videoId}?start=${p.time}&autoplay=1`;
            }
        };
    
        const buttonGroup = document.createElement("div");
        buttonGroup.className = "button-group";
    
        const editBtn = document.createElement("button");
        editBtn.innerHTML = '<img src="assets/img/edit_list.svg" alt="Edit">';
        editBtn.onclick = () => {
            document.getElementById("startTime").value = `${Math.floor(p.time/60)}:${(p.time%60).toString().padStart(2,'0')}`;
            document.getElementById("phrase").value = p.text;
            document.getElementById("youtubeUrl").value = `https://www.youtube.com/watch?v=${p.videoId}`;
            showVideo(p.videoId);
            state.currentVideoId = p.videoId; 
            state.editingId = p.id;
            state.selectedTags = [...(p.tags || [])];
            updateTagButtons();
            document.getElementById("saveButton").innerHTML = '<img src="assets/img/save.svg" alt>Update Phrase';
            showScreen('form');
        };
    
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = '<img src="assets/img/bin.svg" alt="Delete">';
        deleteBtn.onclick = () => deletePhrase(p.id);
        buttonGroup.appendChild(deleteBtn);

        const favoriteBtn = document.createElement("button");
        favoriteBtn.innerHTML = p.favorite ? '<img src="assets/img/bookmark_on.svg" alt="Favorite">' : '<img src="assets/img/bookmark_off.svg" alt="Favorite">';
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
    document.getElementById("saveButton").innerHTML = '<img src="assets/img/save.svg" alt>Save Phrase';
    state.editingId = null;
    state.selectedTags = [];
    updateTagButtons();
}

// フレーズ＋タグ 両方をエクスポート
export async function exportPhrases() {
  // 1) フレーズ取得
  const phrases = await new Promise((resolve, reject) => {
    const tx = state.db.transaction('phrases', 'readonly');
    const store = tx.objectStore('phrases');
    const req = store.getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });

  // 2) タグ取得
  const tags = await new Promise((resolve, reject) => {
    const tx = state.db.transaction('tags', 'readonly');
    const store = tx.objectStore('tags');
    const req = store.get('all');
    req.onsuccess = e => resolve(e.target.result?.tags || []);
    req.onerror = () => reject(req.error);
  });

  // 3) JSON 化してダウンロード
  const data = { phrases, tags };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `data_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// フレーズ＋タグ 両方をインポート
export async function importPhrases(e) {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
    // { phrases: [...], tags: [...] } の形を期待
    if (
      typeof data !== 'object' ||
      !Array.isArray(data.phrases) ||
      !Array.isArray(data.tags)
    ) throw new Error();
  } catch {
    alert('ファイル形式が不正です');
    return;
  }

  // 1) タグをインポート
  state.availableTags = data.tags;
  const txTag = state.db.transaction('tags', 'readwrite');
  txTag.objectStore('tags').put({ id: 'all', tags: data.tags });
  txTag.oncomplete = () => updateAllTagLists();

  // 2) フレーズをインポート
  const tx    = state.db.transaction('phrases', 'readwrite');
  const store = tx.objectStore('phrases');
  data.phrases.forEach(p => store.put(p));
  tx.oncomplete = () => {
    loadAllPhrases();
    alert('インポートが完了しました');
  };
  tx.onerror = () => alert('インポートに失敗しました');
}
