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
  const [pitchData, setPitchData] = useState([]); // 音程データを保存

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
        
        // 音程データを取得
        if (player.video.pitches && player.video.pitches.length > 0) {
          console.log('音程データが取得されました:', player.video.pitches.length, '個のデータポイント');
          console.log('最初の3つの音程データ:', player.video.pitches.slice(0, 3));
          setPitchData(player.video.pitches);
        } else {
          console.log('音程データが見つかりませんでした。ダミーデータを生成します。');
          // ダミーの音程データを生成（テスト用）
          const dummyPitches = [];
          for (let i = 0; i < player.video.duration; i += 500) {
            dummyPitches.push({
              startTime: i,
              hz: 200 + Math.sin(i / 1000) * 100 + Math.random() * 50
            });
          }
          setPitchData(dummyPitches);
        }
        
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
        setShouldResumeAfterSeek(false); // 一時停止時は自動再生フラグをクリア
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
      setShouldResumeAfterSeek(false); // 手動一時停止時も自動再生フラグをクリア
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

  // 音程データから指定時間の音程を取得
  const getPitchAtTime = (time) => {
    if (!pitchData || pitchData.length === 0) {
      console.log('音程データがありません。pitchData:', pitchData);
      return 0;
    }
    
    // 指定時間に最も近い音程データを検索
    let closestPitch = null;
    let minDistance = Infinity;
    
    for (let pitch of pitchData) {
      const distance = Math.abs(pitch.startTime - time);
      if (distance < minDistance) {
        minDistance = distance;
        closestPitch = pitch;
      }
    }
    
    const result = closestPitch ? closestPitch.hz : 0;
    if (result > 0) {
      console.log(`時間 ${time}ms での音程: ${result}Hz (距離: ${minDistance}ms)`);
    } else {
      console.log(`時間 ${time}ms で音程データが見つかりませんでした`);
    }
    return result;
  };

  // 音程を0-100%の高さに正規化（70Hz-700Hzの範囲を想定）
  const normalizePitch = (hz) => {
    if (hz === 0) return 0;
    const minHz = 70; // 下に0.5オクターブ拡張（約100Hz → 70Hz）
    const maxHz = 700; // 上に0.5オクターブ拡張（約500Hz → 700Hz）
    const normalizedHz = Math.max(minHz, Math.min(maxHz, hz));
    const result = ((normalizedHz - minHz) / (maxHz - minHz)) * 100;
    console.log(`音程正規化: ${hz}Hz -> ${result}%`);
    return result;
  };

  // 音程（Hz）を音階名に変換
  const hzToNoteName = (hz) => {
    if (hz === 0) return '';
    
    // A4 = 440Hz を基準とする
    const A4 = 440;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // 半音の数を計算（A4から何半音離れているか）
    const semitones = Math.round(12 * Math.log2(hz / A4));
    
    // オクターブを計算
    const octave = 4 + Math.floor(semitones / 12);
    
    // 音名のインデックスを計算（Aが9番目なので調整）
    const noteIndex = (9 + semitones) % 12;
    const adjustedIndex = noteIndex < 0 ? noteIndex + 12 : noteIndex;
    
    return `${noteNames[adjustedIndex]}${octave}`;
  };

  // 現在発声中の音階を取得
  const getCurrentNote = () => {
    if (!currentPhrase) return '';
    
    const activeChar = currentPhrase.chars.find(char => char.isActive);
    if (!activeChar) return '';
    
    const pitch = getPitchAtTime(activeChar.startTime);
    return hzToNoteName(pitch);
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
            {/* 曲名・アーティスト名表示 - エリア左上に配置 */}
            <div className="song-info">
              <span className="song-title">♪First Note</span>
              <span className="artist-name">Artist : blues</span>
            </div>
            {/* 音階表示 - エリア右下に配置 */}
            <div className="current-note">
              {getCurrentNote()}
            </div>
            {currentPhrase ? (
              <div className="current-phrase">
                {currentPhrase.chars.map((char, i) => {
                  const pitch = getPitchAtTime(char.startTime);
                  const pitchHeight = normalizePitch(pitch);
                  // 音程バーの上端位置を計算（音程が高いほど上に配置）
                  // 全体的に上に移動するためのオフセットを追加
                  const verticalOffset = 20; // 上に移動するオフセット（%）
                  const barTop = Math.max(0, 100 - pitchHeight - verticalOffset); // 下限を0%に制限
                  const barHeight = 20; // 音程バーの固定の高さ（%）
                  
                  return (
                    <span
                      key={i}
                      className={`char ${char.isActive ? 'active' : ''} ${char.isSung ? 'sung' : ''}`}
                    >
                      {/* 音程の棒グラフ背景 */}
                      <span 
                        className={`pitch-bar ${char.isActive ? 'active' : ''}`}
                        style={{
                          top: `${barTop}%`, // 上端の位置を音程に応じて設定
                          height: `${barHeight}%`, // 固定の高さを設定
                        }}
                      />
                      {char.text}
                    </span>
                  );
                })}
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
          </div>

          {/* 再生コントロールと時間表示 */}
          <div className="controls-container">
            <span className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
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
