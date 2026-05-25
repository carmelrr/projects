package com.anime.streamer.ui

import androidx.lifecycle.ViewModel
import com.anime.streamer.sync.AuthManager
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.StateFlow

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authManager: AuthManager,
) : ViewModel() {

    val signedIn: StateFlow<Boolean> = authManager.signedIn
    val email: String? get() = authManager.email

    fun signIn(email: String, password: String, onResult: (Boolean, String?) -> Unit) =
        authManager.signIn(email, password, onResult)

    fun register(email: String, password: String, onResult: (Boolean, String?) -> Unit) =
        authManager.register(email, password, onResult)

    fun signOut() = authManager.signOut()
}
