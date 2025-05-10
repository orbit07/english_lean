let dbInstance;
let videoId = "";
let editingId = null;
let selectedTags = [];
let availableTags = [];
let activeTagFilter = null;

function extractVideoId(url) {
  const match = url.match(/(?:\?v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : "";
}

function showVideo(vid) {
  document.getElementById("videoContainer").innerHTML =
    `<iframe id="youtubePlayer" src="https://www.youtube.com/embed/${vid}?enablejsapi=1" frameborder="0" allowfullscreen></iframe>`;
}

function parseTimeToSeconds(timeStr) {
  if (/^\d+:\d{1,2}$/.test(timeStr)) {
    const [min, sec] = timeStr.split(":").map(Number);
    return min * 60 + sec;
  } else if (/^\d+$/.test(timeStr)) {
    return parseInt(timeStr, 10);
  } else {
    return NaN;
  }
}

function resetFormToNewEntry() {
  document.getElementById("startTime").value = "";
  document.getElementById("phrase").value = "";
  document.getElementById("youtubeUrl").value = "";
  document.getElementById("saveBtn").textContent = "Save Phrase";
  editingId = null;
  selectedTags = [];
  renderTagList();
}

function deletePhrase(id) {
  const tx = dbInstance.transaction("phrases", "readwrite");
  const store = tx.objectStore("phrases");
  store.delete(id);
  tx.oncomplete = () => {
    loadAllPhrases();
  };
}

function loadAllPhrases() {
  const tx = dbInstance.transaction("phrases", "readonly");
  const store = tx.objectStore("phrases");
  const request = store.getAll();
  request.onsuccess = () => {
    const allPhrases = request.result;
    applyFilter(allPhrases);
  };
}

function applyFilter(allPhrases) {
  const filterSelectElement = document.getElementById("filterSelect");
  const filter = filterSelectElement ? filterSelectElement.value : "all";
  let filtered;

  if (filter === "current") {
    filtered = allPhrases.filter(p => p.videoId === videoId);
  } else if (filter === "favorite") {
    filtered = allPhrases.filter(p => p.favorite);
  } else {
    filtered = allPhrases;
  }

  // ✅ 追加: タグフィルターが指定されている場合、さらに絞り込む
  if (activeTagFilter) {
    filtered = filtered.filter(p => p.tags && p.tags.includes(activeTagFilter));
  }

  renderPhraseList(filtered);
}

function addTag() {
  const tagInput = document.getElementById("tagInput");
  const tag = tagInput.value.trim();
  if (tag && !availableTags.includes(tag)) {
    availableTags.push(tag);
    tagInput.value = "";
    renderTagList();
    saveAvailableTags(); // タグ追加時に保存
  }
}

function toggleTag(tag) {
  const index = selectedTags.indexOf(tag);
  if (index > -1) {
    selectedTags.splice(index, 1);
  } else {
    selectedTags.push(tag);
  }
  renderTagList();
}

function removeTag(tag) {
  availableTags = availableTags.filter(t => t !== tag);
  selectedTags = selectedTags.filter(t => t !== tag);
  if (activeTagFilter === tag) {
    activeTagFilter = null;
  }
  renderTagList();
  saveAvailableTags(); // タグ削除時に保存
  loadAllPhrases();
}

function toggleTagFilter(tag) {
  activeTagFilter = (activeTagFilter === tag) ? null : tag;
  loadAllPhrases();
}

function saveAvailableTags() {
  const tx = dbInstance.transaction("tags", "readwrite");
  const store = tx.objectStore("tags");
  store.put({ id: "all", tags: availableTags });
}

function loadAvailableTags() {
  const tx = dbInstance.transaction("tags", "readonly");
  const store = tx.objectStore("tags");
  const request = store.get("all");
  request.onsuccess = () => {
    if (request.result) {
      availableTags = request.result.tags;
      renderTagList();
    }
  };
}

function openDB() {
  const request = indexedDB.open("PhraseAppDB", 2);
  request.onupgradeneeded = function(event) {
    const db = event.target.result;
    if (!db.objectStoreNames.contains("phrases")) {
      db.createObjectStore("phrases", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("tags")) {
      db.createObjectStore("tags", { keyPath: "id" });
    }
  };
  request.onsuccess = function(event) {
    dbInstance = event.target.result;
    console.log("DB opened");
    loadAvailableTags();
    loadAllPhrases();
  };
  request.onerror = function() {
    alert("IndexedDB failed to open");
  };
}

function savePhrase() {
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

    if (editingId !== null) {
      const existing = allPhrases.find(p => p.id === editingId);
      entry.id = editingId;
      entry.favorite = existing ? existing.favorite : false; // 元の状態を維持
      const tx = dbInstance.transaction("phrases", "readwrite");
      const store = tx.objectStore("phrases");
      store.put(entry);
      tx.oncomplete = () => {
        resetFormToNewEntry();
        loadAllPhrases();
        showScreen('list');
      };
    } else {
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

function renderTagList() {
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

// 一覧表示用タグクリックフィルター追加
toggleTagFilterFromList = function(tag) {
  activeTagFilter = (activeTagFilter === tag) ? null : tag;
  loadAllPhrases();
}

function renderPhraseList(phrases) {
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

function showScreen(screen) {
  document.getElementById("formScreen").style.display = (screen === 'form') ? 'block' : 'none';
  document.getElementById("listScreen").style.display = (screen === 'list') ? 'flex' : 'none';
  document.getElementById("videoScreen").style.display = (screen === 'list') ? 'block' : 'none';

  if (screen === 'list') {
    editingId = null; // 一覧画面に戻ったときに編集状態をリセット
  }
  if (screen === 'form' && editingId === null) {
    resetFormToNewEntry();
  }
}

window.onload = () => {
  showScreen('list');
  openDB();
  setTimeout(() => {
    document.getElementById("filterSelect").value = "all";
    loadAllPhrases();
  }, 0);
};
