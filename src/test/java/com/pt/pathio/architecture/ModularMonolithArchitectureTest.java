package com.pt.pathio.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Enforces the modular-monolith boundaries described in
 * {@code internal/modular-monolith-plan.md}.
 *
 * <p>The four modules are {@code shared}, {@code auth}, {@code link} and
 * {@code analytics}. Allowed application dependencies are:
 * {@code auth -> shared}, {@code link -> {shared, auth.api}} and
 * {@code analytics -> {shared, auth.api, link.api}}. A consuming module may touch
 * only another module's published {@code *.api} package, never its implementation
 * packages.</p>
 *
 * <p><b>Staging note.</b> Rules were introduced incrementally, each becoming active only once the
 * relevant module package existed; a staged rule carried an {@code allowEmptyShould(true)} until
 * then. As of the Phase 7 package organization all four modules ({@code shared}, {@code auth},
 * {@code link}, {@code analytics}) exist and no {@code allowEmptyShould} remains, so every rule
 * below is enforced against real classes. Rules are never weakened in their assertions.</p>
 */
class ModularMonolithArchitectureTest {

    private static final String SHARED = "com.pt.pathio.shared..";
    private static final String AUTH = "com.pt.pathio.auth..";
    private static final String LINK = "com.pt.pathio.link..";
    private static final String ANALYTICS = "com.pt.pathio.analytics..";

    /** Non-API authentication packages a consuming module must never reach into. */
    private static final String[] AUTH_IMPLEMENTATION = {
            "com.pt.pathio.auth.controller..",
            "com.pt.pathio.auth.app..",
            "com.pt.pathio.auth.domain..",
            "com.pt.pathio.auth.persistence..",
            "com.pt.pathio.auth.security..",
            "com.pt.pathio.auth.config..",
            "com.pt.pathio.auth.internal..",
            "com.pt.pathio.auth.dto.."
    };

    /** Non-API link packages a consuming module must never reach into. */
    private static final String[] LINK_IMPLEMENTATION = {
            "com.pt.pathio.link.controller..",
            "com.pt.pathio.link.app..",
            "com.pt.pathio.link.domain..",
            "com.pt.pathio.link.persistence..",
            "com.pt.pathio.link.validation..",
            "com.pt.pathio.link.internal..",
            "com.pt.pathio.link.dto.."
    };

    private static JavaClasses classes;

    @BeforeAll
    static void importClasses() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.pt.pathio");
    }

    @Test
    void importsAreNotSilentlyEmpty() {
        // Guards against a bytecode-reader regression (e.g. an unsupported class-file version)
        // silently making every rule below vacuously pass.
        assertThat(classes.size()).isGreaterThan(50);
    }

    @Test
    void sharedDependsOnNoApplicationModule() {
        ArchRule rule = noClasses()
                .that().resideInAPackage(SHARED)
                .should().dependOnClassesThat().resideInAnyPackage(AUTH, LINK, ANALYTICS);
        rule.check(classes);
    }

    @Test
    void authDependsOnlyOnShared() {
        ArchRule rule = noClasses()
                .that().resideInAPackage(AUTH)
                .should().dependOnClassesThat().resideInAnyPackage(LINK, ANALYTICS);
        rule.check(classes);
    }

    @Test
    void linkDoesNotDependOnAnalytics() {
        ArchRule rule = noClasses()
                .that().resideInAPackage(LINK)
                .should().dependOnClassesThat().resideInAPackage(ANALYTICS);
        rule.check(classes);
    }

    @Test
    void linkUsesOnlyTheAuthApi() {
        ArchRule rule = noClasses()
                .that().resideInAPackage(LINK)
                .should().dependOnClassesThat().resideInAnyPackage(AUTH_IMPLEMENTATION);
        rule.check(classes);
    }

    @Test
    void analyticsUsesOnlyPublishedApis() {
        // analytics may read another module's published contract (auth.api for the authenticated
        // principal, link.api for link resolution) but must never reach into an implementation
        // package. Mirrors linkUsesOnlyTheAuthApi; no auth/link implementation import is allowed.
        ArchRule rule = noClasses()
                .that().resideInAPackage(ANALYTICS)
                .should().dependOnClassesThat()
                .resideInAnyPackage(concat(AUTH_IMPLEMENTATION, LINK_IMPLEMENTATION));
        rule.check(classes);
    }

    @Test
    void modulesAreFreeOfCycles() {
        ArchRule rule = slices()
                .matching("com.pt.pathio.(*)..")
                .namingSlices("Module $1")
                .should().beFreeOfCycles();
        rule.check(classes);
    }

    private static String[] concat(String[] a, String[] b) {
        String[] combined = new String[a.length + b.length];
        System.arraycopy(a, 0, combined, 0, a.length);
        System.arraycopy(b, 0, combined, a.length, b.length);
        return combined;
    }
}
