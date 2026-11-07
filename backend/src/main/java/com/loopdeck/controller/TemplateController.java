package com.loopdeck.controller;

import com.loopdeck.model.Deck;
import com.loopdeck.service.TemplateService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    private final TemplateService templateService;
    public TemplateController(TemplateService templateService) {
        this.templateService = templateService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAvailableTemplates() {
        return ResponseEntity.ok(templateService.getAvailableTemplates());
    }

    @PostMapping("/import")
    public ResponseEntity<Deck> importTemplate(@RequestParam String type, Authentication authentication) {
        if (type == null || !type.matches("^[a-zA-Z0-9_-]+$")) {
            throw new IllegalArgumentException("Invalid template type format");
        }
        
        return ResponseEntity.ok(templateService.importTemplate(authentication.getName(), type));
    }
}
