package org.syllaboss.app

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import org.json.JSONObject
import kotlin.math.roundToInt

@Composable internal fun NativeReaderTools(material: Material, modifier: Modifier = Modifier) {
    val scope=rememberCoroutineScope();val density=LocalDensity.current;val context=LocalContext.current
    var open by remember {mutableStateOf(false)};var minimized by remember {mutableStateOf(false)}
    var x by remember {mutableFloatStateOf(12f)};var y by remember {mutableFloatStateOf(12f)};var width by remember {mutableFloatStateOf(320f)};var height by remember {mutableFloatStateOf(440f)}
    var input by remember {mutableStateOf("")};var messages by remember {mutableStateOf<List<Pair<String,String>>>(emptyList())};var thread by remember {mutableStateOf<String?>(null)};var busy by remember {mutableStateOf(false)};var error by remember {mutableStateOf("")};var paid by remember {mutableStateOf<Boolean?>(null)}
    LaunchedEffect(material.id) {try{paid=StudyApi.call("membership").optBoolean("paid")}catch(e:Exception){if(e is kotlinx.coroutines.CancellationException) throw e}}
    BoxWithConstraints(modifier.fillMaxSize()) {
        val maxW=maxWidth.value;val maxH=maxHeight.value
        val availableW=maxOf(1f,maxW-16);val availableH=maxOf(1f,maxH-16)
        LaunchedEffect(maxW,maxH) {width=width.coerceIn(minOf(260f,availableW),availableW);height=height.coerceIn(minOf(240f,availableH),availableH)}
        val limitX=with(density){(maxW-width-8).dp.toPx()}.coerceAtLeast(0f);val limitY=with(density){(maxH-height-8).dp.toPx()}.coerceAtLeast(0f)
        LaunchedEffect(limitX,limitY) {x=x.coerceIn(0f,limitX);y=y.coerceIn(0f,limitY)}
        if(!open||minimized) FilledTonalButton(onClick={open=true;minimized=false},modifier=Modifier.align(Alignment.BottomEnd).padding(14.dp)) {Icon(Icons.Outlined.AutoAwesome,null);Spacer(Modifier.width(8.dp));Text("Read with Boss AI")}
        if(open&&!minimized) Surface(modifier=Modifier.offset{IntOffset(x.roundToInt(),y.roundToInt())}.width(width.dp).height(height.dp),shape=RoundedCornerShape(22.dp),shadowElevation=12.dp,tonalElevation=2.dp) {
            Box {
                Column(Modifier.fillMaxSize()) {
                    Row(Modifier.fillMaxWidth().background(Sage).pointerInput(limitX,limitY){detectDragGestures { change,amount->change.consume();x=(x+amount.x).coerceIn(0f,limitX);y=(y+amount.y).coerceIn(0f,limitY) }}.padding(start=12.dp),verticalAlignment=Alignment.CenterVertically) {
                        OfficialMark(24.dp);Text("Boss AI",modifier=Modifier.weight(1f).padding(start=8.dp),fontSize=14.sp)
                        IconButton(onClick={minimized=true}){Icon(Icons.Outlined.Remove,"Minimize AI window")};IconButton(onClick={open=false}){Icon(Icons.Outlined.Close,"Close AI window")}
                    }
                    if(paid!=true) Column(Modifier.weight(1f).padding(20.dp),verticalArrangement=Arrangement.Center) {
                        Text("Keep the page and explanation together.",fontFamily=WebsiteDisplay,fontSize=24.sp)
                        Spacer(Modifier.height(12.dp))
                        Text(if(paid==false) "Inline library study is included with SyllaPlus. Your free account can read this material and ask about a topic in Boss AI." else "Checking your membership. Close and reopen the material if your connection was interrupted.",fontSize=14.sp)
                        if(paid==false) TextButton(onClick={context.startActivity(android.content.Intent(context,MainActivity::class.java).setData(android.net.Uri.parse("syllaboss://billing")))}) {Text("See SyllaPlus plans")}
                    }
                    else {
                        LazyColumn(Modifier.weight(1f),contentPadding=PaddingValues(16.dp),verticalArrangement=Arrangement.spacedBy(18.dp)) {
                            if(messages.isEmpty()) item {Text("Ask about a passage, a worked example or a diagram. Move this window to keep your place.",fontSize=14.sp,color=Muted)}
                            items(messages) { (role,text)->if(role=="user") Text(text,modifier=Modifier.fillMaxWidth().background(Sage,RoundedCornerShape(14.dp)).padding(12.dp)) else NativeAnswer(text) }
                            if(busy) item {LinearProgressIndicator(Modifier.fillMaxWidth());Text("Reading your material…",fontSize=12.sp)}
                        }
                        if(error.isNotBlank()) Text(error,modifier=Modifier.padding(horizontal=12.dp),fontSize=12.sp,color=MaterialTheme.colorScheme.error)
                        Row(Modifier.padding(12.dp),verticalAlignment=Alignment.Bottom,horizontalArrangement=Arrangement.spacedBy(4.dp)) {
                            OutlinedTextField(input,{input=it.take(6000)},placeholder={Text("Ask about this page…",fontSize=14.sp)},modifier=Modifier.weight(1f),maxLines=3,enabled=!busy,shape=RoundedCornerShape(16.dp))
                            IconButton(onClick={val question=input.trim();input="";busy=true;error="";scope.launch {try {val body=JSONObject().put("action","document-chat").put("materialId",material.id).put("message",question);thread?.let{body.put("threadId",it)};val response=StudyApi.call(body=body);thread=response.getString("threadId");messages=messages+listOf("user" to question,"assistant" to response.getString("answer"))}catch(e:Exception){error=e.message ?: "Please try again.";input=question}finally{busy=false}}},enabled=!busy&&input.isNotBlank()){Icon(Icons.Outlined.ArrowUpward,"Send document question")}
                        }
                    }
                }
                Icon(Icons.Outlined.OpenInFull,contentDescription="Drag to resize AI window",modifier=Modifier.align(Alignment.BottomEnd).size(22.dp).pointerInput(maxW,maxH){detectDragGestures {change,amount->change.consume();width=(width+with(density){amount.x.toDp().value}).coerceIn(minOf(260f,maxW-16),maxW-16);height=(height+with(density){amount.y.toDp().value}).coerceIn(minOf(240f,maxH-16),maxH-16)}},tint=Muted)
            }
        }
    }
}
