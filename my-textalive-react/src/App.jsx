import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { Player } from 'textalive-app-api';
import skip from './assets/10sSkip.PNG';
import rewind from './assets/10sBack.PNG';

function App() {
  const playerRef = useRef(null);
  const phraseItemsRef = useRef(null);
  const [currentPhrase, setCurrentPhrase] = useState(null);
  const [ready, setReady] = useState(false);
  const [phrases, setPhrases] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(-1);
  const [shouldResumeAfterSeek, setShouldResumeAfterSeek] = useState(false);
  const [hoverTime, setHoverTime] = useState(null); // ホバー時間
  const [hoverPosition, setHoverPosition] = useState({ x: 0, visible: false }); // ホバー位置

  // 現在のフレーズが変わったときに自動スクロール
  useEffect(() => {
    if (currentPhraseIndex >= 0 && phraseItemsRef.current) {
      const activeElement = phraseItemsRef.current.children[currentPhraseIndex];
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [currentPhraseIndex]);

  // Playerの初期化は一度だけ実行
  useEffect(() => {
    const player = new Player({
      app: { token: 't5B5hIkPze5IA5nh' },
    });

    playerRef.current = player;

    player.addListener({
      onAppReady: () => {
        player.createFromSongUrl("https://piapro.jp/t/FDb1/20210213190029", {
          video: {
            // 音楽地図訂正履歴: https://songle.jp/songs/2121525/history
            beatId: 3953882,
            repetitiveSegmentId: 2099561,
            // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FFDb1%2F20210213190029
            lyricId: 52065,
            lyricDiffId: 5093,
          },
        });
      },

      onVideoReady: () => {
        setReady(true);
        setDuration(player.video.duration);
        // フレーズリストを作成
        const phraseList = player.video.phrases.map((phrase, index) => ({
          id: index,
          text: phrase.children.map(char => char.text).join(''),
          startTime: phrase.children[0].startTime,
          endTime: phrase.children[phrase.children.length - 1].endTime || 
                  phrase.children[phrase.children.length - 1].startTime + 500
        }));
        setPhrases(phraseList);
      },

      onPlay: () => {
        setIsPlaying(true);
        setShouldResumeAfterSeek(false); // 再生開始時にフラグをリセット
      },

      onPause: () => {
        setIsPlaying(false);
      },

      onStop: () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setCurrentPhraseIndex(-1);
        setShouldResumeAfterSeek(false);
        // 停止時は先頭にスクロール
        if (phraseItemsRef.current) {
          phraseItemsRef.current.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
      },

      onTimeUpdate: (position) => {
        if (!isDragging) {
          setCurrentTime(position);
        }
        
        // シーク後の自動再生処理
        if (shouldResumeAfterSeek && !isPlaying) {
          setShouldResumeAfterSeek(false);
          setTimeout(() => {
            if (playerRef.current) {
              playerRef.current.requestPlay();
            }
          }, 100);
        }
        
        if (player.video && player.video.phrases) {
          // 現在再生中のフレーズを検索
          const activePhraseIndex = player.video.phrases.findIndex(phrase => {
            const firstChar = phrase.children[0];
            const lastChar = phrase.children[phrase.children.length - 1];
            return position >= firstChar.startTime && 
                   position < (lastChar.endTime || lastChar.startTime + 500);
          });

          // フレーズが変わった場合のみ更新（無駄なスクロールを防ぐ）
          if (activePhraseIndex !== currentPhraseIndex) {
            setCurrentPhraseIndex(activePhraseIndex);
          }

          if (activePhraseIndex !== -1) {
            const activePhrase = player.video.phrases[activePhraseIndex];
            // フレーズ内の文字をマッピング
            const phraseData = {
              text: activePhrase.children.map(char => char.text).join(''),
              chars: activePhrase.children.map(char => ({
                text: char.text,
                startTime: char.startTime,
                endTime: char.endTime || char.startTime + 500,
                isActive: position >= char.startTime && position < (char.endTime || char.startTime + 500),
                isSung: position >= (char.endTime || char.startTime + 500)
              }))
            };
            setCurrentPhrase(phraseData);
          } else {
            setCurrentPhrase(null);
          }
        }
      },
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, []); // 依存配列を空にして、初期化は一度だけ実行

  // シーク後の再生処理用のuseEffect（分離）
  useEffect(() => {
    if (shouldResumeAfterSeek && !isPlaying && ready) {
      const timer = setTimeout(() => {
        if (playerRef.current && shouldResumeAfterSeek) {
          playerRef.current.requestPlay();
          setShouldResumeAfterSeek(false);
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [shouldResumeAfterSeek, isPlaying, ready]);

  const handlePlay = () => {
    if (playerRef.current) {
      playerRef.current.requestPlay();
    }
  };

  const handlePause = () => {
    if (playerRef.current) {
      playerRef.current.requestPause();
    }
  };

  const handleStop = () => {
    if (playerRef.current) {
      playerRef.current.requestStop();
    }
  };

  const handleRewind = () => {
    if (playerRef.current && playerRef.current.video) {
      const wasPlaying = isPlaying;
      const currentTime = playerRef.current.timer.position;
      const newTime = Math.max(0, currentTime - 10000);
      
      if (wasPlaying) {
        setShouldResumeAfterSeek(true);
      }
      
      playerRef.current.requestMediaSeek(newTime);
    }
  };

  const handleFastForward = () => {
    if (playerRef.current && playerRef.current.video) {
      const wasPlaying = isPlaying;
      const currentTime = playerRef.current.timer.position;
      const duration = playerRef.current.video.duration;
      const newTime = Math.min(duration, currentTime + 10000);
      
      if (wasPlaying) {
        setShouldResumeAfterSeek(true);
      }
      
      playerRef.current.requestMediaSeek(newTime);
    }
  };

  // 頭出し機能：指定したフレーズの開始時間にシーク
  const jumpToPhrase = (phraseStartTime) => {
    if (playerRef.current) {
      const wasPlaying = isPlaying;
      
      // 再生中だった場合は、シーク後に再生を再開するフラグを設定
      if (wasPlaying) {
        setShouldResumeAfterSeek(true);
      }
      
      playerRef.current.requestMediaSeek(phraseStartTime);
    }
  };

  const handleSeekBarChange = (e) => {
    const wasPlaying = isPlaying;
    const seekBar = e.target;
    const rect = seekBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(duration, percent * duration));
    
    setCurrentTime(newTime);
    
    if (wasPlaying) {
      setShouldResumeAfterSeek(true);
    }
    
    if (playerRef.current) {
      playerRef.current.requestMediaSeek(newTime);
    }
  };

  // シークバーのホバー処理
  const handleSeekBarMouseMove = (e) => {
    const seekBar = e.currentTarget;
    const rect = seekBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = Math.max(0, Math.min(duration, percent * duration));
    
    setHoverTime(time);
    setHoverPosition({
      x: e.clientX - rect.left,
      visible: true
    });
  };

  const handleSeekBarMouseEnter = () => {
    setHoverPosition(prev => ({ ...prev, visible: true }));
  };

  const handleSeekBarMouseLeave = () => {
    setHoverPosition(prev => ({ ...prev, visible: false }));
    setHoverTime(null);
  };

  const handleSeekBarMouseDown = () => {
    setIsDragging(true);
  };

  const handleSeekBarMouseUp = () => {
    setIsDragging(false);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="app">
      <div className="main-content">
        {/* 動画エリア（上部 5/6） */}
        <div className="video-area">
          {/* 歌詞表示スペース（全体） */}
          <div className="lyrics-container">
            {currentPhrase ? (
              <div className="current-phrase">
                {currentPhrase.chars.map((char, i) => (
                  <span
                    key={i}
                    className={`char ${char.isActive ? 'active' : ''} ${char.isSung ? 'sung' : ''}`}
                  >
                    {char.text}
                  </span>
                ))}
              </div>
            ) : (
              <div className="no-lyrics">
                {ready ? '・・・♪・・・' : '楽曲を読み込み中...'}
              </div>
            )}
          </div>
        </div>

        {/* 楽曲進行エリア（下部 1/6） - シークバー + 再生コントロール */}
        <div className="progress-area">
          {/* シークバー */}
          <div className="seekbar-container">
            <span className="time-display current-time">{formatTime(currentTime)}</span>
            <div className="seekbar-wrapper">
              <div 
                className="seekbar"
                onClick={handleSeekBarChange}
                onMouseMove={handleSeekBarMouseMove}
                onMouseEnter={handleSeekBarMouseEnter}
                onMouseLeave={handleSeekBarMouseLeave}
                onMouseDown={handleSeekBarMouseDown}
                onMouseUp={handleSeekBarMouseUp}
              >
                <div className="seekbar-track">
                  <div 
                    className="seekbar-progress" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                  <div 
                    className="seekbar-thumb" 
                    style={{ left: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
              
              {/* ホバー時間表示 */}
              {hoverPosition.visible && hoverTime !== null && (
                <div 
                  className="hover-time-tooltip"
                  style={{ 
                    left: `${hoverPosition.x}px`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>
            <span className="time-display duration-time">{formatTime(duration)}</span>
          </div>

          {/* 再生コントロールと時間表示 */}
          <div className="controls-container">
            <div className="time-info">
              <span className="time-text">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <div className="controls">
              <button 
                className="control-button rewind" 
                onClick={handleRewind} 
                disabled={!ready}
                title="10秒戻し"
              >
                <img src={skip} alt="10秒戻し" className="control-icon" />
              </button>
              <button 
                className="control-button play" 
                onClick={isPlaying ? handlePause : handlePlay} 
                disabled={!ready}
                title={isPlaying ? "一時停止" : "再生"}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button 
                className="control-button fast-forward" 
                onClick={handleFastForward} 
                disabled={!ready}
                title="10秒送り"
              >
                <img src={rewind} alt="10秒送り" className="control-icon" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 歌詞ナビゲーション（右側固定） */}
      <div className="phrase-navigation">
        <h3>歌詞ナビゲーション</h3>
        <div className="phrase-items" ref={phraseItemsRef}>
          {phrases.map((phrase) => (
            <div
              key={phrase.id}
              className={`phrase-item ${currentPhraseIndex === phrase.id ? 'active' : ''}`}
              onClick={() => jumpToPhrase(phrase.startTime)}
            >
              <span className="phrase-text">{phrase.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
