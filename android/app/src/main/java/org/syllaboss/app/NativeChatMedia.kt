@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package org.syllaboss.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.net.Uri
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import kotlinx.coroutines.*
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File

internal fun mediaFile(context:android.content.Context,extension:String):Pair<File,Uri> {
    val dir=File(context.cacheDir,"chat-media").apply{mkdirs()}
    val file=File.createTempFile("capture-",extension,dir)
    return file to FileProvider.getUriForFile(context,"${context.packageName}.updates",file)
}

@Composable internal fun NativeSourceSheet(target:String?=null,onDismiss:()->Unit,onPicked:(JSONObject)->Unit,onError:(String)->Unit) {
    val context=LocalContext.current;val scope=rememberCoroutineScope()
    var library by remember{mutableStateOf(false)};var query by remember{mutableStateOf("")}
    var materials by remember{mutableStateOf<List<JSONObject>>(emptyList())};var busy by remember{mutableStateOf(false)}
    var error by remember{mutableStateOf("")};var cameraUri by remember{mutableStateOf<Uri?>(null)}
    fun upload(uri:Uri){busy=true;error="";scope.launch{try{onPicked(StudyApi.media(context,uri,target=target));onDismiss()}catch(e:Exception){if(e is CancellationException)throw e;error=e.message?:"File could not be attached."}finally{busy=false}}}
    val picker=rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()){uri->uri?.let{upload(it)}}
    val camera=rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()){ok->if(ok)cameraUri?.let{uri->
        busy=true;scope.launch{try{val compact=compactPhoto(context,uri);val temp=mediaFile(context,".jpg");withContext(Dispatchers.IO){temp.first.writeBytes(Base64.decode(compact.base64,Base64.DEFAULT))};onPicked(StudyApi.media(context,temp.second,target=target));onDismiss()}catch(e:Exception){error=e.message?:"Photo could not be attached."}finally{busy=false}}
    }}
    LaunchedEffect(query,library){if(library){delay(300);busy=true;try{val data=StudyApi.call("library&q="+java.net.URLEncoder.encode(query,"UTF-8")).getJSONArray("materials");materials=(0 until data.length()).map{data.getJSONObject(it)}}catch(e:Exception){if(e is CancellationException)throw e;error=e.message?:"Library unavailable."}finally{busy=false}}}
    ModalBottomSheet(onDismissRequest={if(!busy)onDismiss()},containerColor=Paper) {
        Column(Modifier.fillMaxWidth().padding(horizontal=24.dp).navigationBarsPadding(),verticalArrangement=Arrangement.spacedBy(12.dp)) {
            Text(if(library)"Choose a library material" else "Bring your material",fontFamily=WebsiteDisplay,fontSize=29.sp)
            Text(if(target==null)"Study a PDF or photo privately, or work from your course library." else "Share a document, a photo, or a course material in this conversation.",color=Muted,fontSize=14.sp,lineHeight=21.sp)
            if(busy)LinearProgressIndicator(Modifier.fillMaxWidth())
            if(error.isNotBlank())Text(error,color=MaterialTheme.colorScheme.error,fontSize=13.sp)
            if(!library){
                listOf(Triple("Upload a file","PDF or image · up to 3 MB",Icons.Outlined.UploadFile),Triple("Course library","Notes and past questions",Icons.Outlined.MenuBook),Triple("Take a photo","A page, diagram, or written question",Icons.Outlined.PhotoCamera)).forEachIndexed{index,item->
                    Surface(onClick={if(!busy)when(index){0->picker.launch(arrayOf("application/pdf","image/*"));1->library=true;else->try{cameraUri=mediaFile(context,".jpg").second;camera.launch(cameraUri!!)}catch(_:Exception){error="No camera app is available. Choose a photo from your files."}}},shape=RoundedCornerShape(18.dp),color=androidx.compose.ui.graphics.Color.White,modifier=Modifier.fillMaxWidth()){
                        Row(Modifier.padding(18.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(16.dp)){Icon(item.third,null,tint=Forest);Column(Modifier.weight(1f)){Text(item.first,fontWeight=FontWeight.SemiBold);Text(item.second,color=Muted,fontSize=12.sp)};Icon(Icons.Outlined.ChevronRight,null,tint=Muted)}
                    }
                }
            }else{
                OutlinedTextField(query,{query=it.take(100)},placeholder={Text("Search a title or course")},leadingIcon={Icon(Icons.Outlined.Search,null)},modifier=Modifier.fillMaxWidth(),singleLine=true,shape=RoundedCornerShape(16.dp))
                LazyColumn(Modifier.fillMaxWidth().heightIn(max=320.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){
                    if(!busy&&materials.isEmpty())item{Text("No materials match this search.",modifier=Modifier.padding(20.dp),color=Muted)}
                    items(materials,key={it.getString("id")}){m->TextButton(onClick={if(!busy){busy=true;scope.launch{try{val source=if(target==null)StudyApi.call("source&id="+m.getString("id"))else JSONObject().put("id",m.getString("id")).put("title",m.optString("title"));onPicked(source.put("library",true));onDismiss()}catch(e:Exception){error=e.message?:"This material could not be attached.";onError(error)}finally{busy=false}}}},modifier=Modifier.fillMaxWidth()){
                        Icon(Icons.Outlined.Description,null);Column(Modifier.weight(1f).padding(horizontal=12.dp)){Text(m.optString("title"),maxLines=2,color=Ink);Text(m.optString("course_code"),fontSize=12.sp,color=Muted)};Icon(Icons.Outlined.Add,null)
                    }}
                }
            }
            TextButton(onClick={if(library)library=false else onDismiss()},enabled=!busy,modifier=Modifier.fillMaxWidth()){Text(if(library)"Back to attachments" else "Cancel")}
            Spacer(Modifier.height(12.dp))
        }
    }
}

@Composable internal fun VoiceNoteButton(enabled:Boolean=true,onVoice:(Uri,Int)->Unit,onError:(String)->Unit) {
    val context=LocalContext.current
    var recorder by remember{mutableStateOf<MediaRecorder?>(null)};var output by remember{mutableStateOf<Pair<File,Uri>?>(null)}
    var recording by remember{mutableStateOf(false)};var seconds by remember{mutableIntStateOf(0)};var preview by remember{mutableStateOf(false)}
    var player by remember{mutableStateOf<MediaPlayer?>(null)};var playing by remember{mutableStateOf(false)}
    fun stop(){val r=recorder;recorder=null;recording=false;try{r?.stop();preview=true}catch(_:Exception){preview=false;onError("No audio was captured. Hold the recording for a little longer.")}finally{r?.release()}}
    fun start(){try{
        output=mediaFile(context,".m4a");seconds=0
        @Suppress("DEPRECATION") val r=MediaRecorder()
        recorder=r; r.setAudioSource(MediaRecorder.AudioSource.MIC);r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);r.setAudioEncodingBitRate(64000);r.setAudioSamplingRate(44100);r.setOutputFile(output!!.first.absolutePath);r.prepare();r.start();recording=true
    }catch(_:Exception){recorder?.release();recorder=null;onError("Your microphone could not start. Check microphone permission or use the keyboard.")}}
    val permission=rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()){granted->if(granted)start()else onError("Microphone permission is needed to record. You can still type your message.")}
    LaunchedEffect(recording){if(recording)while(recording){delay(1000);seconds++;if(seconds>=120)stop()}}
    DisposableEffect(Unit){onDispose{runCatching{recorder?.stop()};recorder?.release();player?.release()}}
    IconButton(onClick={if(ContextCompat.checkSelfPermission(context,Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED)start()else permission.launch(Manifest.permission.RECORD_AUDIO)},enabled=enabled&&!recording&&!preview){Icon(Icons.Outlined.Mic,"Record a voice note",tint=Forest)}
    if(recording||preview)AlertDialog(onDismissRequest={if(recording)stop()else{player?.release();player=null;preview=false}},icon={Icon(if(recording)Icons.Outlined.Mic else Icons.Outlined.GraphicEq,null)},title={Text(if(recording)"Recording your voice" else "Review your voice note")},text={Column(verticalArrangement=Arrangement.spacedBy(12.dp)){
        Text("%d:%02d".format(seconds/60,seconds%60),fontFamily=WebsiteDisplay,fontSize=36.sp)
        Text(if(recording)"Up to two minutes. Stop when you’re ready." else "Listen first, then use this recording or try again.",color=Muted)
        if(preview)OutlinedButton(onClick={if(playing){player?.pause();playing=false}else try{if(player==null){player=MediaPlayer().apply{setDataSource(output!!.first.absolutePath);prepare();setOnCompletionListener{playing=false}}};player?.start();playing=true}catch(_:Exception){onError("The recording could not be played.")}}){Icon(if(playing)Icons.Outlined.Pause else Icons.Outlined.PlayArrow,null);Text(if(playing)"Pause" else "Play recording")}
    }},confirmButton={TextButton(onClick={if(recording)stop()else{player?.release();player=null;playing=false;preview=false;output?.let{onVoice(it.second,seconds)}}}){Text(if(recording)"Stop recording" else "Use voice note")}},dismissButton={TextButton(onClick={if(recording){runCatching{recorder?.stop()};recorder?.release();recorder=null;recording=false};player?.release();player=null;playing=false;preview=false}){Text("Discard")}})
}

