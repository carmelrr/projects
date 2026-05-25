package com.anime.streamer.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [WatchStateEntity::class, EpisodeEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun watchStateDao(): WatchStateDao
    abstract fun episodeDao(): EpisodeDao
}
