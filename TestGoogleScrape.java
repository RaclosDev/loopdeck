import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TestGoogleScrape {
    public static void main(String[] args) throws Exception {
        String[] words = {"jengibre", "casa", "perro"};
        
        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();

        for (String word : words) {
            // Google search with noscript mode - use a simple user agent to get basic HTML
            String url = "https://www.google.com/search?q=" + URLEncoder.encode(word, StandardCharsets.UTF_8) 
                    + "&tbm=isch&gbv=1";  // gbv=1 forces basic HTML mode
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "Mozilla/4.0 (compatible; MSIE 6.0)")  // Old IE to force basic HTML
                    .header("Accept", "text/html")
                    .GET()
                    .build();

            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());
            System.out.println("=== " + word + " ===");
            System.out.println("Status: " + res.statusCode());
            System.out.println("Body length: " + res.body().length());
            
            String body = res.body();
            
            // Look for image references in the response
            // Pattern: /imgres?imgurl= contains the original image URL
            Matcher m = Pattern.compile("imgurl=([^&\"]+)").matcher(body);
            int count = 0;
            while (m.find() && count < 2) {
                String imgUrl = java.net.URLDecoder.decode(m.group(1), StandardCharsets.UTF_8);
                System.out.println("  Image " + count + ": " + imgUrl);
                count++;
            }
            
            // Also try encrypted-tbn thumbnails
            Matcher m2 = Pattern.compile("(https://encrypted-tbn0\\.gstatic\\.com/images\\?q=tbn:[^\"&\\s]+)").matcher(body);
            int c2 = 0;
            while (m2.find() && c2 < 2) {
                System.out.println("  Thumb " + c2 + ": " + m2.group(1));
                c2++;
            }
            
            if (count == 0 && c2 == 0) {
                // Save HTML for analysis
                java.io.FileWriter fw = new java.io.FileWriter("google_" + word + ".html");
                fw.write(body);
                fw.close();
                System.out.println("  No images found - saved HTML for analysis");
            }
            
            System.out.println();
        }
    }
}
