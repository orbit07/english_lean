// グローバル変数
export let db = null;           // IndexedDB ハンドル
export let currentVideoId = ''; // 画面上で操作中の YouTube ID

export let editingId = null;    // 編集対象フレーズの ID
export let selectedTags = [];   // 現在選択されているタグ
export let availableTags = [];  // 全タグ一覧
export let activeTagFilter = null; // 適用中のタグフィルター
