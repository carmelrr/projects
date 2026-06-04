package com.anime.streamer.data

import com.anime.streamer.data.model.EpisodesCatalog
import com.anime.streamer.data.model.SourceType
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.File

class EpisodesCatalogTest {

    private lateinit var catalog: EpisodesCatalog

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    @Before
    fun load() {
        val file = File("src/main/assets/episodes.json")
        catalog = json.decodeFromString(file.readText())
    }

    @Test
    fun `catalog has episodes`() {
        assertTrue("Expected at least 1 episode", catalog.episodes.isNotEmpty())
    }

    @Test
    fun `no episode has old MEGA hash-bang format`() {
        val broken = catalog.episodes.filter { ep ->
            ep.sourceUrl.contains("mega.nz/#!") ||
                ep.fallbackMegaUrl?.contains("mega.nz/#!") == true
        }
        assertEquals(
            "Episodes with old mega.nz/#! format: ${broken.map { it.id }}",
            0, broken.size
        )
    }

    @Test
    fun `no episode has incomplete MEGA URL without key`() {
        val noKey = catalog.episodes.filter { ep ->
            listOfNotNull(ep.sourceUrl, ep.fallbackMegaUrl).any { url ->
                url.contains("mega.nz/file/") && !url.contains("#")
            }
        }
        assertEquals(
            "Episodes with keyless MEGA URL: ${noKey.map { it.id }}",
            0, noKey.size
        )
    }

    @Test
    fun `no episode has drive-folders URL without a fallback`() {
        val broken = catalog.episodes.filter { ep ->
            ep.sourceType == SourceType.DRIVE &&
                ep.sourceUrl.contains("drive/folders") &&
                ep.fallbackMegaUrl == null
        }
        assertEquals(
            "Drive-folder episodes without fallback: ${broken.map { it.id }}",
            0, broken.size
        )
    }

    @Test
    fun `every episode has a non-blank title`() {
        val noTitle = catalog.episodes.filter { it.title.isBlank() }
        assertEquals(
            "Episodes with blank title: ${noTitle.map { it.id }}",
            0, noTitle.size
        )
    }

    @Test
    fun `no title contains mojibake marker`() {
        val garbled = catalog.episodes.filter { '×' in it.title }
        assertEquals(
            "Episodes with garbled (×) in title: ${garbled.map { it.id }}",
            0, garbled.size
        )
    }

    @Test
    fun `defaults intro start is 50 seconds`() {
        assertEquals(50_000L, catalog.defaults.introStartMs)
    }

    @Test
    fun `op-e1021 has fallback mega url`() {
        val ep = catalog.episodes.first { it.id == "op-e1021" }
        assertNotNull("op-e1021 should have fallbackMegaUrl", ep.fallbackMegaUrl)
        assertTrue(ep.fallbackMegaUrl!!.startsWith("https://mega.nz/file/"))
    }
}
