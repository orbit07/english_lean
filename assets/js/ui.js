import { editingId } from './state.js';
import { resetFormToNewEntry } from './phrases.js';

// YouTubeのURLから動画IDを抽出する関数
export function extractVideoId(url) {
    const match = url.match(/(?:\?v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : "";
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
