package com.anime.streamer.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface WatchStateDao {
    @Query("SELECT * FROM watch_state WHERE episodeId = :id")
    suspend fun get(id: String): WatchStateEntity?

    @Query("SELECT * FROM watch_state WHERE episodeId = :id")
    fun observe(id: String): Flow<WatchStateEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(state: WatchStateEntity)

    @Query("SELECT * FROM watch_state WHERE watched = 0 ORDER BY updatedAt DESC LIMIT :limit")
    fun observeContinueWatching(limit: Int = 20): Flow<List<WatchStateEntity>>

    @Query("SELECT * FROM watch_state")
    fun observeAll(): Flow<List<WatchStateEntity>>
}

@Dao
interface EpisodeDao {
    @Query("SELECT * FROM episodes ORDER BY season ASC, number ASC")
    fun observeAll(): Flow<List<EpisodeEntity>>

    @Query("SELECT * FROM episodes WHERE id = :id")
    suspend fun get(id: String): EpisodeEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<EpisodeEntity>)

    @Query("DELETE FROM episodes")
    suspend fun clear()

    @Query("SELECT COUNT(*) FROM episodes")
    suspend fun count(): Int
}
