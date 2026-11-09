@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package org.syllaboss.app

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject

@Composable internal fun UploadScreen(back: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var title by rememberSaveable { mutableStateOf("") }
    var course by rememberSaveable { mutableStateOf("") }
    var code by rememberSaveable { mutableStateOf("") }
    var school by rememberSaveable { mutableStateOf("") }
    var type by rememberSaveable { mutableStateOf("Lecture notes") }
    var selected by rememberSaveable { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var result by rememberSaveable { mutableStateOf<String?>(null) }
    val courses = remember { val a = JSONArray(context.assets.open("courses.json").bufferedReader().use { it.readText() }); (0 until a.length()).map { a.getString(it) } }
    val schools = remember { val a = JSONArray(context.assets.open("institutions.json").bufferedReader().use { it.readText() }); (0 until a.length()).map { a.getJSONObject(it).getString("name") } }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri -> uri?.let { selected = it.toString(); runCatching { context.contentResolver.takePersistableUriPermission(it, android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION) } } }
    Scaffold(topBar = { TopAppBar(title = { Text("Share a material") }, navigationIcon = { IconButton(onClick = back, enabled = !busy) { Icon(Icons.Outlined.ArrowBack, "Back") } }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).imePadding().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Text("Someone needs what you know.", fontSize = 27.sp, fontWeight = FontWeight.SemiBold, lineHeight = 32.sp)
            Text("Share notes, textbooks, worked solutions, summaries or lab manuals as a clear PDF. Verified contributions earn SyllaPoints.", color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 22.sp)
            if (result != null) {
                Icon(Icons.Outlined.CheckCircle, null, modifier = Modifier.size(52.dp), tint = MaterialTheme.colorScheme.primary)
                Text(result!!, lineHeight = 24.sp)
                Button(onClick = back, modifier = Modifier.fillMaxWidth().height(54.dp)) { Text("Back to your space") }
            } else {
                OutlinedButton(onClick = { picker.launch(arrayOf("application/pdf")) }, enabled = !busy, modifier = Modifier.fillMaxWidth().height(74.dp), shape = RoundedCornerShape(18.dp)) { Icon(Icons.Outlined.UploadFile, null); Spacer(Modifier.width(12.dp)); Text(if (selected == null) "Choose a PDF · up to 20 MB" else "PDF selected · tap to change") }
                OutlinedTextField(title, { title = it.take(180) }, label = { Text("Material title") }, modifier = Modifier.fillMaxWidth(), enabled = !busy, shape = RoundedCornerShape(16.dp))
                DirectoryField("Course", course, courses, !busy) { course = it }
                OutlinedTextField(code, { code = it.take(30) }, label = { Text("Course code (optional)") }, modifier = Modifier.fillMaxWidth(), enabled = !busy, shape = RoundedCornerShape(16.dp), singleLine = true)
                DirectoryField("Institution", school, schools, !busy) { school = it }
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) { listOf("Lecture notes", "Past questions", "Textbook / handout", "Assignment / solution", "Summary", "Lab manual", "Other").forEach { label -> FilterChip(selected = type == label, onClick = { type = label }, label = { Text(label) }, enabled = !busy) } }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp) }
                Button(onClick = {
                    busy = true; error = null
                    scope.launch {
                        try {
                            val response = StudyApi.upload(context, Uri.parse(selected!!), mapOf("title" to title.trim(), "course" to course.trim(), "courseCode" to code.trim(), "institution" to school.trim(), "materialType" to type))
                            val audit = response.optJSONObject("auditResult")
                            result = when (audit?.optString("status")) { "verified" -> "Your material has been verified and added to the library."; "rejected" -> "This material was not approved. ${audit.optString("notes")}"; else -> "Your material was uploaded and is waiting for review." }
                        } catch (e: Exception) { error = e.message ?: "Upload failed. Please retry." }
                        finally { busy = false }
                    }
                }, enabled = !busy && selected != null && title.isNotBlank() && course.isNotBlank() && school.isNotBlank(), modifier = Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(18.dp)) { if (busy) { CircularProgressIndicator(Modifier.size(18.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp); Spacer(Modifier.width(10.dp)) }; Text(if (busy) "Uploading and checking…" else "Share material") }
                Text("Keep this screen open while your PDF uploads. Only share materials you have permission to distribute.", fontSize = 11.sp, lineHeight = 17.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
@Composable private fun DirectoryField(label: String, value: String, entries: List<String>, enabled: Boolean, change: (String) -> Unit) {
    var suggest by remember { mutableStateOf(false) }
    Column {
        OutlinedTextField(value, { change(it.take(180)); suggest = true }, label = { Text(label) }, modifier = Modifier.fillMaxWidth(), enabled = enabled, singleLine = true, shape = RoundedCornerShape(16.dp))
        if (suggest && value.length >= 2) entries.asSequence().filter { it.contains(value, true) }.take(4).forEach { entry -> TextButton(onClick = { change(entry); suggest = false }, modifier = Modifier.fillMaxWidth()) { Text(entry, modifier = Modifier.fillMaxWidth(), fontSize = 12.sp) } }
    }
}

@Composable internal fun PeersScreen(back: () -> Unit, onChatOpen: (Boolean) -> Unit = {}) {
    val scope = rememberCoroutineScope()
    var create by rememberSaveable { mutableStateOf(false) }
    var name by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var groups by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var groupQuery by rememberSaveable { mutableStateOf("") }
    var group by remember { mutableStateOf<JSONObject?>(null) }
    LaunchedEffect(group?.optString("id")) { onChatOpen(group != null) }
    DisposableEffect(Unit) { onDispose { onChatOpen(false) } }

    var loading by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    if (create) AlertDialog(
        onDismissRequest = { if (!busy) create = false },
        title = { Text("Create a study group") },
        text = { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(name, { name = it.take(80) }, label = { Text("Group name") }, singleLine = true)
            OutlinedTextField(description, { description = it.take(300) }, label = { Text("Description (optional)") }, maxLines = 3)
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        } },
        confirmButton = { Button(enabled = name.trim().length >= 3 && !busy, onClick = {
            busy = true; error = null
            scope.launch {
                try {
                    group = StudyApi.call(body = JSONObject().put("action", "create-group").put("name", name.trim()).put("description", description.trim())).getJSONObject("group")
                    name = ""; description = ""; create = false
                } catch (e: Exception) {
                    if (e is CancellationException) throw e
                    error = e.message ?: "Could not create the group."
                } finally { busy = false }
            }
        }) { Text(if (busy) "Creating…" else "Create group") } },
        dismissButton = { TextButton(enabled = !busy, onClick = { create = false }) { Text("Cancel") } }
    )

    var refresh by remember { mutableIntStateOf(0) }
    LaunchedEffect(group?.optString("id"), refresh, groupQuery) {
        if (group != null) return@LaunchedEffect
        loading = true; error = null
        try {
            if (group == null) { delay(300); val a = StudyApi.call("groups&q=" + java.net.URLEncoder.encode(groupQuery, "UTF-8")).getJSONArray("groups"); groups = (0 until a.length()).map { a.getJSONObject(it) } }
        } catch (e: Exception) { if (e is CancellationException) throw e; error = e.message ?: "Unable to load study groups." }
        finally { loading = false }
    }
    androidx.activity.compose.BackHandler(group != null) { group = null }
    group?.takeIf { it.optBoolean("is_member") }?.let { PeerConversation(it.getString("id"), it.optString("name"), true) { group = null }; return }
    Scaffold(topBar = { TopAppBar(title = { Text(group?.optString("name") ?: "Study together", maxLines = 1) }, navigationIcon = { IconButton(onClick = { if (group != null) group = null else back() }) { Icon(Icons.Outlined.ArrowBack, "Back") } }, actions = { IconButton(onClick = { refresh++ }) { Icon(Icons.Outlined.Refresh, "Refresh discussion") } }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).imePadding()) {
            if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(20.dp), fontSize = 13.sp) }
            if (group == null) LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                item { Button(onClick = { error = null; create = true }, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Outlined.Add, null); Text("Create study group") } }
                item { Text("Find your people.", fontSize = 30.sp, fontWeight = FontWeight.SemiBold); Text("A shared question is a good place to start.", modifier = Modifier.padding(top = 8.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                item { OutlinedTextField(groupQuery, { groupQuery = it.take(100) }, placeholder = { Text("Search a group or course") }, leadingIcon = { Icon(Icons.Outlined.Search, null) }, modifier = Modifier.fillMaxWidth(), singleLine = true, shape = RoundedCornerShape(18.dp)) }
                if (!loading && groups.isEmpty()) item { Text("No study groups are available yet. Check back soon.") }
                items(groups) { g -> OutlinedCard(onClick = { group = g }, shape = RoundedCornerShape(20.dp), colors = CardDefaults.outlinedCardColors(containerColor = Color.Transparent)) { Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { Text(g.optString("name"), fontWeight = FontWeight.SemiBold, fontSize = 19.sp); Text(g.optString("description").takeUnless { it == "null" } ?: "A space to learn together.", fontSize = 13.sp); Text("${g.optInt("member_count")} members · ${if (g.optBoolean("is_member")) "Joined" else "Open group"}", color = MaterialTheme.colorScheme.primary, fontSize = 11.sp) } } }
            } else {
                Text("Join this study group to read and take part in the conversation.", Modifier.padding(20.dp), color = Muted)
                if (!group!!.optBoolean("is_member")) Button(onClick = {
                    busy = true
                    scope.launch { try { StudyApi.call(body = JSONObject().put("action", "join").put("group", group!!.getString("id"))); group = JSONObject(group.toString()).put("is_member", true); refresh++ } catch (e: Exception) { error = e.message } finally { busy = false } }
                }, enabled = !busy, modifier = Modifier.padding(20.dp).fillMaxWidth().height(54.dp)) { Text(if (busy) "Joining…" else "Join this study group") }
            }
        }
    }
}

@Composable internal fun ProfileScreen(profile: JSONObject?, back: () -> Unit, saved: () -> Unit, onboarding: Boolean = false) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    fun initial(key: String) = profile?.optString(key)?.takeUnless { it == "null" } ?: ""
    var name by rememberSaveable { mutableStateOf(initial("full_name")) }
    var username by rememberSaveable { mutableStateOf(initial("username")) }
    var course by rememberSaveable { mutableStateOf(initial("course")) }
    var school by rememberSaveable { mutableStateOf(initial("institution")) }
    var level by rememberSaveable { mutableStateOf(initial("level")) }
    var step by rememberSaveable { mutableIntStateOf(0) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val courses = remember { val a = JSONArray(context.assets.open("courses.json").bufferedReader().use { it.readText() }); (0 until a.length()).map { a.getString(it) } }
    val schools = remember { val a = JSONArray(context.assets.open("institutions.json").bufferedReader().use { it.readText() }); (0 until a.length()).map { a.getJSONObject(it).getString("name") } }
    Scaffold(topBar = { TopAppBar(title = { Text(if(onboarding) "Welcome to Syllaboss" else "Your student profile") }, navigationIcon = { IconButton(onClick = { if(onboarding && step > 0) step-- else back() }) { Icon(Icons.Outlined.ArrowBack, "Back") } }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).imePadding().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            BrandWordmark()
            Text(if(onboarding) "Make this space yours." else "A little about you.", fontFamily = WebsiteDisplay, fontSize = 32.sp)
            if(onboarding) { Text("${step + 1} of 2 · ${if(step == 0) "Your identity" else "Your studies"}", color = Muted); LinearProgressIndicator(progress = { (step + 1) / 2f }, modifier = Modifier.fillMaxWidth()) }
            if(!onboarding || step == 0) {
                OutlinedTextField(username, { username = it.filter { ch -> ch.isLetterOrDigit() || ch == '_' }.take(30) }, label = { Text("Public @username") }, supportingText = { Text("3–30 letters, numbers or underscores. Your name stays private.") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(name, { name = it.take(100) }, label = { Text("Your name (private)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            }
            if(!onboarding || step == 1) {
                Text("We'll use these details to help you find relevant course materials.", color = Muted)
                DirectoryField("Course", course, courses, !busy) { course = it }
                DirectoryField("Institution", school, schools, !busy) { school = it }
                OutlinedTextField(level, { level = it.take(30) }, label = { Text("Level, e.g. 200") }, modifier = Modifier.fillMaxWidth(), enabled = !busy, singleLine = true)
            }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            if(onboarding && step == 0) Button(onClick = { step = 1 }, enabled = name.trim().length >= 2 && username.matches(Regex("[A-Za-z0-9_]{3,30}")), modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp)) { Text("Continue to your studies") }
            else Button(onClick = {
                busy = true; error = null
                scope.launch { try { StudyApi.call(body = JSONObject().put("action", "profile").put("username", username.trim()).put("full_name", name.trim()).put("course", course.trim()).put("institution", school.trim()).put("level", level.trim())); saved() } catch(e: Exception) { if(e is CancellationException) throw e; error = e.message } finally { busy = false } }
            }, enabled = !busy && username.matches(Regex("[A-Za-z0-9_]{3,30}")) && name.trim().length >= 2 && course.trim().length >= 2 && school.trim().length >= 2, modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp)) { Text(if(busy) "Saving your space…" else if(onboarding) "Enter your study space" else "Save profile") }
        }
    }
}