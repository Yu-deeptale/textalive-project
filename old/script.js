/**
 * TextAlive App API lyric sheet example
 * https://github.com/TextAliveJp/textalive-app-lyric-sheet
 *
 * インタラクティブな歌ードを実装した TextAlive App API のサンプルコードです。
 * 発声にあわせて歌詞が表示され、歌詞をクリックするとそのタイミングに再生がシークします。
 * また、このアプリが TextAlive ホストと接続されていなければ再生コントロールを表示します。
 */
const { Player } = TextAliveApp;

// TextAlive Player を初期化
const player = new Player({
  // トークンは https://developer.textalive.jp/profile で取得したものを使う
  app: {
    token: "GDRhpuuMUh6dow9a",
    parameters: [
      {
        title: "Gradation start color",
        name: "gradationStartColor",
        className: "Color",
        initialValue: "#bfaefc",
      },
      {
        title: "Gradation middle color",
        name: "gradationMiddleColor",
        className: "Color",
        initialValue: "#fea3db",
      },
      {
        title: "Gradation end color",
        name: "gradationEndColor",
        className: "Color",
        initialValue: "#9ae1dd",
      },
    ],
  },

  mediaElement: document.querySelector("#media"),
  mediaBannerPosition: "bottom right",

  // オプション一覧
  // https://developer.textalive.jp/packages/textalive-app-api/interfaces/playeroptions.html
});

const overlay = document.querySelector("#overlay");
const bar = document.querySelector("#bar");
const textContainer = document.querySelector("#text");
const seekbar = document.querySelector("#seekbar");
const paintedSeekbar = seekbar.querySelector("div");
let lastTime = -1;
let lastCharTime = -1; // 直近の歌詞発声時刻

let lyricsMap = []; // 歌詞とタイミング・DOM要素のリスト

// シークバーインジケーター生成
let seekbarIndicator = document.createElement("div");
seekbarIndicator.className = "seekbar-indicator";
seekbar.appendChild(seekbarIndicator);

