package org.syllaboss.app

import androidx.compose.foundation.lazy.LazyListState

/** A tail item is after the complete message, even when the last answer is taller than the viewport. */
internal suspend fun LazyListState.scrollToConversationEnd() {
    androidx.compose.runtime.withFrameNanos { }
    val tail = layoutInfo.totalItemsCount - 1
    if (tail >= 0) animateScrollToItem(tail)
}

internal object PeerUpdates {
    val revision = kotlinx.coroutines.flow.MutableStateFlow(0)
    fun changed() { revision.value += 1 }
}