internal data class SolutionPhoto(val base64:String,val bitmap:Bitmap)
internal suspend fun compactPhoto(context:android.content.Context,uri:Uri):SolutionPhoto=withContext(Dispatchers.IO){
    val bounds=BitmapFactory.Options().apply{inJustDecodeBounds=true};context.contentResolver.openInputStream(uri)?.use{BitmapFactory.decodeStream(it,null,bounds)}
    if(bounds.outWidth<=0||bounds.outHeight<=0)throw IllegalStateException("Choose a readable solution photo.")
    var sample=1;while(maxOf(bounds.outWidth,bounds.outHeight)/sample>1800)sample*=2
    val bitmap=context.contentResolver.openInputStream(uri)?.use{BitmapFactory.decodeStream(it,null,BitmapFactory.Options().apply{inSampleSize=sample})}?:throw IllegalStateException("This photo could not be read.")
    val out=ByteArrayOutputStream();bitmap.compress(Bitmap.CompressFormat.JPEG,85,out)
    if(out.size()>2_000_000)throw IllegalStateException("Choose a smaller, clearer photo of the solution.")
    SolutionPhoto(Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP),bitmap)
}
@Composable internal fun SolutionPhotoPicker(photo:SolutionPhoto?,enabled:Boolean,onPhoto:(SolutionPhoto?)->Unit,onError:(String)->Unit) {
    val context=LocalContext.current;val scope=rememberCoroutineScope();var cameraUri by remember{mutableStateOf<Uri?>(null)}
    fun read(uri:Uri){scope.launch{try{onPhoto(compactPhoto(context,uri))}catch(e:Exception){onError(e.message?:"Photo could not be read.")}}}
    val gallery=rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()){it?.let{uri->read(uri)}}
    val camera=rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()){if(it)cameraUri?.let{uri->read(uri)}}
    Row(horizontalArrangement=Arrangement.spacedBy(8.dp),verticalAlignment=Alignment.CenterVertically){
        OutlinedButton(onClick={try{cameraUri=mediaFile(context,".jpg").second;camera.launch(cameraUri!!)}catch(_:Exception){onError("No camera is available. Choose a photo instead.")}},enabled=enabled){Icon(Icons.Outlined.PhotoCamera,null,Modifier.size(18.dp));Spacer(Modifier.width(6.dp));Text("Snap solution",fontSize=12.sp)}
        TextButton(onClick={gallery.launch(arrayOf("image/*"))},enabled=enabled){Icon(Icons.Outlined.Image,null,Modifier.size(18.dp));Spacer(Modifier.width(6.dp));Text("Choose photo",fontSize=12.sp)}
    }
    photo?.let{Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)){Image(it.bitmap.asImageBitmap(),"Your attached solution",Modifier.size(72.dp));Text("Solution photo attached",Modifier.weight(1f),fontSize=13.sp);IconButton(onClick={onPhoto(null)},enabled=enabled){Icon(Icons.Outlined.Close,"Remove solution photo")}}}
}

