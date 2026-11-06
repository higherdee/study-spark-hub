package org.syllaboss.app

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import org.json.JSONObject
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith

@OptIn(ExperimentalMaterial3Api::class)
@Composable internal fun NativeStudyModePanel(mode: String, maxCount: Int, hasContext: Boolean, busy: Boolean, dismiss: () -> Unit, sourceTitle:String?=null,error:String?=null,onAttach:()->Unit={},generate: (String, Int, Boolean) -> Unit) {
    var topic by remember(mode) { mutableStateOf("") }; var count by remember(mode) { mutableIntStateOf(5) }; var useChat by remember(mode) { mutableStateOf(hasContext) }
    LaunchedEffect(maxCount) { count = count.coerceIn(1,maxCount) }
    ModalBottomSheet(onDismissRequest={if(!busy)dismiss()},containerColor=Paper,sheetState=rememberModalBottomSheetState(skipPartiallyExpanded=true)) {
        Column(Modifier.fillMaxWidth().imePadding().heightIn(max=560.dp).verticalScroll(rememberScrollState()).padding(horizontal=24.dp).padding(bottom=24.dp),verticalArrangement=Arrangement.spacedBy(14.dp)) {
            Text(if(mode=="objective") "Build your practice" else if(mode=="theory")"Work through theory" else "Make it memorable",fontFamily=WebsiteDisplay,fontSize=29.sp,lineHeight=33.sp)
            Text("Choose your source, then make a set to study at your pace.",color=Muted,fontSize=14.sp)
            OutlinedButton(onClick=onAttach,enabled=!busy,modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(16.dp)){Icon(Icons.Outlined.AttachFile,null,Modifier.size(18.dp));Spacer(Modifier.width(8.dp));Text(sourceTitle?:"Add a file or library material",maxLines=1)}
            OutlinedTextField(topic,{topic=it.take(300)},label={Text("What are you studying?")},placeholder={Text("For example, cell division")},modifier=Modifier.fillMaxWidth(),enabled=!busy,singleLine=true)
            if(hasContext) Row(verticalAlignment=Alignment.CenterVertically) { Checkbox(useChat,{useChat=it},enabled=!busy); Text("Use this conversation",fontSize=13.sp) }
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically) { Text("$count items"); TextButton(onClick={count=(count-1).coerceAtLeast(1)},enabled=!busy&&count>1){Text("−")}; TextButton(onClick={count=(count+1).coerceAtMost(maxCount)},enabled=!busy&&count<maxCount){Text("+")} }
            error?.let { Text(it, color=MaterialTheme.colorScheme.error, fontSize=13.sp) }
            Button(onClick={generate(topic.trim(),count,useChat)},enabled=!busy&&(topic.isNotBlank()||hasContext&&useChat||sourceTitle!=null),modifier=Modifier.fillMaxWidth().heightIn(min=52.dp),shape=RoundedCornerShape(16.dp)) { Text(if(busy) "Building your set…" else "Generate ${if(mode=="flashcards")"flashcards" else  if(mode=="objective")"MCQs" else "theory questions"}" ) }
        }
    }
}

