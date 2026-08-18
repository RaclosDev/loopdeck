async function test() {
  const englishWord = 'house';
  const searchUrl = `https://api.openverse.engineering/v1/images/?q=${encodeURIComponent(englishWord)}`;
  try {
    const res = await fetch(searchUrl);
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", data.results ? data.results.length : "No results");
    if (data.results && data.results.length > 0) {
      console.log(data.results[0].url);
    }
  } catch (e) {
    console.error(e);
  }
}
test();
