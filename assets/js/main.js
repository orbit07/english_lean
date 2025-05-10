// 必要なモジュールをインポート
import { openDB, saveAvailableTags, loadAvailableTags, loadAllPhrases, deletePhrase } from './db.js';
import { addTag, toggleTag, removeTag, toggleTagFilter, toggleTagFilterFromList, renderTagList } from './tags.js';
import { savePhrase, applyFilter, renderPhraseList, resetFormToNewEntry } from './phrases.js';
import { extractVideoId, showVideo, parseTimeToSeconds, showScreen } from './ui.js';

// グローバル変数
let dbInstance; // IndexedDBのインスタンス
let videoId = ""; // 現在表示中のYouTube動画ID
let editingId = null; // 編集中のフレーズID
let selectedTags = []; // 現在選択されているタグ
let availableTags = []; // 利用可能なタグ一覧
let activeTagFilter = null; // 現在適用されているタグフィルター

// ページ読み込み時に初期化処理を実行
window.onload = () => {
  showScreen('list');
  openDB();
};
