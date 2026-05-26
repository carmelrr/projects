package com.anime.streamer.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

enum class SourceType { DRIVE, MEGA, DIRECT }

@Serializable
data class Episode(
    val id: String,
    val season: Int,
    val number: Int,
    val title: String,
    @SerialName("titleHe") val titleHe: String? = null,
    val arc: String? = null,
    val sourceUrl: String,
    val sourceType: SourceType,
    val introStartMs: Long? = null,
    val introEndMs: Long? = null,
    val creditsStartMs: Long? = null,
    val durationMs: Long? = null,
    val thumbnailUrl: String? = null,
    val postUrl: String? = null,
)

@Serializable
data class EpisodesCatalog(
    val version: Int = 1,
    val updatedAt: Long = 0,
    val defaults: CatalogDefaults = CatalogDefaults(),
    val episodes: List<Episode> = emptyList(),
)

@Serializable
data class CatalogDefaults(
    val introStartMs: Long? = null,
    val introEndMs: Long? = null,
    val creditsStartMs: Long? = null,
)
