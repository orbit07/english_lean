// グローバル変数
export const state = {
    db: null, // IndexedDB ハンドル
    currentVideoId: '', // 画面上で操作中の YouTube ID
    editingId: null, // 編集対象フレーズの ID
    selectedTags: [], // 現在選択されているタグ
    availableTags: [], // 全タグ一覧
    activeTagFilter: null, // 適用中のタグフィルター
    lastListScroll: 0, // スクロール位置
};
