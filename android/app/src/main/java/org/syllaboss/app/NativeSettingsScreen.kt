@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package org.syllaboss.app

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.Calendar
import java.util.UUID

@Composable internal fun NativeSettingsScreen(back: () -> Unit) {
    val context = LocalContext.current
    val display = remember(context) { context.getSharedPreferences("syllaboss-native", 0) }
    var localCurrency by remember { mutableStateOf(display.getBoolean("billing-local-display", false)) }
    val scope = rememberCoroutineScope()
    var loaded by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var reminders by remember { mutableStateOf(true) }
    var rewards by remember { mutableStateOf(true) }
    var sound by remember { mutableStateOf(true) }
    val weekend = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) in listOf(Calendar.SATURDAY, Calendar.SUNDAY)
    var goal by remember { mutableStateOf(if (weekend) 150 else 90) }
    var idle by remember { mutableStateOf(60) }
    var bank by remember { mutableStateOf("") }
    var account by remember { mutableStateOf("") }
    var holder by remember { mutableStateOf("") }
    var code by rememberSaveable { mutableStateOf("") }
    var requestId by rememberSaveable { mutableStateOf(UUID.randomUUID().toString()) }
    LaunchedEffect(Unit) {
        try {
            val p = StudyApi.call("settings").optJSONObject("preferences") ?: JSONObject()
            reminders = p.optBoolean("studyReminders", true); rewards = p.optBoolean("rewardAlerts", true); sound = p.optBoolean("soundEnabled", true)
            goal = p.optInt("studyGoalMinutes", goal); idle = p.optInt("idleTimeoutMinutes", 60)
            p.optJSONObject("bank")?.let { bank = it.optString("name"); account = it.optString("accountNumber"); holder = it.optString("accountName") }
            loaded = true
        } catch (e: Exception) { message = e.message ?: "Your settings could not be loaded. Reopen this screen to retry." }
    }
    Scaffold(topBar = { TopAppBar(title = { Text("Your settings") }, navigationIcon = { IconButton(onClick = back) { Icon(Icons.Outlined.ArrowBack, "Back") } }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).imePadding().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Text("Your pace. Your preferences.", fontFamily = WebsiteDisplay, fontSize = 28.sp)
            Text("These settings are shared with your Syllaboss account on the web.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            ListItem(
                headlineContent = { Text("Show local currency first") },
                supportingContent = { Text("On this device. Uses a local estimate when available and still shows the checkout charge in USD.") },
                trailingContent = { Switch(localCurrency, { enabled ->
                    localCurrency = enabled
                    display.edit().putBoolean("billing-local-display", enabled).apply()
                }) },
            )
            if (!loaded && message.isBlank()) CircularProgressIndicator()
            listOf(Triple("Study reminders", reminders, { value: Boolean -> reminders = value }), Triple("Reward alerts", rewards, { value: Boolean -> rewards = value }), Triple("Study sounds", sound, { value: Boolean -> sound = value })).forEach { (label, checked, change) ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Text(label); Switch(checked, change, enabled = loaded && !busy) }
            }
            Text("Daily focus target: $goal minutes (${goal / 30} rounds)")
            Slider(goal.toFloat(), { goal = (it / 30).toInt().coerceIn(1,24) * 30 }, valueRange = 30f..720f, steps = 22, enabled = loaded && !busy)
            Text("Pause after $idle minutes without activity")
            Slider(idle.toFloat(), { idle = (it / 15).toInt().coerceIn(1,16) * 15 }, valueRange = 15f..240f, steps = 14, enabled = loaded && !busy)
            OutlinedTextField(bank, { bank = it.take(100) }, label = { Text("Payout bank") }, enabled = loaded && !busy, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(account, { account = it.filter(Char::isDigit).take(10) }, label = { Text("10-digit account number") }, enabled = loaded && !busy, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(holder, { holder = it.take(120) }, label = { Text("Account holder") }, enabled = loaded && !busy, modifier = Modifier.fillMaxWidth())
            Button(onClick = { busy = true; message = ""; scope.launch {
                try {
                    val p = JSONObject().put("studyReminders", reminders).put("rewardAlerts", rewards).put("soundEnabled", sound).put("studyGoalMinutes", goal).put("idleTimeoutMinutes", idle)
                    p.put("bank", JSONObject().put("name", bank).put("accountNumber", account).put("accountName", holder))
                    StudyApi.call(body = JSONObject().put("action", "preferences").put("preferences", p)); message = "Your settings are saved."
                } catch (e: Exception) { message = e.message ?: "Settings could not be saved." } finally { busy = false }
            } }, enabled = loaded && !busy && (account.isEmpty() || account.length == 10), modifier = Modifier.fillMaxWidth()) { Text(if (busy) "Saving…" else "Save settings") }
            HorizontalDivider()
            Text("Have a promo code?", fontSize = 20.sp)
            OutlinedTextField(code, { code = it.take(32); requestId = UUID.randomUUID().toString() }, label = { Text("Promo code") }, enabled = !busy, modifier = Modifier.fillMaxWidth())
            Button(onClick = { busy = true; message = ""; scope.launch {
                try {
                    val result = StudyApi.call(body = JSONObject().put("action", "redeem-promo").put("code", code.trim()).put("requestId", requestId))
                    val reward = when (result.optString("effect")) { "plus_days" -> "SyllaPlus days"; "ai_tokens" -> "AI response tokens"; else -> "material downloads" }
                    message = "Added ${result.optInt("value")} $reward. Available until ${result.optString("expires_at")}. Paid renewal dates stay the same."
                } catch (e: Exception) { message = e.message ?: "Your code could not be applied." } finally { busy = false }
            } }, enabled = !busy && code.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text("Apply code") }
            Text("AI token credits expire at midnight UTC; download credits expire at the end of the UTC month.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (message.isNotBlank()) Text(message, color = MaterialTheme.colorScheme.primary)
        }
    }
}