player.addListener({
  /* APIの準備ができたら呼ばれる */
  onAppReady(app) {
    if (app.managed) {
      document.querySelector("#control").className = "disabled";
    }
    if (!app.songUrl) {
      document.querySelector("#media").className = "disabled";

      // ストリートライト / 加賀(ネギシャワーP)
      player.createFromSongUrl("https://piapro.jp/t/ULcJ/20250205120202", {
        video: {
          // 音楽地図訂正履歴
          beatId: 4694275,
          chordId: 2830730,
          repetitiveSegmentId: 2946478,

          // 歌詞URL: https://piapro.jp/t/DPXV
          // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FULcJ%2F20250205120202
          lyricId: 67810,
          lyricDiffId: 20654,
        },
      });
    }
  },

  /* パラメタが更新されたら呼ばれる */
  onAppParameterUpdate: () => {
    const params = player.app.options.parameters;
    const sc = player.app.parameters.gradationStartColor,
      scString = sc ? `rgb(${sc.r}, ${sc.g}, ${sc.b})` : params[0].initialValue;
    const mc = player.app.parameters.gradationMiddleColor,
      mcString = mc ? `rgb(${mc.r}, ${mc.g}, ${mc.b})` : params[0].initialValue;
    const ec = player.app.parameters.gradationEndColor,
      ecString = ec ? `rgb(${ec.r}, ${ec.g}, ${ec.b})` : params[1].initialValue;
    document.body.style.backgroundColor = ecString;
    document.body.style.backgroundImage = `linear-gradient(0deg, ${ecString} 0%, ${mcString} 50%, ${scString} 100%)`;
  },

  /* 楽曲が変わったら呼ばれる */
  onAppMediaChange() {
    // 画面表示をリセット
    overlay.className = "";
    bar.className = "";
    resetChars();
  },

  /* 楽曲情報が取れたら呼ばれる */
  onVideoReady(video) {
    document.querySelector("#artist span").textContent =
      player.data.song.artist.name;
    document.querySelector("#song span").textContent = player.data.song.name;

    currentBlockIdx = 0;
    renderLyricsBlock(video, currentBlockIdx);
    lastTime = -1;
  },

  /* 再生コントロールができるようになったら呼ばれる */
  onTimerReady() {
    overlay.className = "disabled";
    document.querySelector("#control > a#play").className = "";
    document.querySelector("#control > a#stop").className = "";
  },

  /* 再生位置の情報が更新されたら呼ばれる */
  onTimeUpdate(position) {
    // 現在再生中のフレーズインデックスを取得
    let activePhraseIdx = -1;
    for (let i = 0; i < lyricsMap.length; i++) {
      if (position >= lyricsMap[i].startTime && position < lyricsMap[i].endTime) {
        activePhraseIdx = lyricsMap[i].phraseIdx;
        break;
      }
    }

    // ブロックインデックスを計算
    const blockSize = 4;
    const newBlockIdx = activePhraseIdx >= 0 ? Math.floor(activePhraseIdx / blockSize) : 0;

    // ブロックが変わったら歌詞を切り替え
    if (newBlockIdx !== currentBlockIdx && player.video) {
      currentBlockIdx = newBlockIdx;
      renderLyricsBlock(player.video, currentBlockIdx);
    }

    // 歌詞の状態を更新（アニメーション等）
    lyricsMap.forEach((item) => {
      if (position >= item.endTime) {
        item.el.classList.add("sung-lyric");
        item.el.classList.remove("active-lyric");
      } else if (position >= item.startTime && position < item.endTime) {
        item.el.classList.add("active-lyric");
        item.el.classList.remove("sung-lyric");
      } else {
        item.el.classList.remove("active-lyric");
        item.el.classList.remove("sung-lyric");
      }
    });

    // インジケーター位置を更新
    const percent = position / player.video.duration;
    seekbarIndicator.style.left = `calc(${percent * 100}% )`;

    lastTime = position;

    const timeIndicator = document.getElementById("time-indicator");
    function formatTime(ms) {
      const totalSec = Math.floor(ms / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${m}分${s}秒`;
    }
    if (player && player.video) {
      timeIndicator.textContent = `${formatTime(position)} / ${formatTime(player.video.duration)}`;
    }
  },

  /* 楽曲の再生が始まったら呼ばれる */
  onPlay() {
    const a = document.querySelector("#control > a#play");
    while (a.firstChild) a.removeChild(a.firstChild);
    a.appendChild(document.createTextNode("\uf28b"));
  },

  /* 楽曲の再生が止まったら呼ばれる */
  onPause() {
    const a = document.querySelector("#control > a#play");
    while (a.firstChild) a.removeChild(a.firstChild);
    a.appendChild(document.createTextNode("\uf144"));
  },
});

/* 再生・一時停止ボタン */
document.querySelector("#control > a#play").addEventListener("click", (e) => {
  e.preventDefault();
  if (player) {
    if (player.isPlaying) {
      player.requestPause();
    } else {
      player.requestPlay();
    }
  }
  return false;
});

// /* 停止ボタン */
// document.querySelector("#control > a#stop").addEventListener("click", (e) => {
//   e.preventDefault();
//   if (player) {
//     player.requestStop();

//     // 再生を停止したら画面表示をリセットする
//     bar.className = "";
//     resetChars();
//   }
//   return false;
// });

/* シークバー */
seekbar.addEventListener("click", (e) => {
  e.preventDefault();
  if (player) {
    player.requestMediaSeek(
      (player.video.duration * e.offsetX) / seekbar.clientWidth
    );
  }
  return false;
});

// --- シークバーのドラッグ＆ホバー対応 ---

// シークバーの再生時間表示用ツールチップ
let seekbarTooltip = document.getElementById("seekbar-tooltip");
if (!seekbarTooltip) {
  seekbarTooltip = document.createElement("div");
  seekbarTooltip.id = "seekbar-tooltip";
  document.body.appendChild(seekbarTooltip);
}
seekbarTooltip.style.position = "fixed";
seekbarTooltip.style.display = "none";
seekbarTooltip.style.pointerEvents = "none";
seekbarTooltip.style.background = "rgba(0,0,0,0.7)";
seekbarTooltip.style.color = "#fff";
seekbarTooltip.style.padding = "4px 12px";
seekbarTooltip.style.borderRadius = "12px";
seekbarTooltip.style.fontSize = "16px";
seekbarTooltip.style.zIndex = "1000";

// 時間表示フォーマット
function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}分${s}秒`;
}

// シークバーでドラッグ開始
seekbar.addEventListener("mousedown", (e) => {
  isDragging = true;
  handleSeekbarMove(e);
  document.body.style.userSelect = "none";
});

// ドラッグ中の処理
document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    handleSeekbarMove(e);
  }
});

// ドラッグ終了
document.addEventListener("mouseup", (e) => {
  if (isDragging) {
    isDragging = false;
    handleSeekbarMove(e, true); // ドラッグ終了時に再生位置を確定
    seekbarTooltip.style.display = "none";
    document.body.style.userSelect = "";
  }
});

// シークバー上でホバー時に時間表示
seekbar.addEventListener("mousemove", (e) => {
  if (!player || !player.video) return;
  const seekbarRect = seekbar.getBoundingClientRect();
  const percent = Math.min(Math.max((e.clientX - seekbarRect.left) / seekbarRect.width, 0), 1);
  const seekTime = player.video.duration * percent;
  seekbarTooltip.textContent = formatTime(seekTime);
  seekbarTooltip.style.display = "block";
  seekbarTooltip.style.left = `${e.clientX - seekbarTooltip.offsetWidth / 2}px`;
  seekbarTooltip.style.top = `${seekbarRect.top - 36}px`;
});

// シークバーからマウスが離れたらツールチップ非表示
seekbar.addEventListener("mouseleave", () => {
  if (!isDragging) seekbarTooltip.style.display = "none";
});

// シークバーの移動・確定処理
function handleSeekbarMove(e, seek = false) {
  if (!player || !player.video) return;
  const seekbarRect = seekbar.getBoundingClientRect();
  const percent = Math.min(Math.max((e.clientX - seekbarRect.left) / seekbarRect.width, 0), 1);
  const seekTime = player.video.duration * percent;

  // シークバーのインジケーターを移動
  seekbarIndicator.style.left = `calc(${percent * 100}% )`;

  // ツールチップ表示
  seekbarTooltip.textContent = formatTime(seekTime);
  seekbarTooltip.style.display = "block";
  seekbarTooltip.style.left = `${e.clientX - seekbarTooltip.offsetWidth / 2}px`;
  seekbarTooltip.style.top = `${seekbarRect.top - 36}px`;

  // ドラッグ終了時に再生位置を変更
  if (seek) {
    player.requestMediaSeek(seekTime);
  }
}

/**
 * 歌詞を最初から全て表示し、1秒以上空く場合は2行改行
 */
function renderAllLyrics(video) {
  lyricsMap = [];
  textContainer.innerHTML = "";

  if (!video || !video.phrases) return;

  let phraseCount = 0;

  // すべてのフレーズを順にたどる
  video.phrases.forEach((phrase, idx) => {
    // フレーズ内の文字をspanで追加
    phrase.children.forEach((ch) => {
      const charSpan = document.createElement("span");
      charSpan.textContent = ch.text;
      charSpan.className = "lyric-char";
      textContainer.appendChild(charSpan);

      // 歌詞アニメーション用にリストへ
      lyricsMap.push({
        el: charSpan,
        startTime: ch.startTime,
        endTime: ch.endTime || ch.startTime + 500,
        textUnit: ch,
      });
    });

    phraseCount++;
    // 2フレーズごとに改行
    if (phraseCount % 2 === 0 && idx !== video.phrases.length - 1) {
      textContainer.appendChild(document.createElement("br"));
    }
  });
}

/**
 * 歌詞を4フレーズずつ表示し、再生位置に合わせて切り替える（前の4フレーズは削除）
 */
function renderLyricsBlock(video, currentBlockIdx = 0) {
  // 前の歌詞をすべて削除
  lyricsMap = [];
  textContainer.innerHTML = "";

  if (!video || !video.phrases) return;

  // 4フレーズごとにブロック化
  const blockSize = 4;
  const startPhraseIdx = currentBlockIdx * blockSize;
  const endPhraseIdx = Math.min(startPhraseIdx + blockSize, video.phrases.length);

  for (let i = startPhraseIdx; i < endPhraseIdx; i++) {
    const phrase = video.phrases[i];
    // フレーズ内の文字をspanで追加
    phrase.children.forEach((ch) => {
      const charSpan = document.createElement("span");
      charSpan.textContent = ch.text;
      charSpan.className = "lyric-char";
      textContainer.appendChild(charSpan);

      lyricsMap.push({
        el: charSpan,
        startTime: ch.startTime,
        endTime: ch.endTime || ch.startTime + 500,
        textUnit: ch,
        phraseIdx: i,
      });
    });
    // フレーズごとに改行
    textContainer.appendChild(document.createElement("br"));
  }
}


function renderLyricsWindow(video, startPhraseIdx = 0, windowSize = 4) {
  lyricsMap = [];
  textContainer.innerHTML = "";

  if (!video || !video.phrases) return;

  const endPhraseIdx = Math.min(startPhraseIdx + windowSize, video.phrases.length);

  for (let i = startPhraseIdx; i < endPhraseIdx; i++) {
    const phrase = video.phrases[i];
    // フレーズごとにdivでラップ
    const phraseDiv = document.createElement("div");
    phraseDiv.className = "lyric-phrase";
    phrase.children.forEach((ch) => {
      const charSpan = document.createElement("span");
      charSpan.textContent = ch.text;
      charSpan.className = "lyric-char";
      phraseDiv.appendChild(charSpan);

      lyricsMap.push({
        el: charSpan,
        startTime: ch.startTime,
        endTime: ch.endTime || ch.startTime + 500,
        textUnit: ch,
        phraseIdx: i,
      });
    });
    textContainer.appendChild(phraseDiv);
  }
}

/**
 * 歌詞を最大10フレーズまで表示し、再生位置に合わせてウィンドウをスライドさせる
 */
function renderLyricsLimited(video, startPhraseIdx = 0, maxPhraseCount = 10) {
  lyricsMap = [];
  textContainer.innerHTML = "";

  if (!video || !video.phrases) return;

  // 表示する範囲を決定
  const endPhraseIdx = Math.min(startPhraseIdx + maxPhraseCount, video.phrases.length);

  for (let i = startPhraseIdx; i < endPhraseIdx; i += 2) {
    // 2フレーズごとに1行
    const lineDiv = document.createElement("div");
    lineDiv.className = "lyric-phrase";

    for (let j = 0; j < 2; j++) {
      const phraseIdx = i + j;
      if (phraseIdx >= endPhraseIdx) break;
      const phrase = video.phrases[phraseIdx];
      phrase.children.forEach((ch) => {
        const charSpan = document.createElement("span");
        charSpan.textContent = ch.text;
        charSpan.className = "lyric-char";
        lineDiv.appendChild(charSpan);

        lyricsMap.push({
          el: charSpan,
          startTime: ch.startTime,
          endTime: ch.endTime || ch.startTime + 500,
          textUnit: ch,
          phraseIdx: phraseIdx,
        });
      });
      // フレーズ間にスペース
      if (j === 0) {
        lineDiv.appendChild(document.createTextNode("　"));
      }
    }
    textContainer.appendChild(lineDiv);
  }
}

// 歌詞ウィンドウの状態を管理
let currentPhraseWindowStart = 0;
const maxPhraseCount = 10;

// onVideoReadyで最初の10フレーズを表示
onVideoReady = function(video) {
  document.querySelector("#artist span").textContent =
    player.data.song.artist.name;
  document.querySelector("#song span").textContent = player.data.song.name;

  currentPhraseWindowStart = 0;
  renderLyricsLimited(video, currentPhraseWindowStart, maxPhraseCount);
  lastTime = -1;
};

// onTimeUpdateで進行に合わせてウィンドウをスライド
onTimeUpdate = function(position) {
  let activePhraseIdx = -1;
  const video = player.video;
  if (!video || !video.phrases) return;

  // 全フレーズから現在位置を特定
  for (let i = 0; i < video.phrases.length; i++) {
    const phrase = video.phrases[i];
    const firstChar = phrase.children[0];
    const lastChar = phrase.children[phrase.children.length - 1];
    if (
      position >= firstChar.startTime &&
      position < (lastChar.endTime || lastChar.startTime + 500)
    ) {
      activePhraseIdx = i;
      break;
    }
  }

  // 2フレーズ消化ごとにウィンドウをスライド
  if (
    activePhraseIdx >= 0 &&
    activePhraseIdx >= currentPhraseWindowStart + 2
  ) {
    currentPhraseWindowStart += 2;
    renderLyricsLimited(player.video, currentPhraseWindowStart, maxPhraseCount);
  }

  // 歌詞の状態を更新（アニメーション等）
  lyricsMap.forEach((item) => {
    if (position >= item.endTime) {
      item.el.classList.add("sung-lyric");
      item.el.classList.remove("active-lyric");
    } else if (position >= item.startTime && position < item.endTime) {
      item.el.classList.add("active-lyric");
      item.el.classList.remove("sung-lyric");
    } else {
      item.el.classList.remove("active-lyric");
      item.el.classList.remove("sung-lyric");
    }
  });

  // インジケーター位置を更新
  const percent = position / player.video.duration;
  seekbarIndicator.style.left = `calc(${percent * 100}% )`;

  lastTime = position;

  const timeIndicator = document.getElementById("time-indicator");
  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}分${s}秒`;
  }
  if (player && player.video) {
    timeIndicator.textContent = `${formatTime(position)} / ${formatTime(player.video.duration)}`;
  }
};



