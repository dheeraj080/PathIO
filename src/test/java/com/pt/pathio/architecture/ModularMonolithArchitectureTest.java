package com.pt.pathio.architecture;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.base.DescribedPredicate.not;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Enforces the modular-monolith boundaries described in
 * {@code internal/modular-monolith-plan.md}.
 *
 * <p>The four modules are {@code shared}, {@code auth}, {@code link} and
 * {@code analytics}. The allowed application dependency graph is:</p>
 * <pre>
 *   shared    -&gt; (no application module)
 *   auth      -&gt; shared
 *   link      -&gt; shared, auth.api
 *   analytics -&gt; shared, auth.api, link.api
 * </pre>
 *
 * <p>A module may be consumed only through another module's published {@code *.api}
 * package; implementation packages ({@code controller}, {@code app}, {@code domain},
 * {@code persistence}, {@code security}, {@code config}, {@code internal}, {@code dto},
 * {@code validation}, {@code listener}) are private to their owner. These rules are
 * enforced against real bytecode (never weakened, no {@code allowEmptyShould}); the
 * {@link #importsAreNotSilentlyEmpty()} guard ensures the import itself stays honest.</p>
 */
class ModularMonolithArchitectureTest {

    private static final String SHARED = "com.pt.pathio.shared..";
    private static final String AUTH = "com.pt.pathio.auth..";
    private static final String AUTH_API = "com.pt.pathio.auth.api..";
    private static final String LINK = "com.pt.pathio.link..";
    private static final String LINK_API = "com.pt.pathio.link.api..";
    private static final String ANALYTICS = "com.pt.pathio.analytics..";

    /**
     * Every auth package that is <em>not</em> part of the published {@code auth.api}
     * contract. Derived from the package tree rather than enumerated so a class added
     * directly to {@code com.pt.pathio.auth} (or to a future subpackage) cannot slip
     * past the boundary unnoticed.
     */
    private static final DescribedPredicate<JavaClass> AUTH_IMPLEMENTATION =
            resideInAPackage(AUTH).and(not(resideInAPackage(AUTH_API)));

    /** Every link package that is <em>not</em> part of the published {@code link.api} contract. */
    private static final DescribedPredicate<JavaClass> LINK_IMPLEMENTATION =
            resideInAPackage(LINK).and(not(resideInAPackage(LINK_API)));

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
    void authImplementationIsNotReachedFromOutsideAuth() {
        // link, analytics and shared may use auth.api, but never auth's implementation packages.
        ArchRule rule = noClasses()
                .that().resideOutsideOfPackage(AUTH)
                .should().dependOnClassesThat(AUTH_IMPLEMENTATION);
        rule.check(classes);
    }

    @Test
    void linkImplementationIsNotReachedFromOutsideLink() {
        // analytics (and every other module) may use link.api, but never link's implementation.
        ArchRule rule = noClasses()
                .that().resideOutsideOfPackage(LINK)
                .should().dependOnClassesThat(LINK_IMPLEMENTATION);
        rule.check(classes);
    }

    @Test
    void authApiDoesNotDependOnAuthImplementation() {
        // The published contract must stay a leaf: no auth implementation type may leak into it.
        ArchRule rule = noClasses()
                .that().resideInAPackage(AUTH_API)
                .should().dependOnClassesThat(AUTH_IMPLEMENTATION);
        rule.check(classes);
    }

    @Test
    void linkApiDoesNotDependOnLinkImplementation() {
        // The published contract must stay a leaf: no link implementation type may leak into it.
        ArchRule rule = noClasses()
                .that().resideInAPackage(LINK_API)
                .should().dependOnClassesThat(LINK_IMPLEMENTATION);
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
}
