import { useState, useEffect, useRef, useCallback } from "react";

const REFRESH_INTERVAL = 5 * 60 * 1000; // Check for new files every 5 minutes
const PHOTO_DURATION = 8000; // 8 seconds per photo
const VIDEO_MAX_DURATION = 120000; // Max 2 min per video
const TRANSITION_DURATION = 1500;

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"];
const SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];

export default function GoogleDriveSlideshow() {
  const [apiKey, setApiKey] = useState("");
  const [folderId, setFolderId] = useState("");
  const [configured, setConfigured] = useState(false);
  const [files, setFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const hideUITimer = useRef(null);
  const containerRef = useRef(null);

  const currentFile = files[currentIndex] || null;
  const isVideo = currentFile && SUPPORTED_VIDEO_TYPES.some((t) => currentFile.mimeType?.startsWith(t.split("/")[0]));

  const fetchFiles = useCallback(async () => {
    if (!apiKey || !folderId) return;
    try {
      const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
      const fields = encodeURIComponent("files(id,name,mimeType,thumbnailLink,webContentLink,videoMediaMetadata,imageMediaMetadata,createdTime)");
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=createdTime desc&pageSize=1000&key=${apiKey}`;

      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || `API Error: ${res.status}`);
      }
      const data = await res.json();
      const mediaFiles = (data.files || []).filter(
        (f) =>
          SUPPORTED_IMAGE_TYPES.includes(f.mimeType) ||
          SUPPORTED_VIDEO_TYPES.some((t) => f.mimeType?.startsWith(t.split("/")[0]))
      );
      setFiles(mediaFiles);
      setError(null);
      if (mediaFiles.length === 0) {
        setError("No photos or videos found in this folder. Make sure the folder contains image or video files.");
      }
    } catch (err) {
      setError(err.message);
    }
  }, [apiKey, folderId]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (!configured) return;
    setLoading(true);
    fetchFiles().finally(() => setLoading(false));
    const interval = setInterval(fetchFiles, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [configured, fetchFiles]);

  // Advance slideshow
  const goToNext = useCallback(() => {
    if (files.length <= 1) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % files.length);
      setTransitioning(false);
    }, TRANSITION_DURATION);
  }, [files.length]);

  const goToPrev = useCallback(() => {
    if (files.length <= 1) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + files.length) % files.length);
      setTransitioning(false);
    }, TRANSITION_DURATION);
  }, [files.length]);

  // Auto-advance timer
  useEffect(() => {
    if (!configured || files.length === 0 || isPaused) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (isVideo) {
      // For videos, wait for them to end (with a max cap)
      timerRef.current = setTimeout(goToNext, VIDEO_MAX_DURATION);
    } else {
      timerRef.current = setTimeout(goToNext, PHOTO_DURATION);
    }
    return () => clearTimeout(timerRef.current);
  }, [currentIndex, configured, files.length, isVideo, isPaused, goToNext]);

  // Handle video end
  const handleVideoEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    goToNext();
  };

  // Mouse/touch to show controls
  const handleInteraction = () => {
    setShowUI(true);
    if (hideUITimer.current) clearTimeout(hideUITimer.current);
    hideUITimer.current = setTimeout(() => setShowUI(false), 4000);
  };

  // Get display URL for a file
  const getImageUrl = (file) => {
    if (!file) return "";
    return `https://lh3.googleusercontent.com/d/${file.id}=w1920-h1080-rj`;
  };

  const getVideoUrl = (file) => {
    if (!file) return "";
    return `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`;
  };

  const handleConfigure = () => {
    if (!apiKey.trim() || !folderId.trim()) {
      setError("Please enter both API Key and Folder ID");
      return;
    }
    setError(null);
    setConfigured(true);
  };

  const handleReset = () => {
    setConfigured(false);
    setFiles([]);
    setCurrentIndex(0);
    setError(null);
  };

  // ── Setup Screen ──
  if (!configured) {
    return (
      <div style={styles.setupContainer}>
        <div style={styles.setupBg} />
        <div style={styles.setupCard}>
          <div style={styles.logoMark}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="#E8D5B7" />
              <path d="M14 16L24 12L34 16V32L24 36L14 32V16Z" fill="#1A1410" opacity="0.9" />
              <circle cx="24" cy="24" r="5" fill="#E8D5B7" />
              <path d="M21 24L23 26L27 22" stroke="#1A1410" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={styles.setupTitle}>Office Slideshow</h1>
          <p style={styles.setupSubtitle}>
            Connect your Google Drive folder to display photos and videos on your TV
          </p>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Google API Key</label>
            <input
              style={styles.input}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              onKeyDown={(e) => e.key === "Enter" && handleConfigure()}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Drive Folder ID</label>
            <input
              style={styles.input}
              type="text"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="1aBcDeFgHiJkLmNoPqRsT"
              onKeyDown={(e) => e.key === "Enter" && handleConfigure()}
            />
            <p style={styles.hint}>
              The part after /folders/ in your Google Drive URL
            </p>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.startButton} onClick={handleConfigure}>
            Launch Slideshow
          </button>

          <div style={styles.instructions}>
            <p style={styles.instructionTitle}>Quick Setup</p>
            <p style={styles.instructionStep}>
              1. Go to console.cloud.google.com and enable the Drive API
            </p>
            <p style={styles.instructionStep}>
              2. Create an API key under Credentials
            </p>
            <p style={styles.instructionStep}>
              3. Share your Drive folder as "Anyone with the link"
            </p>
            <p style={styles.instructionStep}>
              4. Paste both values above and launch
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading State ──
  if (loading && files.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Fetching your photos...</p>
      </div>
    );
  }

  // ── Error State ──
  if (error && files.length === 0) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorIcon}>⚠</p>
        <p style={styles.errorTitle}>Connection Issue</p>
        <p style={styles.errorMsg}>{error}</p>
        <button style={styles.retryButton} onClick={() => { setLoading(true); fetchFiles().finally(() => setLoading(false)); }}>
          Retry
        </button>
        <button style={{ ...styles.retryButton, background: "transparent", border: "1px solid rgba(255,255,255,0.3)", marginTop: 8 }} onClick={handleReset}>
          Back to Setup
        </button>
      </div>
    );
  }

  // ── Slideshow ──
  return (
    <div
      ref={containerRef}
      style={styles.slideshowContainer}
      onMouseMove={handleInteraction}
      onClick={handleInteraction}
    >
      {/* Current media */}
      <div
        style={{
          ...styles.mediaWrapper,
          opacity: transitioning ? 0 : 1,
          transition: `opacity ${TRANSITION_DURATION}ms ease-in-out`,
        }}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            key={currentFile.id}
            src={getVideoUrl(currentFile)}
            style={styles.media}
            autoPlay
            muted={false}
            onEnded={handleVideoEnd}
            onError={() => goToNext()}
            playsInline
          />
        ) : (
          <img
            key={currentFile?.id}
            src={currentFile ? getImageUrl(currentFile) : ""}
            alt={currentFile?.name || ""}
            style={styles.media}
            onError={() => goToNext()}
          />
        )}
      </div>

      {/* Bottom gradient overlay */}
      <div style={{ ...styles.overlay, opacity: showUI ? 1 : 0 }}>
        <div style={styles.controls}>
          <button style={styles.controlBtn} onClick={goToPrev}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>

          <button style={styles.controlBtn} onClick={() => setIsPaused(!isPaused)}>
            {isPaused ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </button>

          <button style={styles.controlBtn} onClick={goToNext}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>
        </div>

        <div style={styles.infoBar}>
          <span style={styles.fileName}>{currentFile?.name}</span>
          <span style={styles.counter}>
            {currentIndex + 1} / {files.length}
          </span>
        </div>

        <button style={styles.settingsBtn} onClick={handleReset}>
          ✕ Settings
        </button>
      </div>

      {/* Progress dots */}
      {files.length > 1 && files.length <= 30 && (
        <div style={{ ...styles.dots, opacity: showUI ? 1 : 0 }}>
          {files.map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                background: i === currentIndex ? "#fff" : "rgba(255,255,255,0.35)",
                width: i === currentIndex ? 18 : 6,
                borderRadius: 3,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Styles ──
const styles = {
  // Setup
  setupContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
    background: "#0D0B08",
  },
  setupBg: {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(ellipse at 30% 20%, rgba(180,140,80,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(120,90,50,0.06) 0%, transparent 50%)",
  },
  setupCard: {
    position: "relative",
    background: "rgba(26, 22, 16, 0.9)",
    border: "1px solid rgba(200,170,110,0.15)",
    borderRadius: 20,
    padding: "48px 40px",
    maxWidth: 440,
    width: "100%",
    margin: "0 20px",
    backdropFilter: "blur(20px)",
  },
  logoMark: {
    marginBottom: 24,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#F5EDE0",
    margin: "0 0 8px 0",
    letterSpacing: "-0.02em",
  },
  setupSubtitle: {
    fontSize: 14,
    color: "rgba(245,237,224,0.5)",
    margin: "0 0 32px 0",
    lineHeight: 1.5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(232,213,183,0.7)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    fontSize: 14,
    background: "rgba(245,237,224,0.06)",
    border: "1px solid rgba(200,170,110,0.2)",
    borderRadius: 10,
    color: "#F5EDE0",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
    fontFamily: "'DM Mono', monospace",
  },
  hint: {
    fontSize: 11,
    color: "rgba(245,237,224,0.35)",
    marginTop: 4,
  },
  error: {
    color: "#E8A087",
    fontSize: 13,
    marginBottom: 16,
    padding: "10px 14px",
    background: "rgba(232,160,135,0.08)",
    borderRadius: 8,
    border: "1px solid rgba(232,160,135,0.15)",
  },
  startButton: {
    width: "100%",
    padding: "14px",
    fontSize: 15,
    fontWeight: 600,
    background: "linear-gradient(135deg, #C4A265, #A8863E)",
    color: "#0D0B08",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    letterSpacing: "0.01em",
    marginTop: 8,
  },
  instructions: {
    marginTop: 28,
    paddingTop: 24,
    borderTop: "1px solid rgba(200,170,110,0.1)",
  },
  instructionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(232,213,183,0.5)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 12,
  },
  instructionStep: {
    fontSize: 13,
    color: "rgba(245,237,224,0.4)",
    lineHeight: 1.7,
    margin: 0,
  },

  // Loading
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#0D0B08",
    fontFamily: "'DM Sans', sans-serif",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "3px solid rgba(200,170,110,0.15)",
    borderTop: "3px solid #C4A265",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    marginTop: 20,
    color: "rgba(245,237,224,0.5)",
    fontSize: 14,
  },

  // Error
  errorContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#0D0B08",
    fontFamily: "'DM Sans', sans-serif",
    padding: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  errorTitle: {
    color: "#F5EDE0",
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 8,
  },
  errorMsg: {
    color: "rgba(245,237,224,0.5)",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 400,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  retryButton: {
    padding: "12px 32px",
    fontSize: 14,
    fontWeight: 600,
    background: "linear-gradient(135deg, #C4A265, #A8863E)",
    color: "#0D0B08",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
  },

  // Slideshow
  slideshowContainer: {
    position: "fixed",
    inset: 0,
    background: "#000",
    overflow: "hidden",
    cursor: "none",
    fontFamily: "'DM Sans', sans-serif",
  },
  mediaWrapper: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  media: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    background: "#000",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
    padding: "60px 32px 24px",
    transition: "opacity 0.4s ease",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 16,
  },
  controlBtn: {
    background: "rgba(255,255,255,0.12)",
    border: "none",
    borderRadius: "50%",
    width: 48,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background 0.2s",
    backdropFilter: "blur(8px)",
  },
  infoBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fileName: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    maxWidth: "70%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  counter: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontFamily: "'DM Mono', monospace",
  },
  settingsBtn: {
    position: "absolute",
    top: 16,
    right: 32,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 8,
    padding: "6px 14px",
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    cursor: "pointer",
    backdropFilter: "blur(8px)",
  },
  dots: {
    position: "absolute",
    bottom: 12,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 4,
    transition: "opacity 0.4s ease",
  },
  dot: {
    height: 6,
    transition: "all 0.3s ease",
  },
};