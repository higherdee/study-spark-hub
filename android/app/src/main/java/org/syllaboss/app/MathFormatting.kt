package org.syllaboss.app

/** Markwon uses double dollars for both inline and display LaTeX. Preserve code verbatim. */
internal fun normalizeMath(text: String): String {
    val dollar = '$'.toString()
    val pair = dollar + dollar
    val code = Regex("```[\\s\\S]*?```|~~~[\\s\\S]*?~~~|`[^`\\n]+`")
    fun normalize(value: String): String {
        fun clean(body: String) = body.trim().replace(Regex("""\\\\(?=(?:frac|dfrac|tfrac|sqrt|text|mathrm|mathbf|mathbb|left|right|begin|end|sum|prod|int|lim|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|times|cdot|div|partial|infty|vec|hat|bar)\b)""")) { "\\" }
        val blocks = mutableListOf<String>()
        fun block(body: String): String { blocks.add("\n$pair\n${clean(body)}\n$pair\n"); return "\u0001${blocks.lastIndex}\u0002" }
        var result = value.replace(Regex("""(?:\\\\|\\)\[([\s\S]*?)(?:\\\\|\\)\]""")) { block(it.groupValues[1]) }
        result = result.replace(Regex("""\$\$([\s\S]*?)\$\$""")) { if (it.groupValues[1].contains('\n')) block(it.groupValues[1]) else "$pair${clean(it.groupValues[1])}$pair" }
        result = result.replace(Regex("""(?:\\\\|\\)\(([\s\S]*?)(?:\\\\|\\)\)""")) { "$pair${clean(it.groupValues[1])}$pair" }
        result = result.replace(Regex("""(?<![\\$])\$(?![$\s])([^$\n]+?)(?<!\s)\$(?![\d$])""")) {
            if (Regex("""^\d[\d,.]*\s+(and|or|to)\b""", RegexOption.IGNORE_CASE).containsMatchIn(it.groupValues[1])) it.value
            else "$pair${clean(it.groupValues[1])}$pair"
        }
        result = result.replace(Regex("""(?m)^\s*(\\begin\{(matrix|pmatrix|bmatrix|vmatrix|align\*?|aligned|equation\*?|cases)\}[\s\S]*?\\end\{\2\})\s*$""")) { block(it.groupValues[1]) }
        result = result.replace(Regex("""(?m)^(\s*\\(?:frac|dfrac|sqrt|sum|int|lim)\b[^\n]*)$""")) { block(it.groupValues[1]) }
        return result.replace(Regex("\u0001(\\d+)\u0002")) { blocks[it.groupValues[1].toInt()] }
    }
    return buildString {
        var offset = 0
        code.findAll(text).forEach { match -> append(normalize(text.substring(offset, match.range.first))); append(match.value); offset = match.range.last + 1 }
        append(normalize(text.substring(offset)))
    }
}
