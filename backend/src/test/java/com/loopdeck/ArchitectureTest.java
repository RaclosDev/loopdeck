package com.loopdeck;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/** Capas: los controladores pasan por servicios y nada depende de la capa web. */
class ArchitectureTest {

    private static JavaClasses classes;

    @BeforeAll
    static void importClasses() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.loopdeck");
    }

    @Test
    void controllersDoNotUseRepositories() {
        noClasses().that().resideInAPackage("..controller..")
                .should().dependOnClassesThat().resideInAPackage("..repository..")
                .check(classes);
    }

    @Test
    void servicesDoNotDependOnControllers() {
        noClasses().that().resideInAPackage("..service..")
                .should().dependOnClassesThat().resideInAPackage("..controller..")
                .check(classes);
    }

    @Test
    void repositoriesDoNotDependOnServicesOrControllers() {
        noClasses().that().resideInAPackage("..repository..")
                .should().dependOnClassesThat().resideInAnyPackage("..service..", "..controller..")
                .check(classes);
    }
}
