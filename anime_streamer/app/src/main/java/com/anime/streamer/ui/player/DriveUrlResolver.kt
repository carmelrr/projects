package com.anime.streamer.ui.player

import com.anime.streamer.data.model.SourceType

/**
 * Converts onepiece-nakama.com / Google Drive share links into a direct stream URL playable by ExoPlayer.
 * For very large Drive files, Drive may serve an interstitial HTML page. If playback fails, fall back to WebView.
 */
object DriveUrlResolver {
    private val DRIVE_FILE_ID = Regex("""drive\.google\.com/file/d/([^/]+)""")
    private val DRIVE_OPEN_ID = Regex("""drive\.google\.com/open\?id=([^&]+)""")
    private val DRIVE_UC_ID = Regex("""drive\.google\.com/uc\?[^"]*?id=([^&]+)""")

    fun resolve(sourceType: SourceType, rawUrl: String): String {
        if (sourceType != SourceType.DRIVE) return rawUrl
        val id = extractId(rawUrl) ?: return rawUrl
        return "https://drive.google.com/uc?export=download&id=$id"
    }

    /** Drive embed/preview URL — plays inside a WebView using Drive's native HTML5 player. */
    fun previewUrl(sourceType: SourceType, rawUrl: String): String? {
        if (sourceType != SourceType.DRIVE) return null
        val id = extractId(rawUrl) ?: return null
        return "https://drive.google.com/file/d/$id/preview"
    }

    private fun extractId(url: String): String? {
        DRIVE_FILE_ID.find(url)?.let { return it.groupValues[1] }
        DRIVE_OPEN_ID.find(url)?.let { return it.groupValues[1] }
        DRIVE_UC_ID.find(url)?.let { return it.groupValues[1] }
        return null
    }
}
