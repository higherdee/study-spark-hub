package org.syllaboss.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import java.util.Calendar
import org.json.JSONObject

@Stable internal class NativeFocusState {
    var seconds by mutableIntStateOf(0)
    var dailyMinutes by mutableIntStateOf(0)
    var paused by mutableStateOf(false)
    var connected by mutableStateOf(false)
    var message by mutableStateOf("")
    var goal by mutableIntStateOf(if (Calendar.getInstance().get(Calendar.DAY_OF_WEEK) in listOf(1,7)) 150 else 90)
    var idleMinutes by mutableIntStateOf(60)
    var lastInteraction by mutableLongStateOf(System.currentTimeMillis())
    fun touch() { lastInteraction = System.currentTimeMillis() }
}
@Composable internal fun rememberNativeFocus(userId: String?, settingsRevision: Int = 0): NativeFocusState {
    val state = remember(userId) { NativeFocusState() }
    val owner = LocalLifecycleOwner.current
    LaunchedEffect(userId, settingsRevision) {
        if (userId == null) return@LaunchedEffect
        try { StudyApi.call("settings").optJSONObject("preferences")?.let { state.goal = it.optInt("studyGoalMinutes",state.goal); state.idleMinutes = it.optInt("idleTimeoutMinutes",60) } } catch (_: Exception) { }
        while (isActive) {
            val active = owner.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED) && !state.paused && System.currentTimeMillis() - state.lastInteraction < state.idleMinutes * 60000L
            try {
                val receipt = StudyApi.call(body = JSONObject().put("action","study-heartbeat").put("active",active))
                state.seconds = receipt.optInt("activeSeconds"); state.dailyMinutes = receipt.optInt("dailyMinutes"); state.connected = true
                if (receipt.optInt("pointsAwarded") > 0) state.message = "+${receipt.optInt("pointsAwarded")} SyllaPoints. Your next round has started."
            } catch (e: Exception) { if (e is kotlinx.coroutines.CancellationException) throw e; state.connected = false; state.message = "Connect to confirm your study progress." }
            delay(30000)
        }
    }
    LaunchedEffect(userId, state.paused) {
        while (isActive) { delay(1000); if (userId != null && !state.paused && state.connected && owner.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED) && System.currentTimeMillis() - state.lastInteraction < state.idleMinutes * 60000L) state.seconds = minOf(1799,state.seconds + 1) }
    }
    return state
}
@Composable internal fun VerifiedFocusScreen(state: NativeFocusState, signedIn: Boolean, back: () -> Unit) {
    val remaining = (1800 - state.seconds).coerceIn(0,1800)
    Column(Modifier.fillMaxSize().background(Forest).safeDrawingPadding().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { IconButton(onClick = back) { Icon(Icons.Outlined.ArrowBack,"Back",tint=Color.White) }; Text("YOUR FOCUS SPACE",color=Lime,fontSize=12.sp) }
        Spacer(Modifier.weight(1f)); Text("One round. Then the next.",fontFamily=WebsiteDisplay,fontSize=34.sp,color=Color.White)
        Text("${state.dailyMinutes / 30} of ${state.goal / 30} daily rounds complete",color=Color(0xFFB7CDBE),modifier=Modifier.padding(top=14.dp))
        Box(Modifier.padding(vertical=40.dp).size(260.dp),contentAlignment=Alignment.Center) {
            CircularProgressIndicator(progress={state.seconds/1800f},modifier=Modifier.fillMaxSize(),color=Lime,trackColor=Color(0xFF365849),strokeWidth=5.dp)
            Text("%02d:%02d".format(remaining/60,remaining%60),fontFamily=WebsiteDisplay,fontSize=65.sp,color=Color.White)
        }
        Text(if (!signedIn) "Sign in to save focus time and earn points." else if (state.paused) "Paused. Take your time." else "Your timer runs while you study in Syllaboss.",color=Color(0xFFB7CDBE),fontSize=14.sp)
        Button(onClick={ state.paused = !state.paused; state.touch() },enabled=signedIn,modifier=Modifier.fillMaxWidth().padding(top=24.dp).height(56.dp),shape=RoundedCornerShape(18.dp),colors=ButtonDefaults.buttonColors(containerColor=Lime,contentColor=Forest)) { Text(if(state.paused) "Resume focus" else "Pause focus") }
        Spacer(Modifier.weight(1f)); Text(state.message.ifBlank { "Every completed 30-minute round is confirmed by your account. Rounds continue automatically." },fontSize=12.sp,color=Color(0xFFB7CDBE))
    }
}
