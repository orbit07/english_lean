let dbInstance; // IndexedDBのインスタンス
let videoId = ""; // 現在表示中のYouTube動画ID
let editingId = null; // 編集中のフレーズID
let selectedTags = []; // 現在選択されているタグ
let availableTags = []; // 利用可能なタグ一覧
let activeTagFilter = null; // 現在適用されているタグフィルター

// YouTubeのURLから動画IDを抽出する関数
function extractVideoId(url) {
  const match = url.match(/(?:\?v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : "";
}

// YouTube動画を埋め込む関数
function showVideo(vid) {
  document.getElementById("videoContainer").innerHTML =
    `<iframe id="youtubePlayer" src="https://www.youtube.com/embed/${vid}?enablejsapi=1" frameborder="0" allowfullscreen></iframe>`;
}

// 時間文字列を秒数に変換する関数
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

// フォームを新規入力状態にリセットする関数
function resetFormToNewEntry() {
  document.getElementById("startTime").value = "";
  document.getElementById("phrase").value = "";
  document.getElementById("youtubeUrl").value = "";
  document.getElementById("saveBtn").textContent = "Save Phrase";
  editingId = null;
  selectedTags = [];
  renderTagList();
}

// フレーズを削除する関数
function deletePhrase(id) {
  const tx = dbInstance.transaction("phrases", "readwrite");
  const store = tx.objectStore("phrases");
  store.delete(id);
  tx.oncomplete = () => {
    loadAllPhrases();
  };
}

// 全フレーズを読み込む関数
function loadAllPhrases() {
  const tx = dbInstance.transaction("phrases", "readonly");
  const store = tx.objectStore("phrases");
  const request = store.getAll();
  request.onsuccess = () => {
    const allPhrases = request.result;
    applyFilter(allPhrases);
  };
}

// フレーズにフィルターを適用する関数
function applyFilter(allPhrases) {
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

// タグを追加する関数
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

// タグの選択状態を切り替える関数
function toggleTag(tag) {
  const index = selectedTags.indexOf(tag);
  if (index > -1) {
    selectedTags.splice(index, 1);
  } else {
    selectedTags.push(tag);
  }
  renderTagList();
}

// タグを削除する関数
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

// タグフィルターを切り替える関数
function toggleTagFilter(tag) {
  activeTagFilter = (activeTagFilter === tag) ? null : tag;
  loadAllPhrases();
}

// タグフィルターをリストから切り替える関数
function toggleTagFilterFromList(tag) {
  activeTagFilter = (activeTagFilter === tag) ? null : tag;
  loadAllPhrases();
}

// 利用可能なタグを保存する関数
function saveAvailableTags() {
  const tx = dbInstance.transaction("tags", "readwrite");
  const store = tx.objectStore("tags");
  store.put({ id: "all", tags: availableTags });
}

// 利用可能なタグを読み込む関数
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

// IndexedDBを開く関数
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

// フレーズを保存する関数
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

// タグリストを描画する関数
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

// 画面を切り替える関数
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

// ページ読み込み時に初期化処理を実行
window.onload = () => {
  showScreen('list');
  openDB();
};

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
    document.getElementById("filterSelect").value = "all";
    loadAvailableTags();
    loadAllPhrases();
  };
  request.onerror = function() {
    alert("IndexedDB failed to open");
  };
}
