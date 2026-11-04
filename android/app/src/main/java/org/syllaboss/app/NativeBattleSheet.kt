@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package org.syllaboss.app

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.clerk.api.Clerk
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

@Composable internal fun NativeBattleSheet(target: String, initial: String, dismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    val user by Clerk.userFlow.collectAsState()
    var selected by remember { mutableStateOf(initial) }
    var detail by remember { mutableStateOf<JSONObject?>(null) }
    var list by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var members by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var create by remember { mutableStateOf(false) }
    var picker by remember { mutableStateOf(false) }
    var source by remember { mutableStateOf<JSONObject?>(null) }
    var finish by remember { mutableStateOf(false) }
    var topic by remember { mutableStateOf("") }
    var mode by remember { mutableStateOf("mcq") }
    var count by remember { mutableIntStateOf(5) }
    var stake by remember { mutableStateOf("") }
    var fighters by remember { mutableStateOf(setOf<String>()) }
    var busy by remember { mutableStateOf(false) }
    var loaded by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var revision by remember { mutableIntStateOf(0) }
    val answers = remember(selected) { mutableStateMapOf<Int, Any>() }
    val photos = remember(selected) { mutableStateMapOf<Int, SolutionPhoto>() }
    var questionIndex by remember(selected) { mutableIntStateOf(0) }

    LaunchedEffect(selected, revision) {
        loaded = false
        try {
            if (selected.isBlank()) list = StudyApi.call("battles&target=" + target.asQuery()).objects("battles")
            else detail = StudyApi.call("battle&id=" + selected.asQuery())
        } catch (e: Exception) { if (e is CancellationException) throw e; error = e.message.orEmpty() }
        finally { loaded = true }
    }
    LaunchedEffect(selected, busy) {
        if (selected.isBlank() || busy) return@LaunchedEffect
        while (true) {
            kotlinx.coroutines.delay(5000)
            try { detail = StudyApi.call("battle&id=" + selected.asQuery()) }
            catch (e: Exception) { if (e is CancellationException) throw e }
        }
    }
    LaunchedEffect(create) {
        if (create) try { members = StudyApi.call("battle-members&target=" + target.asQuery()).objects("members") }
        catch (e: Exception) { if (e is CancellationException) throw e; error = e.message.orEmpty() }
    }
    fun action(body: JSONObject, after: (JSONObject) -> Unit = {}) {
        busy = true; error = ""
        scope.launch {
            try { after(StudyApi.call(body = body.put("target", target))); revision++ }
            catch (e: Exception) { if (e is CancellationException) throw e; error = e.message ?: "Battle action failed." }
            finally { busy = false }
        }
    }
    fun battleAction(name: String) = JSONObject().put("action", name).put("battleId", selected)
    ModalBottomSheet(onDismissRequest = dismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = Paper) {
        Column(Modifier.fillMaxWidth().fillMaxHeight(.88f).verticalScroll(rememberScrollState()).padding(horizontal = 22.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (create || selected.isNotBlank()) IconButton(onClick = { create = false; selected = ""; detail = null; error = "" }, enabled = !busy) { Icon(Icons.Outlined.ArrowBack, "All battles") }
                Text(if (create) "Start a battle" else "Study battles", Modifier.weight(1f), fontFamily = WebsiteDisplay, fontSize = 30.sp)
                IconButton(onClick = { error = ""; revision++ }, enabled = !busy) { Icon(Icons.Outlined.Refresh, "Refresh battles") }
            }
            if (!loaded || busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error)
            if (create) {
                Text("Pick a topic and invite people in this conversation. You can play for free or set a SyllaPoints stake.", color = Muted)
                OutlinedTextField(topic, { topic = it.take(200) }, label = { Text("Topic") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(mode == "mcq", { mode = "mcq" }, { Text("Multiple choice") })
                    FilterChip(mode == "theory", { mode = "theory" }, { Text("Theory") })
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("$count questions", Modifier.weight(1f))
                    IconButton(onClick = { count-- }, enabled = count > 1) { Icon(Icons.Outlined.Remove, "Fewer questions") }
                    IconButton(onClick = { count++ }, enabled = count < 50) { Icon(Icons.Outlined.Add, "More questions") }
                }
                OutlinedTextField(
                    stake, { stake = it.filter(Char::isDigit).take(5) },
                    label = { Text("Stake per player (optional)") },
                    supportingText = { Text("Leave blank for a friendly match. Your stake is deducted when you host.") },
                    singleLine = true, modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                )
                OutlinedButton(onClick = { picker = true }) { Icon(Icons.Outlined.Attachment, null); Text(source?.optString("title") ?: "Use course material") }
                if (source != null) TextButton(onClick = { source = null }) { Text("Remove material") }
                members.filter { it.optString("id") != user?.id }.forEach { member ->
                    val id = member.getString("id")
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(id in fighters, { fighters = if (it) fighters + id else fighters - id })
                        Text(member.optString("full_name", "Student"))
                    }
                }
                Button(onClick = {
                    val body = JSONObject().put("action", "battle-create").put("title", topic.trim()).put("mode", mode).put("count", count).put("fighterIds", JSONArray(fighters.toList())).put("stake", stake.toIntOrNull() ?: 0)
                    source?.let { body.put("sourceMaterialId", it.getString("id")) }
                    action(body) { create = false; selected = it.optString("id") }
                }, enabled = !busy && topic.trim().length >= 3 && fighters.isNotEmpty() && (stake.toIntOrNull() ?: 0) <= 10000, modifier = Modifier.fillMaxWidth()) { Text("Create and invite") }
            } else if (selected.isBlank()) {
                Button(onClick = { create = true }, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Outlined.Bolt, null); Text("Start a friendly battle") }
                if (loaded && list.isEmpty()) Text("No battles yet. Challenge your study partners to a quick round.", color = Muted)
                list.forEach { item ->
                    OutlinedCard(onClick = { selected = item.getString("id"); detail = null; error = "" }, shape = RoundedCornerShape(18.dp)) {
                        Column(Modifier.fillMaxWidth().padding(14.dp)) {
                            Text(item.optString("title"), fontWeight = FontWeight.SemiBold)
                            Text("${item.optInt("question_count")} questions · ${item.optString("status").replaceFirstChar { it.uppercase() }}", color = Muted, fontSize = 12.sp)
                        }
                    }
                }
            } else {
                val battle = detail?.optJSONObject("battle")
                val players = detail?.objects("participants").orEmpty()
                if (loaded && battle == null && error.isBlank()) Text("This battle is unavailable.")
                if (battle != null) {
                    val status = battle.optString("status")
                    val self = players.find { it.optString("user_id") == user?.id }
                    val personalStatus = self?.optString("status")
                    val theory = battle.optString("mode") == "theory"
                    val invited = players.count { it.optString("status") == "invited" && it.optString("role") == "fighter" }
                    val waiting = status == "lobby" && invited > 0 && players.count {
                        it.optString("role") == "fighter" && it.optString("status") in listOf("joined", "submitted")
                    } < 2
                    val questions = remember(battle.optString("questions_json")) {
                        runCatching { JSONArray(battle.optString("questions_json")) }.getOrElse { JSONArray() }
                    }
                    Text(battle.optString("title"), fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
                    Text("${questions.length()} questions · ${status.replaceFirstChar { it.uppercase() }}", color = Muted)
                    if (waiting) {
                        val started = remember(selected) {
                            runCatching {
                                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", java.util.Locale.US)
                                    .parse(battle.optString("created_at"))?.time
                            }.getOrNull() ?: System.currentTimeMillis()
                        }
                        var seconds by remember(selected) { mutableIntStateOf(0) }
                        LaunchedEffect(started) {
                            while (true) {
                                seconds = ((System.currentTimeMillis() - started) / 1000).coerceAtLeast(0).toInt()
                                kotlinx.coroutines.delay(1000)
                            }
                        }
                        Text("Waiting for an opponent · %02d:%02d".format(seconds / 60, seconds % 60), color = Muted)
                    }
                    if (status == "completed") players.filter { it.optString("status") == "submitted" }.sortedByDescending { it.optInt("score") }.forEachIndexed { i, player ->
                        ListItem(headlineContent = { Text("${i + 1}. ${player.optString("user_name")}") }, trailingContent = { Text("${player.optInt("score")}%") })
                    }
                    if (status in listOf("lobby", "active")) {
                        if (personalStatus == "invited") {
                            val stake = battle.optInt("stake_amount")
                            Button(onClick = { action(battleAction("battle-join")) }, enabled = !busy) { Text(if (stake > 0) "Join · $stake points" else "Join battle") }
                        } else if (!waiting && personalStatus == "joined" && self?.optString("role") == "fighter") {
                            questions.optJSONObject(questionIndex)?.let { q ->
                                val i = questionIndex
                                Text("Question ${i + 1} of ${questions.length()}", color = Muted, fontSize = 13.sp)
                                LinearProgressIndicator(progress = { (i + 1f) / questions.length() }, modifier = Modifier.fillMaxWidth())
                                Text("${i + 1}. ${q.optString("question")}", fontWeight = FontWeight.SemiBold)
                                if (theory) { OutlinedTextField(answers[i] as? String ?: "", { answers[i] = it.take(3000) }, placeholder = { Text("Explain your answer") }, modifier = Modifier.fillMaxWidth(), minLines = 2); SolutionPhotoPicker(photos[i], !busy, { if(it == null) photos.remove(i) else photos[i] = it }, { error = it }) }
                                else {
                                    val options = q.optJSONArray("options") ?: JSONArray()
                                    for (j in 0 until options.length()) {
                                        val label = options.optJSONObject(j)?.optString("text") ?: options.optString(j)
                                        FilterChip(answers[i] == j, { answers[i] = j }, { Text(label) }, modifier = Modifier.fillMaxWidth())
                                    }
                                }
                            }
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                OutlinedButton(onClick = { questionIndex-- }, enabled = !busy && questionIndex > 0) { Text("Previous") }
                                Text("${answers.keys.union(photos.keys).size} answered", modifier = Modifier.align(Alignment.CenterVertically), color = Muted)
                                Button(onClick = { questionIndex++ }, enabled = !busy && questionIndex + 1 < questions.length()) { Text("Next") }
                            }
                            Button(onClick = {
                                if (!theory) {
                                    val result = JSONObject()
                                    answers.forEach { (i, value) -> result.put(i.toString(), value) }
                                    action(battleAction("battle-submit").put("answersJson", result.toString()))
                                } else {
                                    busy = true; error = ""
                                    val typed = answers.toMap(); val scans = photos.toMap()
                                    scope.launch {
                                        try {
                                            val result = JSONObject()
                                            for (i in (typed.keys + scans.keys)) {
                                                val item = JSONObject().put("text", typed[i] ?: "")
                                                scans[i]?.let { photo ->
                                                    val (file, uri) = mediaFile(context, ".jpg")
                                                    try {
                                                        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { file.writeBytes(android.util.Base64.decode(photo.base64, android.util.Base64.DEFAULT)) }
                                                        item.put("imageAttachmentId", StudyApi.media(context, uri, target = target).getString("id"))
                                                    } finally { file.delete() }
                                                }
                                                result.put(i.toString(), item)
                                            }
                                            StudyApi.call(body = battleAction("battle-submit").put("target", target).put("answersJson", result.toString()))
                                            revision++
                                        } catch (e: Exception) { if (e is CancellationException) throw e; error = e.message ?: "Could not submit solutions." }
                                        finally { busy = false }
                                    }
                                }
                            }, enabled = !busy && (photos.isNotEmpty() || answers.values.any { it !is String || it.isNotBlank() }), modifier = Modifier.fillMaxWidth()) { Text("Submit answers") }
                        } else if (personalStatus == "submitted") Text("Answers submitted. Check back for the results.", color = MaterialTheme.colorScheme.primary)
                        if (battle.optString("host_id") == user?.id && players.any { it.optString("status") == "submitted" && it.optString("role") == "fighter" }) {
                            OutlinedButton(onClick = { finish = true }, enabled = !busy) { Text("Finish and grade") }
                        }
                    }
                    players.forEach { Text("${it.optString("user_name")} · ${it.optString("status")}", fontSize = 13.sp, color = Muted) }
                }
            }
            Spacer(Modifier.height(18.dp))
        }
    }
    if (picker) NativeSourceSheet(onDismiss = { picker = false }, onPicked = { source = it }, onError = { error = it })
    if (finish) AlertDialog(onDismissRequest = { finish = false }, title = { Text("Finish this battle?") }, text = { Text("Only answers already submitted will count.") }, confirmButton = { TextButton(onClick = { finish = false; action(battleAction("battle-grade")) }) { Text("Finish battle") } }, dismissButton = { TextButton(onClick = { finish = false }) { Text("Keep open") } })
}
