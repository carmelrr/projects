package com.anime.streamer.player

import android.content.Intent
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

/**
 * Foreground MediaSession service so playback can continue with notification controls
 * (background audio + Android Auto / Now Playing on Android TV).
 *
 * NOTE: Wiring the in-Activity ExoPlayer with this session is intentionally minimal at this stage —
 * it provides a session endpoint so the manifest entry is valid. A future iteration will connect
 * the active player via MediaController for hand-off between Activity and Service.
 */
class PlaybackService : MediaSessionService() {

    private var mediaSession: MediaSession? = null

    override fun onCreate() {
        super.onCreate()
        val player = ExoPlayer.Builder(this).build()
        mediaSession = MediaSession.Builder(this, player).build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = mediaSession

    override fun onTaskRemoved(rootIntent: Intent?) {
        mediaSession?.player?.let { if (!it.playWhenReady) stopSelf() }
    }

    override fun onDestroy() {
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }
}
