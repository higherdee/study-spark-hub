async function testArxivHttps() {
  try {
    const url = "https://export.arxiv.org/api/query?search_query=cat:cs.AI&start=0&max_results=5";
    const res = await fetch(url, { headers: { "User-Agent": "SyllabossHarvester/1.0" } });
    const text = await res.text();
    console.log("arXiv HTTPS Status:", res.status, "Has entry:", text.includes("<entry>"));
  } catch (e) {
    console.error("arXiv HTTPS Error:", e.message);
  }
}

async function testCrossref() {
  try {
    const url = "https://api.crossref.org/works?rows=5&filter=has-full-text:true,type:book-chapter";
    const res = await fetch(url, { headers: { "User-Agent": "SyllabossHarvester/1.0 (mailto:admin@syllaboss.org)" } });
    const data = await res.json();
    console.log("Crossref Status:", res.status, "Items:", data.message?.items?.length);
  } catch (e) {
    console.error("Crossref Error:", e.message);
  }
}

async function main() {
  await testArxivHttps();
  await testCrossref();
}

main().catch(console.error);
