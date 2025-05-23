// 必要な関数や変数をインポート
import { state } from './state.js';
import { resetFormToNewEntry } from './phrases.js';
import { updateTagButtons } from './tags.js';

// YouTubeのURLから動画IDを抽出する関数
export function extractVideoId(text = '') {
    text = text.trim();
  
    // ① すでに 11 文字 ID だけ
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;

  // ② 短縮 URL … youtu.be/XXXXXXXXXXX
  const mShort = text.match(/^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/);
  if (mShort) return mShort[1];

  // ③ 通常再生 … watch?v=XXXXXXXXXXX
  const mWatch = text.match(/[?&]v=([a-zA-Z0-9_-]{11})(?:&|$)/);
  if (mWatch) return mWatch[1];

  // ④ 埋め込み … /embed/XXXXXXXXXXX
  const mEmbed = text.match(/\/embed\/([a-zA-Z0-9_-]{11})(?:\?|$)/);
  if (mEmbed) return mEmbed[1];

  // ⑤ ライブ配信 … /live/XXXXXXXXXXX
  const mLive = text.match(/\/live\/([a-zA-Z0-9_-]{11})(?:\?|$)/);
  if (mLive) return mLive[1];

  return null;          // どの形式でも取れなかった
}

// YouTube動画を埋め込む関数
export function showVideo(vid) {
    document.getElementById("videoContainer").innerHTML =
        `<iframe id="youtubePlayer" src="https://www.youtube.com/embed/${vid}?enablejsapi=1" frameborder="0" allowfullscreen></iframe>`;
}

// 時間文字列を秒数に変換する関数
export function parseTimeToSeconds(timeStr) {
    if (/^\d+:\d{1,2}$/.test(timeStr)) {
        const [min, sec] = timeStr.split(":").map(Number);
        return min * 60 + sec;
    } else if (/^\d+$/.test(timeStr)) {
        return parseInt(timeStr, 10);
    } else {
        return NaN;
    }
}

// 画面を切り替える関数
export function showScreen(screen) {

    // ▼ 一覧からフォームへ遷移する直前にスクロール位置を記録
    if (screen === 'form') {
        state.lastListScroll = window.pageYOffset;
    }

    document.getElementById('formScreen').classList.toggle('hidden', screen !== 'form');
    document.getElementById('listScreen').classList.toggle('hidden', screen !== 'list');
    document.getElementById('videoScreen').classList.toggle('hidden', screen !== 'list');

    // ▼ 一覧を再表示した直後に、記録したスクロール位置をセット
    if (screen === 'list') {
        window.scrollTo(0, state.lastListScroll);
    }

    // ナビゲーションボタンの active 状態切り替え
    document.getElementById('listButton').classList.toggle('active', screen === 'list');
    document.getElementById('formButton').classList.toggle('active', screen === 'form');

    if (screen === 'form') {
        updateTagButtons();
    }

    if (screen === 'list') {
        state.editingId = null; // 一覧画面に戻ったときに編集状態をリセット
    }
    if (screen === 'form' && state.editingId === null) {
        resetFormToNewEntry();
    }
}