internal fun studyPlainText(text: String): String = runCatching {
    val data = JSONObject(text)
    val set = data.optJSONObject("nativeStudySet") ?: data.optJSONObject("flashcardsData") ?: data.optJSONObject("quizData")
    val items = set?.optJSONArray("items") ?: set?.optJSONArray("cards") ?: set?.optJSONArray("questions")
    if (set == null || items == null) data.optString("text", text)
    else buildString {
        appendLine(set.optString("topic", data.optString("text")))
        for (i in 0 until items.length()) {
            val item = items.getJSONObject(i)
            appendLine(); appendLine("${i + 1}. ${item.optString("front", item.optString("question"))}")
            item.optJSONArray("options")?.let { options -> for (n in 0 until options.length()) appendLine("${'A' + n}. ${options.getString(n)}") }
            val answer = item.optString("back", item.optString("modelAnswer", item.optString("explanation")))
            if (answer.isNotBlank()) appendLine(answer)
        }
    }.trim()
}.getOrDefault(text)
@Composable internal fun NativeStudyMessage(text: String, modifier: Modifier = Modifier) {
    val data = remember(text) { runCatching { JSONObject(text) }.getOrNull() }
    val set = data?.optJSONObject("nativeStudySet") ?: data?.optJSONObject("flashcardsData")?.let { JSONObject().put("mode","flashcards").put("topic",it.optString("topic")).put("items",it.optJSONArray("cards")) } ?: data?.optJSONObject("quizData")?.let { JSONObject().put("mode",it.optString("mode")).put("topic",it.optString("topic")).put("items",it.optJSONArray("questions")) }
    val items = set?.optJSONArray("items")
    if (items == null || items.length() == 0) { NativeAnswer(data?.optString("text",text) ?: text,modifier); return }
    var index by remember(text) { mutableIntStateOf(0) }; var flipped by remember(text,index) { mutableStateOf(false) }; var selection by remember(text,index) { mutableIntStateOf(-1) }
    var answer by remember(text,index) { mutableStateOf("") }; var result by remember(text,index) { mutableStateOf<JSONObject?>(null) }; var error by remember(text,index) { mutableStateOf("") }; var busy by remember(text,index) { mutableStateOf(false) }
    var solution by remember(text,index){mutableStateOf<SolutionPhoto?>(null)}
    val scope = rememberCoroutineScope(); val current = items.getJSONObject(index); val mode=set!!.optString("mode"); val colors=listOf(Color(0xFFE2EBD7),Color(0xFFF4E4C9),Color(0xFFDBE8F1),Color(0xFFF0DDE1),Color(0xFFE6DFF1))
    Column(modifier,verticalArrangement=Arrangement.spacedBy(14.dp)) {
        Text(set.optString("topic"),fontFamily=WebsiteDisplay,fontSize=24.sp)
        if(mode=="flashcards") {
            Card(onClick={flipped=!flipped},colors=CardDefaults.cardColors(containerColor=colors[index%colors.size]),shape=RoundedCornerShape(22.dp),modifier=Modifier.fillMaxWidth().heightIn(min=210.dp)) { Column(Modifier.padding(24.dp),verticalArrangement=Arrangement.spacedBy(18.dp)) { Text(if(flipped) "THE ANSWER" else "THINK IT THROUGH",fontSize=11.sp,color=MaterialTheme.colorScheme.primary); AnimatedContent(targetState=flipped,transitionSpec={fadeIn(tween(160)).togetherWith(fadeOut(tween(100)))},label="Reveal flashcard"){back->NativeAnswer(current.optString(if(back) "back" else "front"))}; Text("Tap to ${if(flipped) "see the question" else "reveal the answer"}",fontSize=12.sp,color=Muted) } }
        } else {
            NativeAnswer(current.optString("question"))
            val options = current.optJSONArray("options")
            if((mode=="objective"||mode=="mcq") && options != null) {
                for(n in 0 until options.length()) OutlinedButton(onClick={selection=n},enabled=selection<0,modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(14.dp)) { NativeAnswer("${('A'.code+n).toChar()}. ${options.getString(n)}",modifier=Modifier.fillMaxWidth(), selectable=false) }
                if(selection>=0) { Text(if(selection==current.optInt("correctOptionIndex")) "Correct. Well done." else "The correct answer is ${('A'.code+current.optInt("correctOptionIndex")).toChar()}.",color=MaterialTheme.colorScheme.primary); NativeAnswer(current.optString("explanation",current.optString("modelAnswer"))) }
            } else {
                OutlinedTextField(answer,{answer=it.take(12000)},label={Text("Work through your answer")},modifier=Modifier.fillMaxWidth(),minLines=3,enabled=!busy)
                SolutionPhotoPicker(solution,!busy,{solution=it},{error=it})
                Button(onClick={busy=true;error="";scope.launch { try { val body=JSONObject().put("action","grade-theory").put("question",current.optString("question")).put("modelAnswer",current.optString("modelAnswer")).put("studentAnswer",answer).put("maxScore",current.optInt("marks",10));solution?.let{body.put("imageBase64",it.base64)};result=StudyApi.call(body=body) } catch(e:Exception){error=e.message ?: "Your answer could not be marked."} finally{busy=false} }},enabled=(answer.isNotBlank()||solution!=null)&&!busy) { Text(if(busy) "Reading your working…" else "Mark my answer") }
                result?.let { assessment ->
                    Text("${assessment.optDouble("score")} / ${assessment.optInt("maxScore",10)} marks",fontSize=24.sp,fontFamily=WebsiteDisplay)
                    NativeAnswer(assessment.optString("feedback"))
                    assessment.optJSONArray("criteria")?.let { criteria -> for (n in 0 until criteria.length()) {
                        val criterion=criteria.getJSONObject(n)
                        OutlinedCard(Modifier.fillMaxWidth(),shape=RoundedCornerShape(16.dp)) { Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
                            Text("${criterion.optString("criterion")} · ${criterion.optDouble("earned")} / ${criterion.optDouble("possible")}",fontSize=14.sp)
                            if(criterion.optString("evidence").isNotBlank()) NativeAnswer("“${criterion.optString("evidence")}”")
                            NativeAnswer(criterion.optString("reason"))
                        } }
                    } }
                }; if(error.isNotBlank()) Text(error,color=MaterialTheme.colorScheme.error)
                TextButton(onClick={flipped=!flipped}) {Text(if(flipped) "Hide model answer" else "Read model answer")}; if(flipped) NativeAnswer(current.optString("modelAnswer"))
            }
        }
        Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically) { TextButton(onClick={index--},enabled=index>0&&!busy){Text("Previous")}; Text("${index+1} / ${items.length()}",fontSize=13.sp);TextButton(onClick={index++},enabled=index+1<items.length()&&!busy){Text("Next")} }
    }
}
