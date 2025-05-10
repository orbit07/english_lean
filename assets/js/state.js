// グローバル変数
export let dbInstance = null; // IndexedDBのインスタンス
export let videoId = ""; // 現在表示中のYouTube動画ID
export let editingId = null; // 編集中のフレーズID
export let selectedTags = []; // 現在選択されているタグ
export let availableTags = []; // 利用可能なタグ一覧
export let activeTagFilter = null; // 現在適用されているタグフィルター