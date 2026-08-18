import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TestPixabay {
    // Pixabay free API key (anyone can get one for free at pixabay.com/api/docs/)
    static final String API_KEY = "47863938-f4b45a6a0c7d8b5e3f9c2d1e0";

    public static void main(String[] args) throws Exception {
        String[] words = {"jengibre", "casa", "perro", "manzana", "cerebro"};
        
        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();

        for (String word : words) {
            String url = "https://pixabay.com/api/?key=" + API_KEY 
                    + "&q=" + URLEncoder.encode(word, StandardCharsets.UTF_8)
                    + "&image_type=photo&per_page=3&lang=es";
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "LoopDeck/1.0")
                    .GET()
                    .build();

            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());
            System.out.println("=== " + word + " ===");
            System.out.println("Status: " + res.statusCode());
            
            if (res.statusCode() == 200) {
                // Extract webformatURL (medium-size, perfect for cards)
                Matcher m = Pattern.compile("\"webformatURL\":\"([^\"]+)\"").matcher(res.body());
                if (m.find()) {
                    System.out.println("Image: " + m.group(1).replace("\\/", "/"));
                } else {
                    System.out.println("No images found");
                    System.out.println("Body: " + res.body().substring(0, Math.min(200, res.body().length())));
                }
            } else {
                System.out.println("Error: " + res.body().substring(0, Math.min(200, res.body().length())));
            }
            System.out.println();
        }
    }
}
