package org.syllaboss.app

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable internal fun NativeMaterialActions(material: Material) {
    val context=LocalContext.current;val scope=rememberCoroutineScope()
    var reviews by remember {mutableStateOf(false)};var data by remember {mutableStateOf<JSONObject?>(null)};var error by remember {mutableStateOf("")};var notice by remember {mutableStateOf("")}
    var rating by remember {mutableIntStateOf(0)};var review by remember {mutableStateOf("")};var loading by remember {mutableStateOf(false)};var saving by remember {mutableStateOf(false)};var reload by remember {mutableIntStateOf(0)}
    var downloading by remember {mutableStateOf(false)};var seconds by remember {mutableIntStateOf(0)};var job by remember {mutableStateOf<Job?>(null)}
    val saveFile=rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument(material.mime.ifBlank {"application/pdf"})) { uri ->
        if(uri!=null) {downloading=true;notice="";job=scope.launch {
            try {
                val gate=StudyApi.call(body=JSONObject().put("action","start-material").put("materialId",material.id).put("intent","download"));seconds=gate.optInt("seconds")
                while(seconds>0){delay(1000);seconds--}
                val access=StudyApi.call(body=JSONObject().put("action","complete-material").put("id",gate.getString("id")))
                StudyApi.saveDocument(access.getString("url"),context,uri);notice="Your material has been saved."
            } catch(e:Exception){notice=if(e is kotlinx.coroutines.CancellationException) "Download canceled." else e.message ?: "Download could not complete.";runCatching{android.provider.DocumentsContract.deleteDocument(context.contentResolver,uri)}} finally{downloading=false;seconds=0}
        }}
    }
    LaunchedEffect(reviews,reload) {
        if(!reviews)return@LaunchedEffect;loading=true;error=""
        try{data=StudyApi.call("reviews&material="+java.net.URLEncoder.encode(material.id,"UTF-8"));data?.optJSONArray("reviews")?.let{a->for(i in 0 until a.length()){val r=a.getJSONObject(i);if(r.optBoolean("own")){rating=r.optInt("rating");review=r.optString("review")}}}}catch(e:Exception){if(e is kotlinx.coroutines.CancellationException)throw e;error=e.message ?: "Reviews could not be loaded."}finally{loading=false}
    }
    Row {
        IconButton(onClick={reviews=true}) {Icon(Icons.Outlined.StarOutline,"Material reviews")}
        IconButton(onClick={saveFile.launch(material.title.replace(Regex("[\\/:*?\"<>|]"),"_")+(if(material.mime.startsWith("image/")) ".${material.mime.substringAfter('/')}" else ".pdf"))},enabled=!downloading) {Icon(Icons.Outlined.Download,"Download material")}
    }
    if(notice.isNotBlank()) AlertDialog(onDismissRequest={notice=""},title={Text("Your material")},text={Text(notice)},confirmButton={TextButton(onClick={notice=""}){Text("Done")}})
    if(downloading) AlertDialog(onDismissRequest={job?.cancel()},title={Text(if(seconds>0) "A little more room to learn." else "Saving your material…")},text={Column(verticalArrangement=Arrangement.spacedBy(12.dp)){if(seconds>0){BrandWordmark();Text("SyllaPlus includes more downloads, more AI time and library study alongside Boss AI.");Text("Your download continues in $seconds seconds.");Text("Subscribe today and get seven extra days before your first renewal.",fontSize=12.sp)}else CircularProgressIndicator()}},confirmButton={},dismissButton={TextButton(onClick={job?.cancel()}){Text("Cancel download")}})
    if(reviews) AlertDialog(onDismissRequest={reviews=false},title={Text("Material reviews")},text={Column(Modifier.heightIn(max=520.dp).verticalScroll(rememberScrollState()),verticalArrangement=Arrangement.spacedBy(12.dp)) {
        if(loading)LinearProgressIndicator(Modifier.fillMaxWidth())
        data?.let{Text("%.1f / 5 · %d reviews".format(it.optDouble("average"),it.optInt("count")))}
        Row {for(n in 1..5)IconButton(onClick={rating=n},enabled=!saving){Icon(if(n<=rating)Icons.Outlined.Star else Icons.Outlined.StarOutline,"Rate $n stars",tint=Forest)}}
        OutlinedTextField(review,{review=it.take(1500)},label={Text("Share your experience (optional)")},minLines=2,maxLines=5,enabled=!saving,modifier=Modifier.fillMaxWidth())
        Button(onClick={saving=true;error="";scope.launch{try{StudyApi.call(body=JSONObject().put("action","review").put("materialId",material.id).put("rating",rating).put("review",review.trim()));reload++}catch(e:Exception){error=e.message ?: "Your review could not be saved."}finally{saving=false}}},enabled=rating in 1..5&&!saving){Text(if(saving)"Saving…" else "Save my review")}
        if(error.isNotBlank())Text(error,color=MaterialTheme.colorScheme.error)
        data?.optJSONArray("reviews")?.let{a->for(i in 0 until a.length()){val r=a.getJSONObject(i);HorizontalDivider();Text("${r.optString("author")} · ${r.optInt("rating")} / 5",fontSize=13.sp);if(r.optString("review").isNotBlank())Text(r.optString("review"),fontSize=14.sp)}}
    }},confirmButton={TextButton(onClick={reviews=false}){Text("Close")}})
}
