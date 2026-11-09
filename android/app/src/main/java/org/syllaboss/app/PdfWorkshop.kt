@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package org.syllaboss.app

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Rect
import android.graphics.pdf.PdfDocument
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

@Composable
internal fun PdfWorkshop(back: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    var sources by remember { mutableStateOf<List<Uri>>(emptyList()) }
    var prepared by remember { mutableStateOf<File?>(null) }
    var busy by remember { mutableStateOf(false) }
    var promotion by remember { mutableIntStateOf(0) }
    var note by remember { mutableStateOf("") }
    var membership by remember { mutableStateOf<Boolean?>(null) }
    LaunchedEffect(Unit) { try { membership = StudyApi.call("membership").optBoolean("paid") } catch(e: Exception) { if(e is CancellationException) throw e; note = "Could not check your membership. Retry when exporting." } }
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) {
        sources = (sources + it).distinct()
        note = ""
    }
    val save = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/pdf")) { destination ->
        val file = prepared
        if (destination != null && file != null) {
            busy = true
            scope.launch {
                try {
                    withContext(Dispatchers.IO) {
                        val output = context.contentResolver.openOutputStream(destination) ?: error("Could not open the selected location.")
                        output.use { sink -> file.inputStream().use { it.copyTo(sink) } }
                    }
                    note = "Your PDF was saved."
                } catch (e: Exception) {
                    if (e is CancellationException) throw e
                    note = e.message ?: "Could not save the PDF."
                } finally { busy = false }
            }
        }
    }
    DisposableEffect(prepared) {
        val file = prepared
        onDispose { file?.delete() }
    }
    Scaffold(topBar = { TopAppBar(title = { Text("PDF workshop") }, navigationIcon = { TextButton(onClick = back) { Text("Back") } }) }) { padding ->
        LazyColumn(
            Modifier.fillMaxSize().padding(padding).consumeWindowInsets(padding),
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text("Make one study PDF", style = MaterialTheme.typography.headlineMedium)
                Text("Combine photos, screenshots and existing PDF pages in the order you want.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            item {
                OutlinedButton(enabled = !busy, onClick = { pick.launch(arrayOf("application/pdf", "image/*")) }) { Text("Add PDFs or images") }
            }
            itemsIndexed(sources) { index, uri ->
                Card {
                    Row(Modifier.fillMaxWidth().padding(10.dp)) {
                        Text("${index + 1}. ${uri.lastPathSegment?.substringAfterLast('/') ?: "Document"}", Modifier.weight(1f), maxLines = 2)
                        TextButton(enabled = !busy && index > 0, onClick = {
                            sources = sources.toMutableList().apply { add(index - 1, removeAt(index)) }
                        }) { Text("Up") }
                        TextButton(enabled = !busy, onClick = { sources = sources.filterIndexed { i, _ -> i != index } }) { Text("Remove") }
                    }
                }
            }
            item {
                if (membership == true) Text("SyllaPlus workspace · unlimited pages, direct export", color = MaterialTheme.colorScheme.primary)
                else if (membership == false) Text("Up to 15 pages per PDF. Export unlocks after a 30-second Syllaboss promotion.")
                if (promotion > 0) Text("SyllaPlus · More room for your study materials. Export unlocks in ${promotion}s.")
                if (note.isNotBlank()) Text(note, color = MaterialTheme.colorScheme.primary)
                Button(enabled = sources.isNotEmpty() && !busy, modifier = Modifier.fillMaxWidth(), onClick = {
                    val selection = sources
                    busy = true; note = ""
                    scope.launch {
                        try {
                            val paid = StudyApi.call("membership").optBoolean("paid")
                            membership = paid
                            prepared = combinePdfSources(context, selection, if (paid) null else 15)
                            if (!paid) {
                                promotion = 30
                                while (promotion > 0) {
                                    delay(1000)
                                    if (lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) promotion--
                                }
                            }
                            promotion = 0
                            save.launch("syllaboss-study-pack.pdf")
                        } catch (e: Exception) {
                            if (e is CancellationException) throw e
                            note = e.message ?: "These files could not be converted."
                        } finally { busy = false; promotion = 0 }
                    }
                }) { Text(if (busy) "Preparing your PDF…" else "Build and save PDF") }
            }
        }
    }
}

private suspend fun combinePdfSources(context: Context, sources: List<Uri>, pageLimit: Int?): File = withContext(Dispatchers.IO) {
    val output = File.createTempFile("workshop-", ".pdf", context.cacheDir)
    val resolver = context.contentResolver
    var pageNumber = 0
    fun checkLimit() {
        if (pageLimit != null && pageNumber >= pageLimit) error("This selection exceeds 15 pages. Remove a file or use SyllaPlus.")
    }
    try {
        val pdf = PdfDocument()
        try {
            fun append(bitmap: Bitmap) {
                checkLimit()
                val landscape = bitmap.width > bitmap.height
                val width = if (landscape) 842 else 595
                val height = if (landscape) 595 else 842
                val scale = minOf(width.toFloat() / bitmap.width, height.toFloat() / bitmap.height)
                val w = (bitmap.width * scale).toInt()
                val h = (bitmap.height * scale).toInt()
                val x = (width - w) / 2
                val y = (height - h) / 2
                val page = pdf.startPage(PdfDocument.PageInfo.Builder(width, height, ++pageNumber).create())
                try {
                    page.canvas.drawColor(Color.WHITE)
                    page.canvas.drawBitmap(bitmap, null, Rect(x, y, x + w, y + h), null)
                } finally { pdf.finishPage(page) }
            }
            for (uri in sources) {
                ensureActive()
                checkLimit()
                val mime = resolver.getType(uri).orEmpty()
                if (mime == "application/pdf" || uri.toString().endsWith(".pdf", ignoreCase = true)) {
                    val local = File.createTempFile("workshop-source-", ".pdf", context.cacheDir)
                    try {
                        val input = resolver.openInputStream(uri) ?: error("Could not read this PDF.")
                        input.use { source -> local.outputStream().use { source.copyTo(it) } }
                        PdfRenderer(ParcelFileDescriptor.open(local, ParcelFileDescriptor.MODE_READ_ONLY)).use { renderer ->
                            if (pageLimit != null && renderer.pageCount > pageLimit - pageNumber) error("This selection exceeds 15 pages. Remove a file or use SyllaPlus.")
                            for (index in 0 until renderer.pageCount) {
                                ensureActive()
                                renderer.openPage(index).use { page ->
                                    val scale = 1440f / maxOf(page.width, page.height)
                                    val bitmap = Bitmap.createBitmap((page.width * scale).toInt().coerceAtLeast(1), (page.height * scale).toInt().coerceAtLeast(1), Bitmap.Config.ARGB_8888)
                                    try {
                                        bitmap.eraseColor(Color.WHITE)
                                        page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_PRINT)
                                        append(bitmap)
                                    } finally { bitmap.recycle() }
                                }
                            }
                        }
                    } finally { local.delete() }
                } else {
                    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
                    var sample = 1
                    while (maxOf(bounds.outWidth, bounds.outHeight) / sample > 2000) sample *= 2
                    val bitmap = resolver.openInputStream(uri)?.use {
                        BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
                    } ?: error("This image format could not be opened.")
                    try { append(bitmap) } finally { bitmap.recycle() }
                }
            }
            check(pageNumber > 0) { "The selected files contain no pages." }
            output.outputStream().use(pdf::writeTo)
        } finally { pdf.close() }
        output
    } catch (e: Exception) {
        output.delete()
        throw e
    }
}
