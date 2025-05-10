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
            tags: [...selectedTags], // タグを保存
            favorite: false
        };
    
        if (editingId !== null) { // 編集時
            const tx = dbInstance.transaction("phrases", "readonly");
            const store = tx.objectStore("phrases");
            const getRequest = store.get(editingId);
            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                entry.id = editingId;
                entry.favorite = existing ? existing.favorite : false;
                const tx2 = dbInstance.transaction("phrases", "readwrite");
                const store2 = tx2.objectStore("phrases");
                store2.put(entry);
                tx2.oncomplete = () => {
                    resetFormToNewEntry();
                    loadAllPhrases();
                    showScreen('list');
                };
            };
        } else { // 新規登録時
            const tx = dbInstance.transaction("phrases", "readwrite");
            const store = tx.objectStore("phrases");
            store.add(entry);
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
  
    if (filter === "current") { // 「この動画のみ」でフィルター
        filtered = allPhrases.filter(p => p.videoId === videoId);
    } else if (filter === "favorite") { // 「お気に入りのみ」でフィルター
        filtered = allPhrases.filter(p => p.favorite);
    } else { // 「すべてのフレーズ」でフィルター
        filtered = allPhrases;
    }
  
    // タグフィルターが指定されている場合、さらに絞り込む
    if (activeTagFilter) {
        filtered = filtered.filter(p => p.tags && p.tags.includes(activeTagFilter));
    }
  
    renderPhraseList(filtered);
}

// フレーズリストを描画する関数
export function renderPhraseList(phrases) {
    const container = document.getElementById("phraseList");
    container.innerHTML = "";
    phrases.forEach((p) => {
        const div = document.createElement("div");
        div.className = "phrase-item";
        const minutes = Math.floor(p.time / 60);
        const seconds = p.time % 60;
        const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
        const phraseText = document.createElement("span");
    
        const tagGroup = document.createElement("div");
        tagGroup.className = "tag-group";
    
        if (p.tags && p.tags.length > 0) {
            p.tags.forEach(tag => {
                const tagBtn = document.createElement("button");
                tagBtn.textContent = `#${tag}`;
                tagBtn.style.margin = "0 0.2em";
                if (activeTagFilter === tag) {
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
            showVideo(p.videoId);
            videoId = p.videoId;
            const iframe = document.getElementById("youtubePlayer");
            if (iframe) {
            iframe.src = `https://www.youtube.com/embed/${p.videoId}?start=${p.time}&autoplay=1`;
            }
        };
    
        const buttonGroup = document.createElement("div");
        buttonGroup.className = "button-group";
    
        const favoriteBtn = document.createElement("button");
        favoriteBtn.textContent = p.favorite ? "⭐️" : "☆";
        favoriteBtn.onclick = (e) => {
            e.stopPropagation();
            p.favorite = !p.favorite;
            const tx = dbInstance.transaction("phrases", "readwrite");
            const store = tx.objectStore("phrases");
            store.put(p);
            tx.oncomplete = () => loadAllPhrases();
        };
    
        const editBtn = document.createElement("button");
        editBtn.textContent = "✏️ Edit";
        editBtn.onclick = () => {
            document.getElementById("startTime").value = p.time;
            document.getElementById("phrase").value = p.text;
            document.getElementById("youtubeUrl").value = `https://www.youtube.com/watch?v=${p.videoId}`;
            videoId = p.videoId;
            editingId = p.id;
            selectedTags = [...(p.tags || [])];
            renderTagList();
            document.getElementById("saveBtn").textContent = "Update Phrase";
            showScreen('form');
        };
    
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑️ Delete";
        deleteBtn.onclick = () => deletePhrase(p.id);
    
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
    document.getElementById("saveBtn").textContent = "Save Phrase";
    editingId = null;
    selectedTags = [];
    renderTagList();
}