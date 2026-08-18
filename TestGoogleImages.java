import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.ArrayList;
import java.util.List;

public class TestGoogleImages {
    public static void main(String[] args) throws Exception {
        String word = "jengibre";
        
        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();
        
        // Fetch Google Image Search
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://www.google.com/search?q=" + URLEncoder.encode(word, StandardCharsets.UTF_8) + "&tbm=isch"))
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .header("Accept", "text/html,application/xhtml+xml")
                .header("Accept-Language", "es-ES,es;q=0.9")
                .GET()
                .build();

        HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("Status: " + res.statusCode());
        System.out.println("Body length: " + res.body().length());
        
        String body = res.body();
        
        // Try multiple patterns to find image URLs
        
        // Pattern 1: encrypted-tbn0.gstatic.com thumbnails
        Matcher m1 = Pattern.compile("https://encrypted-tbn0\\.gstatic\\.com/images\\?q=tbn:[^\"'\\\\]+").matcher(body);
        List<String> tbnUrls = new ArrayList<>();
        while (m1.find()) tbnUrls.add(m1.group());
        System.out.println("TBN URLs found: " + tbnUrls.size());
        if (!tbnUrls.isEmpty()) System.out.println("First TBN: " + tbnUrls.get(0));
        
        // Pattern 2: data:image base64
        Matcher m2 = Pattern.compile("data:image/[^\"']+").matcher(body);
        int dataCount = 0;
        while (m2.find()) dataCount++;
        System.out.println("data:image found: " + dataCount);
        
        // Pattern 3: look for "ou":"http... pattern (full-size image URLs in Google's JS)
        Matcher m3 = Pattern.compile("\"ou\":\"(https?://[^\"]+)\"").matcher(body);
        List<String> ouUrls = new ArrayList<>();
        while (m3.find()) ouUrls.add(m3.group(1));
        System.out.println("OU URLs found: " + ouUrls.size());
        if (!ouUrls.isEmpty()) System.out.println("First OU: " + ouUrls.get(0));
        
        // Pattern 4: look for imgurl= pattern 
        Matcher m4 = Pattern.compile("imgurl=(https?://[^&\"]+)").matcher(body);
        List<String> imgUrls = new ArrayList<>();
        while (m4.find()) imgUrls.add(m4.group(1));
        System.out.println("imgurl= found: " + imgUrls.size());
        if (!imgUrls.isEmpty()) System.out.println("First imgurl: " + imgUrls.get(0));
        
        // Pattern 5: look for any http image URLs ending in .jpg, .png, .webp
        Matcher m5 = Pattern.compile("(https?://[^\"'\\s]+\\.(?:jpg|jpeg|png|webp))").matcher(body);
        List<String> directUrls = new ArrayList<>();
        while (m5.find()) {
            String url = m5.group(1);
            if (!url.contains("google.com") && !url.contains("gstatic.com") && !url.contains("googleapis.com")) {
                directUrls.add(url);
            }
        }
        System.out.println("Direct image URLs found: " + directUrls.size());
        for (int i = 0; i < Math.min(3, directUrls.size()); i++) {
            System.out.println("  " + directUrls.get(i));
        }

        // Save a snippet of the HTML for analysis
        java.io.FileWriter fw = new java.io.FileWriter("google_java.html");
        fw.write(body);
        fw.close();
        System.out.println("Saved HTML to google_java.html");
    }
}
