@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package org.syllaboss.app

import android.content.Intent
import android.widget.TextView
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.collectIsDraggedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.*
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.*
import androidx.compose.ui.viewinterop.AndroidView
import com.clerk.api.Clerk
import io.noties.markwon.Markwon
import io.noties.markwon.ext.tables.TablePlugin
import io.noties.markwon.ext.latex.JLatexMathPlugin
import io.noties.markwon.inlineparser.MarkwonInlineParserPlugin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect
import org.json.JSONObject

@Composable internal fun ProfessionalChat(userId: String?, chat: ChatState, scope: CoroutineScope, signIn: () -> Unit, navigate: (Int) -> Unit) {
    val context=LocalContext.current
    val prefs=remember { context.getSharedPreferences("syllaboss-native",0) }
    val clipboard=LocalClipboardManager.current
    val list=rememberLazyListState()
    var navigationOpen by remember { mutableStateOf(false) }
    var showHistory by remember { mutableStateOf(false) }
    var histories by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var loadingHistory by remember { mutableStateOf(false) }
    var loadingChat by remember { mutableStateOf(false) }
    var studyMode by remember { mutableStateOf<String?>(null) }
    var maxStudyItems by remember { mutableIntStateOf(5) }
    var sourceMenu by remember {mutableStateOf(false)}
    var resumeMode by remember {mutableStateOf<String?>(null)}
    var mediaBusy by remember {mutableStateOf(false)}
    var focusedPage by remember {mutableStateOf("")}
    var passagePreview by remember { mutableStateOf("") }
    var focusedLine by remember {mutableStateOf("")}
    var showPassage by remember {mutableStateOf(false)}
    val focusManager=LocalFocusManager.current
    LaunchedEffect(userId) { if(userId!=null) try { maxStudyItems=if(StudyApi.call("membership").optBoolean("paid")) 50 else 5 } catch(_:Exception){} }
    fun rememberThread() { userId?.let { prefs.edit().putString("active-chat:$it",chat.threadId).apply() } }
    fun newChat() { chat.messages.clear();chat.threadId=null;chat.source=null;focusedPage="";focusedLine="";chat.title="New conversation";chat.error=null;rememberThread() }
    fun openThread(id: String) {
        if(chat.sending) return
        loadingChat=true;chat.error=null
        scope.launch {
            try {
                val data=StudyApi.call("conversation&thread="+java.net.URLEncoder.encode(id,"UTF-8"))
                val messages=data.getJSONArray("messages")
                chat.messages.clear()
                for(i in 0 until messages.length()) { val m=messages.getJSONObject(i);chat.messages.add(m.getString("role") to m.getString("content")) }
                if (chat.threadId != id) { chat.source=null; focusedPage=""; focusedLine="" }; chat.threadId=id;chat.title=data.optString("title","Study conversation");rememberThread();showHistory=false
            } catch(e: Exception){chat.error=e.message}
            finally {loadingChat=false}
        }
    }
    LaunchedEffect(userId) {
        if(userId!=null && chat.messages.isEmpty() && chat.threadId==null) prefs.getString("active-chat:$userId",null)?.let { openThread(it) }
    }
    fun send(text: String) {
        val question=text.trim()
        if(chat.sending || question.isBlank()) return
        if(userId==null){signIn();return}
        chat.sending=true;chat.error=null;chat.input=""
        val priorCount=chat.messages.size
        chat.messages.add("user" to question)
        scope.launch {
            try {
                val scopePrefix=if(focusedPage.isNotBlank())"On page $focusedPage${if(focusedLine.isNotBlank())", line $focusedLine" else ""}: " else  ""
                val body=if(chat.source!=null)JSONObject().put("action","document-chat").put("materialId",chat.source!!.getString("id")).put("message",scopePrefix+question)else JSONObject().put("message",question)
                chat.threadId?.let { body.put("threadId",it) }
                val result=StudyApi.call(body=body)
                chat.threadId=result.getString("threadId")
                if(chat.title=="New conversation") chat.title=question.take(60)
                rememberThread();chat.messages.add("assistant" to result.getString("answer"))
            } catch(e: Exception){
                if(chat.messages.size==priorCount+1) chat.messages.removeAt(priorCount)
                chat.input=question;chat.error=e.message ?: "Could not send. Your question is saved below; try again."
            } finally {chat.sending=false}
        }
    }
    val nearBottom by remember { derivedStateOf { !list.canScrollForward } }
    var followLatest by remember { mutableStateOf(true) }
    val dragging by list.interactionSource.collectIsDraggedAsState()
    LaunchedEffect(list, dragging) { snapshotFlow { list.isScrollInProgress to list.canScrollForward }.collect { (scrolling, forward) -> if(dragging) followLatest = !forward else if(!scrolling && !forward) followLatest = true } }
    LaunchedEffect(chat.messages.size,chat.sending) { if(chat.messages.isNotEmpty() && (followLatest || chat.messages.last().first=="user")) list.scrollToConversationEnd() }
    LaunchedEffect(showPassage, focusedPage, focusedLine, chat.source) { if(showPassage && focusedPage.isNotBlank() && chat.source != null) { passagePreview = "Reading the selected passage…"; delay(350); try { passagePreview = StudyApi.call("passage&id="+chat.source!!.getString("id").asQuery()+"&page="+focusedPage+if(focusedLine.isNotBlank()) "&line=$focusedLine" else "").optString("text") } catch(e: Exception) { if(e is CancellationException) throw e; passagePreview = e.message ?: "Passage unavailable" } } }
    if(sourceMenu)NativeSourceSheet(onDismiss={sourceMenu=false;resumeMode?.let{studyMode=it;resumeMode=null}},onPicked={chat.source=it;focusedPage="";focusedLine=""},onError={chat.error=it})
    if(showPassage)AlertDialog(onDismissRequest={showPassage=false},title={Text("Focus on a passage")},text={Column(verticalArrangement=Arrangement.spacedBy(12.dp)){
        Text("Use PDF page numbers. Lines follow the document’s extracted reading order.",fontSize=14.sp,color=Muted)
        OutlinedTextField(focusedPage,{focusedPage=it.filter(Char::isDigit).take(4)},label={Text("Page (optional)")},singleLine=true,keyboardOptions=KeyboardOptions(keyboardType=androidx.compose.ui.text.input.KeyboardType.Number))
        OutlinedTextField(focusedLine,{focusedLine=it.filter(Char::isDigit).take(4)},label={Text("Line (optional)")},singleLine=true,keyboardOptions=KeyboardOptions(keyboardType=androidx.compose.ui.text.input.KeyboardType.Number))
        if(passagePreview.isNotBlank()) Text(passagePreview,modifier=Modifier.heightIn(max=240.dp).verticalScroll(rememberScrollState()),fontSize=13.sp)
    }},confirmButton={TextButton(onClick={showPassage=false}){Text("Use passage")}},dismissButton={TextButton(onClick={focusedPage="";focusedLine="";showPassage=false}){Text("Whole document")}})
    if(showHistory) ModalBottomSheet(onDismissRequest={showHistory=false},containerColor=MaterialTheme.colorScheme.background) {
        LazyColumn(Modifier.fillMaxWidth().heightIn(max=560.dp).navigationBarsPadding(),contentPadding=PaddingValues(24.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
            item { Text("Conversations",fontFamily=WebsiteDisplay,fontSize=30.sp);Text("Pick up where you left off.",color=MaterialTheme.colorScheme.onSurfaceVariant,fontSize=14.sp,modifier=Modifier.padding(top=8.dp)) }
            if(loadingHistory) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
            if(!loadingHistory && histories.isEmpty()) item { Text("Your saved conversations will appear here.",modifier=Modifier.padding(vertical=24.dp)) }
            items(histories) { row -> TextButton(onClick={openThread(row.getString("id"))},modifier=Modifier.fillMaxWidth()) { Icon(Icons.Outlined.ChatBubbleOutline,null,Modifier.size(20.dp));Text(row.optString("title"),modifier=Modifier.weight(1f).padding(14.dp),maxLines=2,color=MaterialTheme.colorScheme.onSurface);Icon(Icons.Outlined.ChevronRight,null) } }
        }
    }
    Column(Modifier.fillMaxSize().imePadding()) {
        Row(Modifier.fillMaxWidth().padding(horizontal=20.dp,vertical=14.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(10.dp)) {
            Box { IconButton(onClick={navigationOpen=true}) { Icon(Icons.Outlined.Menu,"App navigation") }; DropdownMenu(expanded=navigationOpen,onDismissRequest={navigationOpen=false}) { listOf("Today","Library","Boss AI","Peers","Your space").forEachIndexed { index,label -> DropdownMenuItem(text={Text(label)},onClick={navigationOpen=false;navigate(index)}) } } }
            Column(Modifier.weight(1f)) { Text("Boss AI",fontFamily=WebsiteDisplay,fontSize=25.sp);Text(if(chat.threadId==null) "Your study partner" else chat.title,fontSize=12.sp,color=MaterialTheme.colorScheme.onSurfaceVariant,maxLines=1,overflow=TextOverflow.Ellipsis) }
            IconButton(onClick={
                if(userId==null) signIn() else {
                    showHistory=true;loadingHistory=true
                    scope.launch {try {val a=StudyApi.call("conversations").getJSONArray("conversations");histories=(0 until a.length()).map {a.getJSONObject(it)}}catch(e:Exception){chat.error=e.message}finally{loadingHistory=false}}
                }
            },enabled=!chat.sending) {Icon(Icons.Outlined.History,"Conversation history")}
            IconButton(onClick={newChat()},enabled=!chat.sending) {Icon(Icons.Outlined.EditNote,"New conversation")}
        }
        HorizontalDivider(color=MaterialTheme.colorScheme.outline.copy(alpha=.5f))
        chat.source?.let{source->Surface(color=Sage,shape=RoundedCornerShape(16.dp),modifier=Modifier.padding(horizontal=16.dp,vertical=8.dp)){
            Row(Modifier.padding(start=14.dp),verticalAlignment=Alignment.CenterVertically){Icon(Icons.Outlined.Description,null,tint=MaterialTheme.colorScheme.primary,modifier=Modifier.size(20.dp));Column(Modifier.weight(1f).padding(12.dp)){Text(source.optString("title"),maxLines=1,overflow=TextOverflow.Ellipsis,fontSize=13.sp,fontWeight=FontWeight.SemiBold);TextButton(onClick={showPassage=true},contentPadding=PaddingValues(0.dp),modifier=Modifier.height(28.dp)){Text(if(focusedPage.isBlank())"Whole document · choose a passage" else "Page $focusedPage${if(focusedLine.isNotBlank())" · line $focusedLine" else ""}",fontSize=12.sp)}};IconButton(onClick={chat.source=null;focusedPage="";focusedLine=""}){Icon(Icons.Outlined.Close,"Detach source")}}
        }}
        if(loadingChat) LinearProgressIndicator(Modifier.fillMaxWidth())
        if(chat.messages.isEmpty()) {
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(24.dp),verticalArrangement=Arrangement.spacedBy(20.dp)) {
                Spacer(Modifier.height(16.dp));OfficialMark(66.dp)
                Text("What are we\nstudying today?",fontFamily=WebsiteDisplay,fontSize=37.sp,lineHeight=40.sp)
                Text("Bring a question, a difficult concept, or a topic to revise. We’ll work through it together, one clear step at a time.",color=MaterialTheme.colorScheme.onSurfaceVariant,lineHeight=24.sp,fontSize=15.sp)
                listOf("Understand a concept" to "Help me understand a topic. Ask which concept I am studying.","Practise for an exam" to "Help me prepare for an exam. Ask for my course and topic, then quiz me one question at a time.","Plan my revision" to "Help me create a realistic revision plan. Ask about my courses, deadlines and available study time.").forEach { (label,prompt) ->
                    OutlinedCard(onClick={send(prompt)},shape=RoundedCornerShape(18.dp),colors=CardDefaults.outlinedCardColors(containerColor=Color.Transparent)) { Row(Modifier.fillMaxWidth().padding(18.dp),verticalAlignment=Alignment.CenterVertically) {Text(label,Modifier.weight(1f),fontSize=14.sp,fontWeight=FontWeight.Medium);Icon(Icons.Outlined.NorthEast,null,Modifier.size(18.dp))} }
                }
            }
        } else Box(Modifier.weight(1f)) {
            LazyColumn(state=list,modifier=Modifier.fillMaxSize(),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(28.dp)) {
                items(chat.messages.size,key={it}) { index ->
                    val (role,text)=chat.messages[index]
                    var visible by remember {mutableStateOf(false)}
                    LaunchedEffect(Unit){visible=true}
                    androidx.compose.animation.AnimatedVisibility(visible,enter=fadeIn(tween(180))+slideInVertically(tween(220)){it/8}) {
                        Column(Modifier.fillMaxWidth(),horizontalAlignment=if(role=="user") Alignment.End else Alignment.Start) {
                            if(role=="assistant") Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(8.dp)) {OfficialMark(24.dp);Text("Boss AI",fontWeight=FontWeight.SemiBold,fontSize=13.sp)}
                            if(role=="user") androidx.compose.foundation.text.selection.SelectionContainer {Text(text,modifier=Modifier.padding(start=24.dp).clip(RoundedCornerShape(20.dp,20.dp,5.dp,20.dp)).background(MaterialTheme.colorScheme.primary).padding(16.dp),color=MaterialTheme.colorScheme.onPrimary,fontSize=16.sp,lineHeight=25.sp)}
                            else {
                                NativeStudyMessage(text,Modifier.fillMaxWidth().padding(top=12.dp))
                                Row(Modifier.padding(top=8.dp),verticalAlignment=Alignment.CenterVertically) {
                                    var copied by remember {mutableStateOf(false)}
                                    TextButton(onClick={clipboard.setText(AnnotatedString(studyPlainText(text)));copied=true}) {Icon(if(copied) Icons.Outlined.Check else Icons.Outlined.ContentCopy,null,Modifier.size(16.dp));Spacer(Modifier.width(7.dp));Text(if(copied) "Copied" else "Copy",fontSize=12.sp)}
                                    TextButton(onClick={scope.launch { try { val shared=StudyApi.call(body=JSONObject().put("action","share-answer").put("threadId",chat.threadId).put("content",text)); context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {type="text/plain";putExtra(Intent.EXTRA_TEXT,shared.getString("url"))},"Share Syllaboss link")) } catch(e: Exception) { if(e is CancellationException) throw e; chat.error=e.message ?: "Could not create a share link." } }}) {Icon(Icons.Outlined.Share,null,Modifier.size(16.dp));Spacer(Modifier.width(7.dp));Text("Share",fontSize=12.sp)}
                                }
                            }
                        }
                    }
                }
                item(key="conversation-end") { Spacer(Modifier.height(2.dp)) }
                if(chat.sending) item {Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)) {OfficialMark(28.dp);CircularProgressIndicator(Modifier.size(16.dp),strokeWidth=2.dp);Text("Working through your question…",fontSize=13.sp,color=MaterialTheme.colorScheme.onSurfaceVariant)}}
            }
            if(!nearBottom) FilledTonalIconButton(onClick={followLatest=true;scope.launch {list.scrollToConversationEnd()}},modifier=Modifier.align(Alignment.BottomEnd).padding(16.dp)) {Icon(Icons.Outlined.ArrowDownward,"Latest message")}
        }
        chat.error?.let {Text(it,color=MaterialTheme.colorScheme.error,fontSize=13.sp,modifier=Modifier.padding(horizontal=20.dp,vertical=8.dp))}
        if(userId==null) TextButton(onClick=signIn,modifier=Modifier.fillMaxWidth()) {Text("Sign in to chat with Boss")}
        studyMode?.let { mode -> NativeStudyModePanel(mode,maxStudyItems,chat.messages.any { it.first=="user" && it.second.isNotBlank() },chat.sending,{studyMode=null},sourceTitle=chat.source?.optString("title"),error=chat.error,onAttach={resumeMode=mode;studyMode=null;sourceMenu=true}) { topic,count,useChat ->
            if(userId==null) signIn() else { chat.sending=true;chat.error=null;scope.launch {
                try { val scopePrefix=if(focusedPage.isNotBlank())"Page $focusedPage${if(focusedLine.isNotBlank())" line $focusedLine" else ""}. " else "";val body=JSONObject().put("action","study-generate").put("mode",mode).put("topic",scopePrefix+topic).put("count",count).put("useConversation",useChat);chat.threadId?.let{body.put("threadId",it)};chat.source?.let{body.put("sourceMaterialId",it.getString("id"))}; val result=StudyApi.call(body=body);chat.threadId=result.getString("threadId");rememberThread();chat.messages.add("assistant" to result.getString("content"));studyMode=null }
                catch(e:Exception){chat.error=e.message ?: "Study items could not be generated."}finally{chat.sending=false}
            } }
        } }
        Row(Modifier.fillMaxWidth().padding(horizontal=16.dp),horizontalArrangement=Arrangement.spacedBy(6.dp)) { listOf("Flashcards" to "flashcards","MCQ" to "objective","Theory" to "theory").forEach { (label,mode) -> TextButton(onClick={focusManager.clearFocus();studyMode=mode},enabled=!chat.sending){Icon(if(mode=="flashcards")Icons.Outlined.Style else if(mode=="objective")Icons.Outlined.Checklist else Icons.Outlined.EditNote,null,Modifier.size(16.dp));Spacer(Modifier.width(5.dp));Text(label,fontSize=12.sp)} } }
        if(mediaBusy)LinearProgressIndicator(Modifier.fillMaxWidth().padding(horizontal=20.dp))
        Column(Modifier.padding(horizontal=16.dp,vertical=8.dp).fillMaxWidth().border(1.dp,MaterialTheme.colorScheme.outline,RoundedCornerShape(24.dp)).background(MaterialTheme.colorScheme.surfaceContainer,RoundedCornerShape(24.dp)).padding(12.dp)) {
            BasicComposer(chat.input,{chat.input=it.take(6000)},{send(chat.input)},!chat.sending)
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically) {
                Row(verticalAlignment=Alignment.CenterVertically){
                    IconButton(onClick={if(userId==null)signIn()else{focusManager.clearFocus();sourceMenu=true}},enabled=!chat.sending&&!mediaBusy){Icon(Icons.Outlined.Add,"Attach file, library material, or photo",tint=MaterialTheme.colorScheme.primary)}
                    VoiceNoteButton(enabled=!chat.sending&&!mediaBusy,onVoice={uri,_->mediaBusy=true;scope.launch{try{val voice=StudyApi.media(context,uri,purpose="transcribe");chat.input=(chat.input+" "+voice.getString("transcript")).trim().take(6000)}catch(e:Exception){chat.error=e.message}finally{mediaBusy=false}}},onError={chat.error=it})
                    Text("Ask · Learn · Practise",fontSize=11.sp,color=Muted)
                }
                FilledIconButton(onClick={send(chat.input)},enabled=chat.input.isNotBlank()&&!chat.sending&&!mediaBusy,modifier=Modifier.size(42.dp)) {Icon(Icons.Outlined.ArrowUpward,"Send question")}
            }
        }
        Text("AI can make mistakes. Check important answers.",fontSize=10.sp,color=MaterialTheme.colorScheme.onSurfaceVariant,modifier=Modifier.align(Alignment.CenterHorizontally).padding(bottom=8.dp))
    }
}
@Composable private fun BasicComposer(value:String,change:(String)->Unit,send:()->Unit,enabled:Boolean) {
    androidx.compose.foundation.text.BasicTextField(value=value,onValueChange=change,enabled=enabled,modifier=Modifier.fillMaxWidth().heightIn(min=44.dp,max=150.dp),textStyle=MaterialTheme.typography.bodyLarge.copy(color=MaterialTheme.colorScheme.onSurface,lineHeight=25.sp),keyboardOptions=KeyboardOptions(imeAction=ImeAction.Send),keyboardActions=KeyboardActions(onSend={send()}),decorationBox={inner->Box {if(value.isEmpty()) Text("Ask a question…",color=MaterialTheme.colorScheme.onSurfaceVariant,fontSize=16.sp);inner()}})
}
@Composable internal fun NativeAnswer(text:String,modifier:Modifier=Modifier,selectable:Boolean=true) {
    val context=LocalContext.current
    val answerColor = MaterialTheme.colorScheme.onSurface.toArgb()
    val renderer=remember(context, answerColor) {Markwon.builder(context).usePlugin(TablePlugin.create(context)).usePlugin(MarkwonInlineParserPlugin.create()).usePlugin(JLatexMathPlugin.create(16f*context.resources.displayMetrics.scaledDensity){it.inlinesEnabled(true);it.theme().textColor(answerColor)}).build()}
    AndroidView(modifier=modifier,factory={TextView(it).apply {textSize=16f;typeface=androidx.core.content.res.ResourcesCompat.getFont(it,R.font.hanken_grotesk);setTextColor(android.graphics.Color.rgb(30,48,41));setLineSpacing(8f,1.15f);setTextIsSelectable(selectable);setPadding(0,0,0,0)}},update={view->view.setTextColor(answerColor);view.setTextIsSelectable(selectable); renderer.setMarkdown(view,normalizeMath(text)); if(!selectable) { view.movementMethod=null; view.isClickable=false; view.isLongClickable=false; view.isFocusable=false; view.isFocusableInTouchMode=false }})
}
