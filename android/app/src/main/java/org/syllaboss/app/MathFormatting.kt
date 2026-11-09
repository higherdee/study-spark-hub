package org.syllaboss.app

/** Markwon uses double dollars for both inline and display LaTeX. Preserve code verbatim. */
internal fun normalizeMath(text: String): String {
    val dollar = '$'.toString()
    val pair = dollar + dollar
    val code = Regex("```[\\s\\S]*?```|~~~[\\s\\S]*?~~~|`[^`\\n]+`")
    fun normalize(original: String): String {
        val value = original.replace("\u000crac", "\\frac").replace(Regex("\u0008(eta|ar|egin|oxed|inom)\\b")) { "\\b"+it.groupValues[1] }.replace(Regex("\t(ext|imes|heta|frac|an|anh)\\b")) { "\\t"+it.groupValues[1] }.replace(Regex("\r(ho|ight|angle)\\b")) { "\\r"+it.groupValues[1] }
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
        val inline = Regex("""\$\$[\s\S]*?\$\$""")
        fun bare(original: String): String {
            val raw=original.replace(Regex("""\\\\(?=(?:frac|dfrac|tfrac|sqrt|binom|mathrm|mathbf|text|overline|underline|vec|hat|bar|boxed)\b)""")) { "\\" }
            val command = Regex("""\\(frac|dfrac|tfrac|sqrt|binom|mathrm|mathbf|text|overline|underline|vec|hat|bar|boxed)(?:\[[^\]]*\])?\s*\{""")
            var cursor = 0
            return buildString {
                command.findAll(raw).forEach { match ->
                    if(match.range.first < cursor) return@forEach
                    var end = match.range.last
                    val groups = if(match.groupValues[1].contains("frac") || match.groupValues[1] == "binom") 2 else 1
                    var valid = true
                    repeat(groups) {
                        while(end < raw.length && raw[end].isWhitespace()) end++
                        if(end >= raw.length || raw[end] != '{') { valid = false; return@repeat }
                        var depth = 0
                        do { if(raw[end] == '{') depth++ else if(raw[end] == '}') depth--; end++ } while(depth > 0 && end < raw.length)
                        if(depth != 0) valid = false
                    }
                    if(valid) { append(raw.substring(cursor,match.range.first)); append(pair); append(raw.substring(match.range.first,end)); append(pair); cursor = end }
                }
                append(raw.substring(cursor))
            }
        }
        var offset = 0
        result = buildString { inline.findAll(result).forEach { match -> append(bare(result.substring(offset,match.range.first))); append(match.value); offset=match.range.last+1 }; append(bare(result.substring(offset))) }
        return result.replace(Regex("\u0001(\\d+)\u0002")) { blocks[it.groupValues[1].toInt()] }
    }
    return buildString {
        var offset = 0
        code.findAll(text).forEach { match -> append(normalize(text.substring(offset, match.range.first))); append(match.value); offset = match.range.last + 1 }
        append(normalize(text.substring(offset)))
    }
}
