// 必要な関数や変数をインポート
import { state } from './state.js';
import { renderTagList } from './tags.js';
import { applyFilter } from './phrases.js';
import { showToast } from './toast.js';

// IndexedDBを開く関数
export function openDB() {
  console.log('savePhrase state.db =', state.db);
    const request = indexedDB.open("PhraseAppDB", 2);

    request.onerror = () => console.error('データベースを開けませんでした');

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
      state.db = event.target.result;

      state.db.onversionchange = () => {
        state.db.close();
        showToast('DB の新しいバージョンがあります。再読込してください', true, 5000);
      };

      state.db.onerror = event => showToast('DBエラー: ' + event.target.error, true);

      loadAvailableTags();
      loadAllPhrases();
    };
    request.onerror = function() {
      alert("IndexedDB failed to open");
    };
}

// 利用可能なタグを保存する関数
export function saveAvailableTags() {
    const tx = state.db.transaction("tags", "readwrite");
    tx.onerror = () => showToast('タグの保存に失敗しました', true);
    const store = tx.objectStore("tags");
    const req = store.put({ id: "all", tags: state.availableTags });
    req.onerror = () => console.error('タグの保存に失敗しました');
}

// 利用可能なタグを読み込む関数
export function loadAvailableTags() {
    const tx = state.db.transaction("tags", "readonly");
    tx.onerror = () => showToast('タグの取得に失敗しました', true);
    const store = tx.objectStore("tags");
    const request = store.get("all");
    request.onsuccess = () => {
        if (request.result) {
            state.availableTags = request.result.tags;
            renderTagList();
        }
    };
}

// 全フレーズを読み込む関数
export function loadAllPhrases() {
    const tx = state.db.transaction("phrases", "readonly");
    tx.onerror = () => showToast('フレーズの取得に失敗しました', true);
    const store = tx.objectStore("phrases");
    const request = store.getAll();
    request.onerror = () => console.error('フレーズの取得に失敗しました');
    request.onsuccess = () => {
        const allPhrases = request.result;
        applyFilter(allPhrases);
    };
}

// フレーズを削除する関数
export function deletePhrase(id) {
    const tx = state.db.transaction("phrases", "readwrite");
    tx.onerror = () => showToast('フレーズの削除に失敗しました', true);
    const store = tx.objectStore("phrases");
    const req = store.delete(id);
    req.onerror = () => console.error('フレーズの削除に失敗しました');
    tx.oncomplete = () => {
        loadAllPhrases();
    };
}