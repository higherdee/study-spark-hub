package org.syllaboss.app

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable internal fun NativeBattleRound(detail: JSONObject, userId: String?, target: String, refresh: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val battle = detail.getJSONObject("battle")
    val sync = detail.getJSONObject("sync")
    val round = sync.optJSONObject("round")
    val index = round?.optInt("index", -1) ?: -1
    var text by remember(battle.optString("id"), index) { mutableStateOf("") }
    var photo by remember(battle.optString("id"), index) { mutableStateOf<SolutionPhoto?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var locked by remember(battle.optString("id"), index) { mutableStateOf(false) }
    var remaining by remember { mutableIntStateOf(0) }
    val players = detail.objects("participants")
    val self = players.find { it.optString("user_id") == userId }
    val answered = sync.optJSONArray("answeredBy")?.let { array -> (0 until array.length()).map { array.optString(it) } }.orEmpty()
    LaunchedEffect(sync) {
        val fetched = android.os.SystemClock.elapsedRealtime()
        while (true) {
            val now = sync.optLong("serverNow") + android.os.SystemClock.elapsedRealtime() - fetched
            val end = if (round?.optString("state") == "playing") round.optLong("closesAt") else round?.optLong("startsAt") ?: now
            remaining = ((end - now + 999) / 1000).coerceAtLeast(0).toInt()
            kotlinx.coroutines.delay(200)
        }
    }
    when (round?.optString("state")) {
        null -> Text("Waiting for an opponent. Both players share the same question clock.")
        "waiting" -> Text("Starting in $remaining…", style = MaterialTheme.typography.headlineLarge)
        "finished" -> Text("All rounds closed. Scores are being finalized.")
        "playing" -> {
            val question = org.json.JSONArray(battle.getString("questions_json")).optJSONObject(index)
            val canAnswer = !busy && !locked && userId !in answered && remaining > 0 && self?.optString("role") == "fighter" && self.optString("status") == "joined"
            Text("Question ${index + 1} · ${remaining}s", style = MaterialTheme.typography.titleMedium)
            Text(question?.optString("question").orEmpty(), style = MaterialTheme.typography.titleLarge)
            fun submit(answer: Any) {
                busy = true; error = ""
                scope.launch {
                    try {
                        StudyApi.call(body = JSONObject().put("action", "battle-round").put("target", target).put("battleId", battle.getString("id")).put("index", index).put("answer", answer))
                        locked = true; refresh()
                    } catch (e: Exception) { if (e is CancellationException) throw e; error = e.message ?: "Answer could not be sent." }
                    finally { busy = false }
                }
            }
            if (battle.optString("mode") == "mcq") {
                val options = question?.optJSONArray("options")
                for (i in 0 until (options?.length() ?: 0)) OutlinedButton(onClick = { submit(i) }, enabled = canAnswer, modifier = Modifier.fillMaxWidth()) { Text(options!!.optString(i)) }
            } else {
                OutlinedTextField(text, { text = it.take(6000) }, enabled = canAnswer, label = { Text("Show your working") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
                SolutionPhotoPicker(photo, canAnswer, { photo = it }, { error = it })
                Button(enabled = canAnswer && (text.isNotBlank() || photo != null), onClick = {
                    busy = true
                    scope.launch {
                        try {
                            val answer = JSONObject().put("text", text)
                            photo?.let { scan ->
                                val (file, uri) = mediaFile(context, ".jpg")
                                try {
                                    kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { file.writeBytes(android.util.Base64.decode(scan.base64, android.util.Base64.DEFAULT)) }
                                    answer.put("imageAttachmentId", StudyApi.media(context, uri, target = target).getString("id"))
                                } finally { file.delete() }
                            }
                            submit(answer)
                        } catch (e: Exception) { if (e is CancellationException) throw e; error = e.message ?: "Could not upload solution."; busy = false }
                    }
                }) { Text("Lock solution") }
            }
            if (locked || userId in answered) Text("Answer locked. The next round starts for everyone together.")
            players.filter { it.optString("user_id") != userId && it.optString("user_id") in answered }.forEach { Text("${it.optString("user_name")} has answered.") }
        }
    }
    if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error)
    Spacer(Modifier.height(8.dp))
}
