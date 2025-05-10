// フレーズ一覧のレンダリング処理
export function renderPhraseList(phrases) {
    const container = document.getElementById("phraseList");
    container.innerHTML = "";
  
    phrases.forEach((p) => {
        const div = document.createElement("div");
        div.className = "phrase-item";
    
        const phraseText = document.createElement("span");
        phraseText.textContent = `▶️ [${formatTime(p.time)}] ${p.text}`;
        phraseText.classList.add("phrase-text");
        phraseText.onclick = () => showPhrase(p);
    
        const tagGroup = document.createElement("div");
        tagGroup.className = "tag-group";
        (p.tags || []).forEach(tag => {
            const tagBtn = document.createElement("button");
            tagBtn.textContent = `#${tag}`;
            tagBtn.classList.add("tag-button");
            if (activeTagFilter === tag) tagBtn.classList.add("active-tag-filter");
            tagBtn.onclick = (e) => {
                e.stopPropagation();
                toggleTagFilterFromList(tag);
            };
            tagGroup.appendChild(tagBtn);
        });
  
        const buttonGroup = document.createElement("div");
        buttonGroup.className = "button-group";
        buttonGroup.appendChild(createFavoriteButton(p));
        buttonGroup.appendChild(createEditButton(p));
        buttonGroup.appendChild(createDeleteButton(p));
    
        div.appendChild(phraseText);
        div.appendChild(tagGroup);
        div.appendChild(buttonGroup);
        container.appendChild(div);
    });
}
  
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
}
  
function showPhrase(p) {
    showScreen('list');
    showVideo(p.videoId);
    videoId = p.videoId;
}
  
function createFavoriteButton(p) {
    const btn = document.createElement("button");
    btn.textContent = p.favorite ? "⭐️" : "☆";
    btn.onclick = (e) => {
        e.stopPropagation();
        p.favorite = !p.favorite;
        const tx = dbInstance.transaction("phrases", "readwrite");
        const store = tx.objectStore("phrases");
        store.put(p);
        tx.oncomplete = () => loadAllPhrases();
    };
    return btn;
}
  
function createEditButton(p) {
    const btn = document.createElement("button");
    btn.textContent = "✏️ Edit";
    btn.onclick = () => {
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
    return btn;
}
  
function createDeleteButton(p) {
    const btn = document.createElement("button");
    btn.textContent = "🗑️ Delete";
    btn.onclick = () => deletePhrase(p.id);
    return btn;
}