@Composable internal fun NativeAttachmentMessage(media:JSONObject,modifier:Modifier=Modifier) {
    val context=LocalContext.current;val scope=rememberCoroutineScope();var busy by remember{mutableStateOf(false)};var playing by remember{mutableStateOf(false)};var error by remember{mutableStateOf("")};var player by remember{mutableStateOf<MediaPlayer?>(null)}
    val audio=media.optString("mime").startsWith("audio/")
    DisposableEffect(Unit){onDispose{player?.release()}}
    Column(modifier,verticalArrangement=Arrangement.spacedBy(6.dp)){
        Surface(onClick={if(!busy){if(audio&&playing){player?.pause();playing=false}else{busy=true;scope.launch{try{
            if(audio&&player!=null){player?.start();playing=true}else{val file=StudyApi.downloadMedia(context,media.getString("id"));if(audio){player=MediaPlayer().apply{setDataSource(file.absolutePath);prepare();setOnCompletionListener{playing=false};start()};playing=true}else{val uri=FileProvider.getUriForFile(context,"${context.packageName}.updates",file);context.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri,media.optString("mime","application/pdf")).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))}}
        }catch(e:Exception){error=e.message?:"Attachment could not be opened."}finally{busy=false}}}}},shape=RoundedCornerShape(16.dp),color=Sage){
            Row(Modifier.padding(14.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)){
                if(busy)CircularProgressIndicator(Modifier.size(22.dp),strokeWidth=2.dp)else Icon(if(audio){if(playing)Icons.Outlined.Pause else Icons.Outlined.PlayArrow}else Icons.Outlined.Description,null,tint=Forest)
                Column(Modifier.weight(1f)){Text(if(audio)"Voice note" else  media.optString("title","Document"),fontWeight=FontWeight.Medium,maxLines=2);Text(if(audio)"${media.optInt("duration")} seconds · tap to ${if(playing)"pause" else "play"}" else "Tap to open · ${(media.optInt("bytes")/1024).coerceAtLeast(1)} KB",fontSize=12.sp,color=Muted)}
            }
        }
        if(error.isNotBlank())Text(error,fontSize=12.sp,color=MaterialTheme.colorScheme.error)
    }
}
