/**
 * TextAlive App API lyric sheet example
 * https://github.com/TextAliveJp/textalive-app-lyric-sheet
 *
 * インタラクティブな歌詞カードを実装した TextAlive App API のサンプルコードです。
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

    renderAllLyrics(video); // 歌詞を最初から全て描画
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
    // シークバーの表示を更新
    paintedSeekbar.style.width = `${
      parseInt((position * 1000) / player.video.duration) / 10
    }%`;

    // 歌詞アニメーション
    lyricsMap.forEach((item) => {
      if (
        position >= item.startTime &&
        position < item.endTime
      ) {
        item.el.classList.add("active-lyric");
      } else {
        item.el.classList.remove("active-lyric");
      }
    });

    lastTime = position;
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

/* 停止ボタン */
document.querySelector("#control > a#stop").addEventListener("click", (e) => {
  e.preventDefault();
  if (player) {
    player.requestStop();

    // 再生を停止したら画面表示をリセットする
    bar.className = "";
    resetChars();
  }
  return false;
});

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

/**
 * 歌詞を最初から全て表示し、1秒以上空く場合は2行改行
 */
function renderAllLyrics(video) {
  lyricsMap = [];
  textContainer.innerHTML = "";

  if (!video || !video.firstChar) return;

  let prevBar = null;
  let currentBar = null;
  let prevCharEnd = null;
  let prevPhrase = null;
  let currentPhrase = null;

  // すべての文字を時系列順にたどる
  for (let ch = video.firstChar; ch; ch = ch.next) {
    currentBar = ch.parent.parent.parent;   // bar
    currentPhrase = ch.parent.parent;       // phrase

    // バーが変わったらスペースを追加
    if (prevBar !== currentBar) {
      if (prevBar) {
        // 前のバーがあればスペースを追加
        const barSpace = document.createElement("span");
        barSpace.className = "bar-space";
        barSpace.textContent = "　"; // 全角スペース
        textContainer.appendChild(barSpace);
      }
    }

    // 0.5秒以上空いた場合、かつフレーズの先頭なら2行改行
    if (
      prevCharEnd !== null &&
      ch.startTime - prevCharEnd > 500 &&
      prevPhrase !== null &&
      currentPhrase !== prevPhrase // フレーズが変わった時のみ
    ) {
      textContainer.appendChild(document.createElement("br"));
      textContainer.appendChild(document.createElement("br"));
    }

    // 歌詞文字をspanで追加
    const charSpan = document.createElement("span");
    charSpan.textContent = ch.text;
    charSpan.className = "lyric-char";
    textContainer.appendChild(charSpan);

    // 歌詞アニメーション用にリストへ
    lyricsMap.push({
      el: charSpan,
      startTime: ch.startTime,
      endTime: ch.endTime || ch.startTime + 500,
    });

    prevBar = currentBar;
    prevCharEnd = ch.endTime || ch.startTime;
    prevPhrase = currentPhrase;
  }
}

/* 歌詞アニメーション用のCSSを追加してください（例） */
/*
.lyric-char {
  transition: color 0.2s, text-shadow 0.2s;
}
.active-lyric {
  color: #ffb347 !important;
  text-shadow: 0 0 8px #fff, 0 0 16px #ffb347;
}
.bar-space {
  letter-spacing: 0.5em;
}
*/


