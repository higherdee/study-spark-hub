package org.syllaboss.app

import org.junit.Assert.*
import org.junit.Test

class MathFormattingTest {
    private val pair = "${'$'}${'$'}"
    @Test fun formulasUseMarkwonDelimiters() {
        assertEquals("Use ${pair}\\frac{1}{2}${pair}", normalizeMath("Use \\(\\frac{1}{2}\\)"))
        assertEquals("${pair}\\sqrt{x}${pair}", normalizeMath("\\\\(\\\\sqrt{x}\\\\)"))
        assertEquals("${pair}x^2${pair}", normalizeMath("${'$'}x^2${'$'}"))
        assertTrue(normalizeMath("\\[x^2\\]").contains("\n${pair}\nx^2\n${pair}\n"))
    }
    @Test fun codeAndCurrencyStayReadable() {
        val code = "```tex\n\\[x\\]\n``` and `\\(x\\)`"
        assertEquals(code, normalizeMath(code))
        val prices = "Cards cost ${'$'}5 and ${'$'}10. Save ${'$'}12 monthly."
        assertEquals(prices, normalizeMath(prices))
    }
    @Test fun matricesPreserveRowSeparators() {
        val matrix = "\\begin{bmatrix}1 & 2 \\\\ 3 & 4\\end{bmatrix}"
        assertTrue(normalizeMath(matrix).contains(matrix))
        assertEquals(2, Regex("""\$\$""").findAll(normalizeMath(matrix)).count())
    }
}
