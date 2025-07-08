import { useEffect, useRef, useState } from 'react';
import './App.css';
import { Player } from 'textalive-app-api';

function App() {
  const playerRef = useRef(null);
  const [lyrics, setLyrics] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [ready, setReady] = useState(false); // 再生準備完了フラグ

  useEffect(() => {
    const player = new Player({
      app: { token: 't5B5hIkPze5IA5nh' },
    });

    playerRef.current = player; // グローバル参照用に保存

    let chars = [];

    player.addListener({
      onAppReady: () => {
        player.createFromSongUrl(
          'http://piapro.jp/t/ULcJ'
        );
      },

      onVideoReady: () => {
            chars = player.video.getCharRange(0, player.video.duration);
            setLyrics(chars.map((c) => c.text));
            setReady(true); // 再生可能状態に
        },

      onTimeUpdate: (position) => {
        const c = player.video.findChar(position);
        if (c) {
          const i = chars.indexOf(c);
          setCurrentIndex(i);
        }
      },
    });
  }, []);

  const handlePlay = () => {
    if (playerRef.current) {
      playerRef.current.requestPlay();
    }
  };

  return (
    <div>
      <h1>TextAlive React App</h1>
      <p>アプリが読み込まれました</p>
      <button onClick={handlePlay} disabled={!ready} style={{ marginBottom: '1em' }}>
         ▶ 再生
      </button>

      <div className="lyrics">
        {lyrics.map((char, i) => (
          <span
            key={i}
            className={i === currentIndex ? 'char active' : 'char'}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}

export default App;
