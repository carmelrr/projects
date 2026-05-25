package com.anime.streamer.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "watch_state")
data class WatchStateEntity(
    @PrimaryKey val episodeId: String,
    val positionMs: Long,
    val durationMs: Long,
    val watched: Boolean,
    val updatedAt: Long,
)

@Entity(tableName = "episodes")
data class EpisodeEntity(
    @PrimaryKey val id: String,
    val season: Int,
    val number: Int,
    val title: String,
    val titleHe: String?,
    val arc: String?,
    val sourceUrl: String,
    val sourceType: String,
    val introStartMs: Long?,
    val introEndMs: Long?,
    val creditsStartMs: Long?,
    val durationMs: Long?,
    val thumbnailUrl: String?,
)
