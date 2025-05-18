// phrases.js — フレーズ管理モジュール 改良版
import { state } from './state.js';
import { showScreen, showVideo, parseTimeToSeconds, extractVideoId } from './ui.js';
import { toggleTagFilterFromList, updateTagButtons } from './tags.js';
import { loadAllPhrases, deletePhrase } from './db.js';
import { showToast } from './toast.js';

// ヘルパー関数
function getValue(id) { return document.getElementById(id).value.trim(); }
function setValue(id, val) { document.getElementById(id).value = val; }
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// 保存成功後の共通処理
function onSave() {
  showToast('Saved');
  resetFormToNewEntry();
  loadAllPhrases();
  showScreen('list');
}

// フレーズを保存または更新
export function savePhrase() {
  const url     = getValue('youtubeUrl');
  const text    = getValue('phrase');
  const rawTime = getValue('startTime');
  const videoId = extractVideoId(url);
  const time    = parseTimeToSeconds(rawTime);

  if (!videoId || !text) {
    showToast('URL or phrase missing', true);
    return;
  }
  if (!state.editingId) state.currentVideoId = videoId;

  const entry = {
    videoId,
    time,
    text,
    tags: [...state.selectedTags],
    favorite: false,
    id: state.editingId || undefined
  };

  const tx = state.db.transaction('phrases', 'readwrite');
  const store = tx.objectStore('phrases');
  const request = state.editingId ? store.put(entry) : store.add(entry);
  request.onsuccess = onSave;
  request.onerror   = () => showToast('Save failed', true);
}

// 選択フィルタ・検索ワードで絞り込み
export function applyFilter(allPhrases) {
  const filter = getValue('filterSelect');
  const term   = getValue('searchInput').toLowerCase();

  let filtered = allPhrases.filter(p => (
    filter === 'all' ||
    (filter === 'current'  && p.videoId === state.currentVideoId) ||
    (filter === 'favorite' && p.favorite)
  ));
  if (state.activeTagFilter) {
    filtered = filtered.filter(p => p.tags?.includes(state.activeTagFilter));
  }
  if (term) {
    filtered = filtered.filter(p => p.text.toLowerCase().includes(term));
  }
  renderPhraseList(filtered);
}

// フレーズ一覧をレンダリング
export function renderPhraseList(phrases) {
  const container = document.getElementById('phraseList');
  container.innerHTML = '';
  const frag = document.createDocumentFragment();

  phrases.forEach(p => {
    const div = document.createElement('div');
    div.className = 'phrase-item';
    frag.appendChild(div);

    // テキストクリックで動画再生＋一覧表示
    const phraseEl = document.createElement('span');
    phraseEl.className = 'phrase_text';
    phraseEl.textContent = `[${formatTime(p.time)}] ${p.text}`;
    phraseEl.addEventListener('click', () => {
      showScreen('list');
      showVideo(p.videoId);
      state.currentVideoId = p.videoId;
      loadAllPhrases();
    });
    div.appendChild(phraseEl);

    // タググループ
    const tagGroup = document.createElement('div');
    tagGroup.className = 'tag-group';
    p.tags?.forEach(tag => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tagButton';
      btn.textContent = `#${tag}`;
      if (state.activeTagFilter === tag) btn.classList.add('active');
      btn.addEventListener('click', e => {
        e.stopPropagation();
        toggleTagFilterFromList(tag);
      });
      tagGroup.appendChild(btn);
    });
    div.appendChild(tagGroup);

    // アクションボタン群
    const actions = [
      { name: 'favorite', icon: p.favorite ? 'bookmark_on' : 'bookmark_off' },
      { name: 'edit',     icon: 'edit_list' },
      { name: 'delete',   icon: 'bin' }
    ];
    const btnGroup = document.createElement('div');
    btnGroup.className = 'button-group';

    actions.forEach(({ name, icon }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = `<img src="assets/img/${icon}.svg" alt="${name}">`;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (name === 'delete')   deletePhrase(p.id);
        if (name === 'edit')     editPhrase(p);
        if (name === 'favorite') toggleFavorite(p);
      });
      btnGroup.appendChild(btn);
    });
    div.appendChild(btnGroup);
  });

  container.appendChild(frag);
}

// 編集モードのセットアップ
function editPhrase(p) {
  setValue('startTime', formatTime(p.time));
  setValue('phrase', p.text);
  setValue('youtubeUrl', `https://www.youtube.com/watch?v=${p.videoId}`);
  showVideo(p.videoId);
  state.currentVideoId = p.videoId;
  state.editingId = p.id;
  state.selectedTags = [...(p.tags || [])];
  updateTagButtons();
  document.getElementById('saveButton').innerHTML =
    '<img src="assets/img/save.svg" alt>Update Phrase';
  showScreen('form');
}

// お気に入り切替
function toggleFavorite(p) {
  p.favorite = !p.favorite;
  const tx = state.db.transaction('phrases', 'readwrite');
  tx.objectStore('phrases').put(p).oncomplete = () => loadAllPhrases();
}

// フォームをクリア
export function resetFormToNewEntry() {
  setValue('startTime', '');
  setValue('phrase', '');
  setValue('youtubeUrl', '');
  document.getElementById('saveButton').innerHTML =
    '<img src="assets/img/save.svg" alt>Save Phrase';
  state.editingId = null;
  state.selectedTags = [];
  updateTagButtons();
}
