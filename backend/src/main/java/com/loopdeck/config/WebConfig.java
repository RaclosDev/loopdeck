package com.loopdeck.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Servir archivos estáticos normales
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requestedResource = location.createRelative(resourcePath);
                        
                        // 1. Si el recurso existe y es leíble, lo devolvemos (JS, CSS, imágenes)
                        if (requestedResource.exists() && requestedResource.isReadable()) {
                            return requestedResource;
                        }
                        
                        // 2. Si la ruta es un error de API o empieza por api, dejamos que Spring lo maneje
                        if (resourcePath.startsWith("api/") || resourcePath.startsWith("/api/") || resourcePath.startsWith("error")) {
                            return null;
                        }
                        
                        // 3. Para cualquier otra ruta (ej: /login, /dashboard), servimos index.html (React Router)
                        return new ClassPathResource("/static/index.html");
                    }
                });
    }
}
