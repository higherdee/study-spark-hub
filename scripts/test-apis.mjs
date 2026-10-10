async function testArxiv() {
  try {
    const url = "http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:math.NA+OR+cat:physics&start=0&max_results=5";
    const res = await fetch(url, { headers: { "User-Agent": "SyllabossHarvester/1.0" } });
    const text = await res.text();
    console.log("arXiv Status:", res.status, "Length:", text.length, "Has <entry>:", text.includes("<entry>"));
  } catch (e) {
    console.error("arXiv Error:", e.message);
  }
}

async function testOpenAlex() {
  try {
    const url = "https://api.openalex.org/works?per_page=5&filter=has_fulltext:true,type:article";
    const res = await fetch(url, { headers: { "User-Agent": "mailto:dev@syllaboss.org" } });
    const data = await res.json();
    console.log("OpenAlex Status:", res.status, "Count:", data.results?.length);
    if (data.results?.[0]) {
      console.log("OpenAlex sample title:", data.results[0].title);
      console.log("OpenAlex sample pdf/url:", data.results[0].open_access?.oa_url || data.results[0].doi);
    }
  } catch (e) {
    console.error("OpenAlex Error:", e.message);
  }
}

async function testGutendex() {
  try {
    const url = "https://gutendex.com/books/?topic=science";
    const res = await fetch(url);
    const data = await res.json();
    console.log("Gutendex Status:", res.status, "Count:", data.results?.length);
    if (data.results?.[0]) {
      console.log("Gutendex sample title:", data.results[0].title);
    }
  } catch (e) {
    console.error("Gutendex Error:", e.message);
  }
}

async function main() {
  console.log("Testing Open Academic APIs...");
  await testArxiv();
  await testOpenAlex();
  await testGutendex();
}

main().catch(console.error);
