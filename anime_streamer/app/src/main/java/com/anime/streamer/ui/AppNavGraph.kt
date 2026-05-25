package com.anime.streamer.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.anime.streamer.ui.phone.PhoneHomeScreen
import com.anime.streamer.ui.player.PlayerScreen
import com.anime.streamer.ui.tv.TvHomeScreen

object Routes {
    const val AUTH = "auth"
    const val HOME = "home"
    const val PLAYER = "player/{episodeId}"
    fun player(episodeId: String) = "player/$episodeId"
}

@Composable
fun AppNavGraph(isTv: Boolean, isSignedIn: Boolean) {
    val nav = rememberNavController()

    // Navigate whenever auth state flips.
    LaunchedEffect(isSignedIn) {
        if (isSignedIn) {
            nav.navigate(Routes.HOME) { popUpTo(Routes.AUTH) { inclusive = true } }
        } else {
            nav.navigate(Routes.AUTH) { popUpTo(0) { inclusive = true } }
        }
    }

    NavHost(
        navController = nav,
        startDestination = if (isSignedIn) Routes.HOME else Routes.AUTH,
    ) {
        composable(Routes.AUTH) {
            AuthScreen()
        }
        composable(Routes.HOME) {
            if (isTv) TvHomeScreen(onPlay = { id -> nav.navigate(Routes.player(id)) })
            else PhoneHomeScreen(onPlay = { id -> nav.navigate(Routes.player(id)) })
        }
        composable(Routes.PLAYER) { backStack ->
            val id = backStack.arguments?.getString("episodeId").orEmpty()
            PlayerScreen(
                episodeId = id,
                isTv = isTv,
                onFinished = { nav.popBackStack() },
                onPlayNext = { nextId -> nav.navigate(Routes.player(nextId)) { popUpTo(Routes.HOME) } },
            )
        }
    }
}
