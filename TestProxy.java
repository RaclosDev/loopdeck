import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TestProxy {
    public static void main(String[] args) {
        String word = "ginger";
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openverse.engineering/v1/images/?q=" + URLEncoder.encode(word, StandardCharsets.UTF_8)))
                    .header("User-Agent", "LoopDeck/1.0")
                    .GET()
                    .build();

            HttpResponse<String> apiRes = client.send(request, HttpResponse.BodyHandlers.ofString());
            
            System.out.println("Status: " + apiRes.statusCode());
            if (apiRes.statusCode() == 200) {
                Matcher matcher = Pattern.compile("\"url\":\"([^\"]+)\"").matcher(apiRes.body());
                if (matcher.find()) {
                    System.out.println("URL: " + matcher.group(1));
                } else {
                    System.out.println("Regex didn't match.");
                    System.out.println("Body snippet: " + apiRes.body().substring(0, Math.min(200, apiRes.body().length())));
                }
            } else {
                System.out.println("Body: " + apiRes.body());
            }
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}
