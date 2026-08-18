import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TestUnsplash {
    public static void main(String[] args) throws Exception {
        // Unsplash Source API - no key needed, just redirects to a photo
        String[] words = {"jengibre", "casa", "perro", "manzana"};
        
        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();

        for (String word : words) {
            // Unsplash source endpoint - returns 302 redirect to actual image
            String url = "https://source.unsplash.com/featured/600x400/?" + URLEncoder.encode(word, StandardCharsets.UTF_8);
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "LoopDeck/1.0")
                    .GET()
                    .build();

            HttpResponse<Void> res = client.send(request, HttpResponse.BodyHandlers.discarding());
            System.out.println("=== " + word + " ===");
            System.out.println("Status: " + res.statusCode());
            System.out.println("Final URL: " + res.uri());
            System.out.println();
        }
    }
}
