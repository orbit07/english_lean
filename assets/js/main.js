let dbInstance;
let phrases = [];
let allPhrases = [];
let videoId = "";
let editingId = null; // 追加: 編集中のIDを追跡

function openDB() {
    const request = indexedDB.open("PhraseAppDB", 1);
    request.onupgradeneeded = function(event) {
        const db = event.target.result;
        db.createObjectStore("phrases", { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = function(event) {
        dbInstance = event.target.result;
        console.log("DB opened");
        loadAllPhrases();
    };
    request.onerror = function() {
        alert("IndexedDB failed to open");
    };
}

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

function savePhrase() {
    const url = document.getElementById("youtubeUrl").value;
    const newVideoId = extractVideoId(url);
    const rawTime = document.getElementById("startTime").value.trim();
    const time = parseTimeToSeconds(rawTime);
    const text = document.getElementById("phrase").value.trim();

    if (newVideoId && !isNaN(time) && text) {
        if (editingId !== null) {
            const tx = dbInstance.transaction("phrases", "readwrite");
            const store = tx.objectStore("phrases");
            store.put({ id: editingId, videoId: newVideoId, time, text });
            tx.oncomplete = () => {
                resetFormToNewEntry();
                loadAllPhrases();
            };
        } else {
            videoId = newVideoId;
            const entry = { videoId, time, text };
            const tx = dbInstance.transaction("phrases", "readwrite");
            const store = tx.objectStore("phrases");
            store.add(entry);
            tx.oncomplete = () => {
                resetFormToNewEntry();
                showVideo(videoId);
                loadAllPhrases();
                showScreen('list');
            };
        }
    }
}

function resetFormToNewEntry() {
    document.getElementById("startTime").value = "";
    document.getElementById("phrase").value = "";
    document.getElementById("youtubeUrl").value = "";
    document.getElementById("saveBtn").textContent = "Save Phrase";
    editingId = null;
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
        allPhrases = request.result;
        applyFilter();
    };
}

function applyFilter() {
    const filter = document.getElementById("filterSelect").value;
    if (filter === "current") {
        phrases = allPhrases.filter(p => p.videoId === videoId);
    } else {
        phrases = allPhrases;
    }
    renderPhraseList();
}

function renderPhraseList() {
    const container = document.getElementById("phraseList");
    container.innerHTML = "";
    phrases.forEach((p) => {
        const div = document.createElement("div");
        div.className = "phrase-item";
        const minutes = Math.floor(p.time / 60);
        const seconds = p.time % 60;
        const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const phraseText = document.createElement("span");
        phraseText.textContent = `▶️ [${timeFormatted}] ${p.text}`;
        phraseText.style.cursor = "pointer";
        phraseText.onclick = () => {
            showScreen('list');
            showVideo(p.videoId);
            const iframe = document.getElementById("youtubePlayer");
            if (iframe) {
                iframe.src = `https://www.youtube.com/embed/${p.videoId}?start=${p.time}&autoplay=1`;
            }
        };

        const buttonGroup = document.createElement("div");
        buttonGroup.className = "button-group";

        const editBtn = document.createElement("button");
        editBtn.textContent = "✏️ Edit";
        editBtn.onclick = () => {
            document.getElementById("startTime").value = p.time;
            document.getElementById("phrase").value = p.text;
            document.getElementById("youtubeUrl").value = `https://www.youtube.com/watch?v=${p.videoId}`;
            videoId = p.videoId;
            editingId = p.id; // 編集IDを設定
            document.getElementById("saveBtn").textContent = "Update Phrase";
            showScreen('form');
        };

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑️ Delete";
        deleteBtn.onclick = () => deletePhrase(p.id);

        buttonGroup.appendChild(editBtn);
        buttonGroup.appendChild(deleteBtn);

        div.appendChild(phraseText);
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
};