package com.loopdeck.controller;

import com.loopdeck.model.Deck;
import com.loopdeck.model.User;
import com.loopdeck.repository.UserRepository;
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
    private final UserRepository userRepository;

    public TemplateController(TemplateService templateService, UserRepository userRepository) {
        this.templateService = templateService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAvailableTemplates() {
        return ResponseEntity.ok(templateService.getAvailableTemplates());
    }

    @PostMapping("/import")
    public ResponseEntity<Deck> importTemplate(@RequestParam String type, Authentication authentication) {
        String userId = authentication.getName();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        try {
            Deck importedDeck = templateService.importTemplate(user, type);
            return ResponseEntity.ok(importedDeck);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().build();
        }
    }
}
