import { dbInstance, availableTags } from './state.js';
import { renderTagList } from './tags.js';
import { loadAllPhrases } from './phrases.js';
import { applyFilter } from './phrases.js';

// IndexedDBを開く関数
export function openDB() {
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

// 利用可能なタグを保存する関数
export function saveAvailableTags() {
    const tx = dbInstance.transaction("tags", "readwrite");
    const store = tx.objectStore("tags");
    store.put({ id: "all", tags: availableTags });
}

// 利用可能なタグを読み込む関数
export function loadAvailableTags() {
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

// 全フレーズを読み込む関数
export function loadAllPhrases() {
    const tx = dbInstance.transaction("phrases", "readonly");
    const store = tx.objectStore("phrases");
    const request = store.getAll();
    request.onsuccess = () => {
        const allPhrases = request.result;
        applyFilter(allPhrases);
    };
}

// フレーズを削除する関数
export function deletePhrase(id) {
    const tx = dbInstance.transaction("phrases", "readwrite");
    const store = tx.objectStore("phrases");
    store.delete(id);
    tx.oncomplete = () => {
        loadAllPhrases();
    };
}