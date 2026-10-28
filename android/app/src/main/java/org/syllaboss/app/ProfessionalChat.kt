@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package org.syllaboss.app

import android.content.Intent
import android.widget.TextView
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
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
import org.json.JSONObject

@Composable internal fun ProfessionalChat(userId: String?, chat: ChatState, scope: CoroutineScope, signIn: () -> Unit) {
    val context=LocalContext.current
    val prefs=remember { context.getSharedPreferences("syllaboss-native",0) }
    val clipboard=LocalClipboardManager.current
    val list=rememberLazyListState()
    var showHistory by remember { mutableStateOf(false) }
    var histories by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var loadingHistory by remember { mutableStateOf(false) }
    var loadingChat by remember { mutableStateOf(false) }
    fun rememberThread() { userId?.let { prefs.edit().putString("active-chat:$it",chat.threadId).apply() } }
    fun newChat() { chat.messages.clear();chat.threadId=null;chat.title="New conversation";chat.error=null;rememberThread() }
    fun openThread(id: String) {
        if(chat.sending) return
        loadingChat=true;chat.error=null
        scope.launch {
            try {
                val data=StudyApi.call("conversation&thread="+java.net.URLEncoder.encode(id,"UTF-8"))
                val messages=data.getJSONArray("messages")
                chat.messages.clear()
                for(i in 0 until messages.length()) { val m=messages.getJSONObject(i);chat.messages.add(m.getString("role") to m.getString("content")) }
                chat.threadId=id;chat.title=data.optString("title","Study conversation");rememberThread();showHistory=false
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
                val body=JSONObject().put("message",question)
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
    val nearBottom by remember { derivedStateOf { list.layoutInfo.visibleItemsInfo.lastOrNull()?.index?.let { it>=chat.messages.size-2 } ?: true } }
    LaunchedEffect(chat.messages.size,chat.sending) { if(chat.messages.isNotEmpty() && (nearBottom || chat.messages.last().first=="user")) list.animateScrollToItem(chat.messages.lastIndex) }
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
            OfficialMark(36.dp)
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
                    AnimatedVisibility(visible,enter=fadeIn(tween(180))+slideInVertically(tween(220)){it/8}) {
                        Column(Modifier.fillMaxWidth(),horizontalAlignment=if(role=="user") Alignment.End else Alignment.Start) {
                            if(role=="assistant") Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(8.dp)) {OfficialMark(24.dp);Text("Boss AI",fontWeight=FontWeight.SemiBold,fontSize=13.sp)}
                            if(role=="user") androidx.compose.foundation.text.selection.SelectionContainer {Text(text,modifier=Modifier.padding(start=24.dp).clip(RoundedCornerShape(20.dp,20.dp,5.dp,20.dp)).background(MaterialTheme.colorScheme.primary).padding(16.dp),color=MaterialTheme.colorScheme.onPrimary,fontSize=16.sp,lineHeight=25.sp)}
                            else {
                                NativeAnswer(text,Modifier.fillMaxWidth().padding(top=12.dp))
                                Row(Modifier.padding(top=8.dp),verticalAlignment=Alignment.CenterVertically) {
                                    var copied by remember {mutableStateOf(false)}
                                    TextButton(onClick={clipboard.setText(AnnotatedString(text));copied=true}) {Icon(if(copied) Icons.Outlined.Check else Icons.Outlined.ContentCopy,null,Modifier.size(16.dp));Spacer(Modifier.width(7.dp));Text(if(copied) "Copied" else "Copy",fontSize=12.sp)}
                                    TextButton(onClick={context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {type="text/plain";putExtra(Intent.EXTRA_TEXT,text)},"Share answer"))}) {Icon(Icons.Outlined.Share,null,Modifier.size(16.dp));Spacer(Modifier.width(7.dp));Text("Share",fontSize=12.sp)}
                                }
                            }
                        }
                    }
                }
                if(chat.sending) item {Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)) {OfficialMark(28.dp);CircularProgressIndicator(Modifier.size(16.dp),strokeWidth=2.dp);Text("Working through your question…",fontSize=13.sp,color=MaterialTheme.colorScheme.onSurfaceVariant)}}
            }
            if(!nearBottom) FilledTonalIconButton(onClick={scope.launch {list.animateScrollToItem(chat.messages.lastIndex)}},modifier=Modifier.align(Alignment.BottomEnd).padding(16.dp)) {Icon(Icons.Outlined.ArrowDownward,"Latest message")}
        }
        chat.error?.let {Text(it,color=MaterialTheme.colorScheme.error,fontSize=13.sp,modifier=Modifier.padding(horizontal=20.dp,vertical=8.dp))}
        if(userId==null) TextButton(onClick=signIn,modifier=Modifier.fillMaxWidth()) {Text("Sign in to chat with Boss")}
        Column(Modifier.padding(horizontal=16.dp,vertical=8.dp).fillMaxWidth().border(1.dp,MaterialTheme.colorScheme.outline,RoundedCornerShape(24.dp)).background(Color.White,RoundedCornerShape(24.dp)).padding(12.dp)) {
            BasicComposer(chat.input,{chat.input=it.take(6000)},{send(chat.input)},!chat.sending)
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically) {
                Text("Explain · Practise · Revise",fontSize=11.sp,color=MaterialTheme.colorScheme.onSurfaceVariant)
                FilledIconButton(onClick={send(chat.input)},enabled=chat.input.isNotBlank()&&!chat.sending,modifier=Modifier.size(42.dp)) {Icon(Icons.Outlined.ArrowUpward,"Send question")}
            }
        }
        Text("AI can make mistakes. Check important answers.",fontSize=10.sp,color=MaterialTheme.colorScheme.onSurfaceVariant,modifier=Modifier.align(Alignment.CenterHorizontally).padding(bottom=8.dp))
    }
}
@Composable private fun BasicComposer(value:String,change:(String)->Unit,send:()->Unit,enabled:Boolean) {
    androidx.compose.foundation.text.BasicTextField(value=value,onValueChange=change,enabled=enabled,modifier=Modifier.fillMaxWidth().heightIn(min=44.dp,max=150.dp),textStyle=MaterialTheme.typography.bodyLarge.copy(color=MaterialTheme.colorScheme.onSurface,lineHeight=25.sp),keyboardOptions=KeyboardOptions(imeAction=ImeAction.Send),keyboardActions=KeyboardActions(onSend={send()}),decorationBox={inner->Box {if(value.isEmpty()) Text("Ask a question…",color=MaterialTheme.colorScheme.onSurfaceVariant,fontSize=16.sp);inner()}})
}
@Composable internal fun NativeAnswer(text:String,modifier:Modifier=Modifier) {
    val context=LocalContext.current
    val renderer=remember {Markwon.builder(context).usePlugin(TablePlugin.create(context)).usePlugin(MarkwonInlineParserPlugin.create()).usePlugin(JLatexMathPlugin.create(16f*context.resources.displayMetrics.scaledDensity){it.inlinesEnabled(true)}).build()}
    AndroidView(modifier=modifier,factory={TextView(it).apply {textSize=16f;typeface=androidx.core.content.res.ResourcesCompat.getFont(it,R.font.hanken_grotesk);setTextColor(android.graphics.Color.rgb(30,48,41));setLineSpacing(8f,1.15f);setTextIsSelectable(true);setPadding(0,0,0,0)}},update={view->renderer.setMarkdown(view,normalizeMath(text))})
}
private fun normalizeMath(text: String): String {
    val pair = "${'$'}${'$'}"
    return text.replace(Regex("""\\\[([\s\S]*?)\\\]""")) { "\n$pair\n${it.groupValues[1]}\n$pair\n" }
        .replace(Regex("""\\\(([\s\S]*?)\\\)""")) { "$pair${it.groupValues[1]}$pair" }
        .replace(Regex("""(?<![$])[$](?![$])([^\n$]+)[$](?![$])""")) { "$pair${it.groupValues[1]}$pair" }
}
