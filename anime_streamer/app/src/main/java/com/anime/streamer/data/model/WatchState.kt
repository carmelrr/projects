package com.anime.streamer.data.model

data class WatchState(
    val episodeId: String,
    val positionMs: Long,
    val durationMs: Long,
    val watched: Boolean,
    val updatedAt: Long,
)
