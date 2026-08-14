package com.loopdeck.controller;

import com.loopdeck.model.Deck;
import com.loopdeck.model.User;
import com.loopdeck.repository.UserRepository;
import com.loopdeck.service.TemplateService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    private final TemplateService templateService;
    private final UserRepository userRepository;

    public TemplateController(TemplateService templateService, UserRepository userRepository) {
        this.templateService = templateService;
        this.userRepository = userRepository;
    }

    @PostMapping("/import")
    public ResponseEntity<Deck> importTemplate(@RequestParam String type, Authentication authentication) {
        if (!"capitals".equals(type)) {
            return ResponseEntity.badRequest().build();
        }

        String userEmail = authentication.getName();
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Deck importedDeck = templateService.importCapitalsTemplate(user);
        return ResponseEntity.ok(importedDeck);
    }
}
