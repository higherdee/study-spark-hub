@file:OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
package org.syllaboss.app

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.compose.foundation.Image
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.collect
import java.io.File

@Composable internal fun ReaderPages(file: File, count: Int, page: Int, onPage: (Int)->Unit, continuous: Boolean, title: String) {
    if(count<1) return
    val pager=rememberPagerState(initialPage=page.coerceIn(0,count-1),pageCount={count})
    val list=rememberLazyListState(initialFirstVisibleItemIndex=page.coerceIn(0,count-1))
    val latestOnPage by rememberUpdatedState(onPage)
    LaunchedEffect(continuous) {
        if(continuous) { list.scrollToItem(page.coerceIn(0,count-1)) } else { pager.scrollToPage(page.coerceIn(0,count-1)) }
        if(continuous) snapshotFlow { list.firstVisibleItemIndex }.distinctUntilChanged().collect { latestOnPage(it) }
        else snapshotFlow { pager.settledPage }.distinctUntilChanged().collect { latestOnPage(it) }
    }
    LaunchedEffect(page,continuous) {
        if(continuous && list.firstVisibleItemIndex!=page && !list.isScrollInProgress) list.animateScrollToItem(page.coerceIn(0,count-1))
        if(!continuous && pager.currentPage!=page && !pager.isScrollInProgress) pager.animateScrollToPage(page.coerceIn(0,count-1))
    }
    if(continuous) LazyColumn(Modifier.fillMaxSize(),state=list,contentPadding=PaddingValues(8.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
        items((0 until count).toList(),key={it}) { number -> ReaderPage(file,number,title) }
    } else HorizontalPager(state=pager,modifier=Modifier.fillMaxSize(),pageSpacing=12.dp) { number ->
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(8.dp),verticalArrangement=Arrangement.Center) { ReaderPage(file,number,title) }
    }
}

@Composable private fun ReaderPage(file: File, number: Int, title: String) {
    var image by remember(file,number) { mutableStateOf<Bitmap?>(null) }
    var failed by remember(file,number) { mutableStateOf(false) }
    var retry by remember { mutableIntStateOf(0) }
    var scale by remember { mutableFloatStateOf(1f) }
    var dx by remember { mutableFloatStateOf(0f) };var dy by remember { mutableFloatStateOf(0f) }
    LaunchedEffect(file,number,retry) {
        failed=false
        try { image=withContext(Dispatchers.IO) {
            PdfRenderer(ParcelFileDescriptor.open(file,ParcelFileDescriptor.MODE_READ_ONLY)).use { renderer ->
                renderer.openPage(number).use { page ->
                    val ratio=1500f/maxOf(page.width,page.height)
                    Bitmap.createBitmap((page.width*ratio).toInt().coerceAtLeast(1),(page.height*ratio).toInt().coerceAtLeast(1),Bitmap.Config.ARGB_8888).also {
                        it.eraseColor(android.graphics.Color.WHITE);page.render(it,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                    }
                }
            }
        } } catch(e:Exception) { if(e is kotlinx.coroutines.CancellationException)throw e;failed=true }
    }
    val bitmap=image
    if(bitmap!=null) Image(bitmap.asImageBitmap(),"$title, page ${number+1}. Pinch to zoom.",Modifier.fillMaxWidth().aspectRatio(bitmap.width.toFloat()/bitmap.height).transformable(state=rememberTransformableState { zoom,pan,_ -> scale=(scale*zoom).coerceIn(1f,4f);dx=if(scale>1f)dx+pan.x else 0f;dy=if(scale>1f)dy+pan.y else 0f },canPan={scale>1f}).graphicsLayer(scaleX=scale,scaleY=scale,translationX=dx,translationY=dy))
    else Box(Modifier.fillMaxWidth().height(300.dp),contentAlignment=Alignment.Center) {
        if(failed) TextButton(onClick={retry++}){Text("Retry page ${number+1}")} else CircularProgressIndicator()
    }
}
