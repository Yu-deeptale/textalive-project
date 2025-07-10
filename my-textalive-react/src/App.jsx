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
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, visible: false });

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
            beatId: 3953882,
            repetitiveSegmentId: 2099561,
            lyricId: 52065,
            lyricDiffId: 5093,
          },
        });
      },

      onVideoReady: () => {
        setReady(true);
        setDuration(player.video.duration);
        
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
        setShouldResumeAfterSeek(false);
      },

      onPause: () => {
        setIsPlaying(false);
      },

      onStop: () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setCurrentPhraseIndex(-1);
        setShouldResumeAfterSeek(false);
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
        
        if (shouldResumeAfterSeek && !isPlaying) {
          setShouldResumeAfterSeek(false);
          setTimeout(() => {
            if (playerRef.current) {
              playerRef.current.requestPlay();
            }
          }, 100);
        }
        
        if (player.video && player.video.phrases) {
          const activePhraseIndex = player.video.phrases.findIndex(phrase => {
            const firstChar = phrase.children[0];
            const lastChar = phrase.children[phrase.children.length - 1];
            return position >= firstChar.startTime && 
                   position < (lastChar.endTime || lastChar.startTime + 500);
          });

          if (activePhraseIndex !== currentPhraseIndex) {
            setCurrentPhraseIndex(activePhraseIndex);
          }

          if (activePhraseIndex !== -1) {
            const activePhrase = player.video.phrases[activePhraseIndex];
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
  }, []);

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

  // フレーズ情報を更新するヘルパー関数
  const updatePhraseForTime = (time) => {
    if (playerRef.current.video && playerRef.current.video.phrases) {
      const activePhraseIndex = playerRef.current.video.phrases.findIndex(phrase => {
        const firstChar = phrase.children[0];
        const lastChar = phrase.children[phrase.children.length - 1];
        return time >= firstChar.startTime && 
               time < (lastChar.endTime || lastChar.startTime + 500);
      });

      setCurrentPhraseIndex(activePhraseIndex);

      if (activePhraseIndex !== -1) {
        const activePhrase = playerRef.current.video.phrases[activePhraseIndex];
        const phraseData = {
          text: activePhrase.children.map(char => char.text).join(''),
          chars: activePhrase.children.map(char => ({
            text: char.text,
            startTime: char.startTime,
            endTime: char.endTime || char.startTime + 500,
            isActive: time >= char.startTime && time < (char.endTime || char.startTime + 500),
            isSung: time >= (char.endTime || char.startTime + 500)
          }))
        };
        setCurrentPhrase(phraseData);
      } else {
        setCurrentPhrase(null);
      }
    }
  };

  const handleRewind = () => {
    if (playerRef.current && playerRef.current.video) {
      const wasPlaying = isPlaying;
      const currentPos = isPlaying ? playerRef.current.timer.position : currentTime;
      const newTime = Math.max(0, currentPos - 10000);
      
      setCurrentTime(newTime);
      
      if (!isPlaying) {
        updatePhraseForTime(newTime);
      }
      
      if (wasPlaying) {
        setShouldResumeAfterSeek(true);
      }
      
      playerRef.current.requestMediaSeek(newTime);
    }
  };

  const handleFastForward = () => {
    if (playerRef.current && playerRef.current.video) {
      const wasPlaying = isPlaying;
      const currentPos = isPlaying ? playerRef.current.timer.position : currentTime;
      const duration = playerRef.current.video.duration;
      const newTime = Math.min(duration, currentPos + 10000);
      
      setCurrentTime(newTime);
      
      if (!isPlaying) {
        updatePhraseForTime(newTime);
      }
      
      if (wasPlaying) {
        setShouldResumeAfterSeek(true);
      }
      
      playerRef.current.requestMediaSeek(newTime);
    }
  };

  const jumpToPhrase = (phraseStartTime) => {
    if (playerRef.current) {
      const wasPlaying = isPlaying;
      
      setCurrentTime(phraseStartTime);
      
      if (!isPlaying) {
        updatePhraseForTime(phraseStartTime);
      }
      
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
            <div className="controls">
              <button 
                className="control-button rewind" 
                onMouseDown={(e) => {
                  e.preventDefault();
                  document.activeElement?.blur();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRewind();
                }} 
                disabled={!ready}
                title="10秒戻し"
                tabIndex={-1}
              >
                <img src={rewind} alt="10秒戻し" className="control-icon" />
              </button>
              <button 
                className="control-button play" 
                onMouseDown={(e) => {
                  e.preventDefault();
                  document.activeElement?.blur();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Play/Pause button clicked, isPlaying:', isPlaying, 'ready:', ready);
                  if (isPlaying) {
                    handlePause();
                  } else {
                    handlePlay();
                  }
                }} 
                disabled={!ready}
                title={isPlaying ? "一時停止" : "再生"}
                tabIndex={-1}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button 
                className="control-button fast-forward" 
                onMouseDown={(e) => {
                  e.preventDefault();
                  document.activeElement?.blur();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFastForward();
                }} 
                disabled={!ready}
                title="10秒送り"
                tabIndex={-1}
              >
                <img src={skip} alt="10秒送り" className="control-icon" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* フレーズリスト（右側固定） */}
      <div className="phrase-navigation">
        <h3>フレーズリスト</h3>
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
