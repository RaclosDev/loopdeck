import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TestGoogleScrape2 {
    public static void main(String[] args) throws Exception {
        String word = "jengibre";
        
        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();

        // Try the isch endpoint with a modern user agent
        String url = "https://www.google.com/search?q=" + URLEncoder.encode(word, StandardCharsets.UTF_8) 
                + "&udm=2";  // udm=2 = images
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "es-ES,es;q=0.9")
                .GET()
                .build();

        HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("Status: " + res.statusCode());
        System.out.println("Body length: " + res.body().length());
        
        String body = res.body();
        
        // Look for gstatic thumbnails
        Matcher m1 = Pattern.compile("(https://encrypted-tbn0\\.gstatic\\.com/images\\?q=tbn:[^\"&\\s\\\\]+)").matcher(body);
        int c1 = 0;
        while (m1.find() && c1 < 5) {
            System.out.println("Thumb " + c1 + ": " + m1.group(1));
            c1++;
        }
        System.out.println("Total gstatic matches: " + c1);
        
        // Look for data:image
        Matcher m2 = Pattern.compile("(data:image/[a-z]+;base64,[^\"]{20})").matcher(body);
        int c2 = 0;
        while (m2.find() && c2 < 3) {
            System.out.println("Base64 " + c2 + ": " + m2.group(1).substring(0, 50) + "...");
            c2++;
        }
        System.out.println("Total base64 images: " + c2);
        
        // Look for imgres links with imgurl
        Matcher m3 = Pattern.compile("/imgres\\?imgurl=([^&]+)").matcher(body);
        int c3 = 0;
        while (m3.find() && c3 < 3) {
            String imgUrl = java.net.URLDecoder.decode(m3.group(1), StandardCharsets.UTF_8);
            System.out.println("ImgRes " + c3 + ": " + imgUrl);
            c3++;
        }
        System.out.println("Total imgres matches: " + c3);
        
        // Save for analysis
        java.io.FileWriter fw = new java.io.FileWriter("google_udm2.html");
        fw.write(body);
        fw.close();
    }
}
