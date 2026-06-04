package com.anime.streamer.ui.player

import com.anime.streamer.data.model.SourceType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DriveUrlResolverTest {

    // ── previewUrl ────────────────────────────────────────────────────────────

    @Test
    fun `previewUrl extracts id from share link`() {
        val url = "https://drive.google.com/file/d/1yEbXh5Ak1fWA60EbbibOgtdrsl0_5VBG/view?usp=sharing"
        assertEquals(
            "https://drive.google.com/file/d/1yEbXh5Ak1fWA60EbbibOgtdrsl0_5VBG/preview",
            DriveUrlResolver.previewUrl(SourceType.DRIVE, url)
        )
    }

    @Test
    fun `previewUrl extracts id from bare view link`() {
        val url = "https://drive.google.com/file/d/1FlewiMpqnDWMAVSe4rxaEibo_gvAeVE8/view"
        assertEquals(
            "https://drive.google.com/file/d/1FlewiMpqnDWMAVSe4rxaEibo_gvAeVE8/preview",
            DriveUrlResolver.previewUrl(SourceType.DRIVE, url)
        )
    }

    @Test
    fun `previewUrl returns null for folder URL`() {
        val url = "https://drive.google.com/drive/folders/1jssZGlzCK05nvYN8LsF0eLEjuHjbviJ8?usp=sharing"
        assertNull(DriveUrlResolver.previewUrl(SourceType.DRIVE, url))
    }

    @Test
    fun `previewUrl returns null for non-DRIVE source`() {
        val url = "https://mega.nz/file/abc#key"
        assertNull(DriveUrlResolver.previewUrl(SourceType.MEGA, url))
    }

    @Test
    fun `previewUrl extracts id from open link`() {
        val url = "https://drive.google.com/open?id=1yEbXh5Ak1fWA60EbbibOgtdrsl0_5VBG"
        assertEquals(
            "https://drive.google.com/file/d/1yEbXh5Ak1fWA60EbbibOgtdrsl0_5VBG/preview",
            DriveUrlResolver.previewUrl(SourceType.DRIVE, url)
        )
    }

    @Test
    fun `previewUrl extracts id from uc?id= link`() {
        val url = "https://drive.google.com/uc?export=download&id=1yEbXh5Ak1fWA60EbbibOgtdrsl0_5VBG"
        assertEquals(
            "https://drive.google.com/file/d/1yEbXh5Ak1fWA60EbbibOgtdrsl0_5VBG/preview",
            DriveUrlResolver.previewUrl(SourceType.DRIVE, url)
        )
    }

    // ── resolve ───────────────────────────────────────────────────────────────

    @Test
    fun `resolve builds download URL from file share link`() {
        val url = "https://drive.google.com/file/d/1yEbXh5Ak1fWA60EbbibOgtdrsl0_5VBG/view?usp=sharing"
        assertEquals(
            "https://drive.google.com/uc?export=download&id=1yEbXh5Ak1fWA60EbbibOgtdrsl0_5VBG",
            DriveUrlResolver.resolve(SourceType.DRIVE, url)
        )
    }

    @Test
    fun `resolve returns raw url for non-DRIVE source`() {
        val url = "https://mega.nz/file/abc#key"
        assertEquals(url, DriveUrlResolver.resolve(SourceType.MEGA, url))
    }

    @Test
    fun `resolve returns raw url when id cannot be extracted`() {
        val url = "https://drive.google.com/drive/folders/someFolder"
        assertEquals(url, DriveUrlResolver.resolve(SourceType.DRIVE, url))
    }
}
