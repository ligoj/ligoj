# SonarQube CREATE Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A CREATE mode in plugin-qa-sonarqube that creates a SonarQube permission template for the Ligoj project, then shows the projects the template applies to, the most recently analyzed one first.

**Architecture:** The Java resource validates the subscription parameters and delegates the SonarQube calls to a new package-private `SonarQubeTemplates` class (one processor per call, the node organization appended). The status check of a template-based subscription returns the latest analyzed project in the existing `project` shape, plus the matching projects. The UI adds the CREATE fields (prefilled from the project key), the template-based row and a role mapping summary.

**Tech Stack:** Java 25, Spring, JAX-RS, Jackson 3 (`tools.jackson`), WireMock tests; Vue 3, Vuetify, vitest.

**Spec:** `/Users/fabdouglas/git/ligoj/docs/superpowers/specs/2026-10-15-sonarqube-create-mode-design.md`

## Global Constraints

- Repository: `~/git/ligoj-plugins/plugin-qa-sonarqube` (own git repository).
- **No git commit**: the user commits. Never edit `CHANGELOG.md` / `CHANGELOG.fr.md`.
- TDD: each test runs and fails for the expected reason before the code exists.
- Maven: `mvn -o -Djarsigner.skip=true -Djacoco.skip=true -Dskip.ui.build=true ...`; read the `Tests run:` line, the parent may print BUILD SUCCESS despite failures.
- Node: run through `/bin/bash --noprofile --norc -c 'export PATH=/Users/fabdouglas/.nvm/versions/node/v26.8.1/bin:$PATH; ...'`.
- `src/main/resources/csv/parameter.csv` and `node.csv` use CRLF line endings: keep them.
- Parameter ids: `service:qa:sonarqube:template`, `service:qa:sonarqube:template-pattern`, `service:qa:sonarqube:roles`.
- Project permissions: `user`, `codeviewer`, `issueadmin`, `securityhotspotadmin`, `scan`, `admin`.
- Error rules: `sonar-roles-json`, `sonar-roles-permission`, `sonar-template-pattern`, `sonar-template-exists`, `sonar-template`, `sonar-admin`; warnings `sonar-template-reused`, `sonar-template-missing`.
- Every SonarQube call passes the node organization when set (`&organization=<org>`).
- Never print a secret from `~/.ligoj/credentials`.
- The IDE-run API needs a restart by the user after a Java change; sync a rebuilt UI bundle into `target/classes`.

## Review Focus

1. Group or template names with spaces, `+` or `&` → every query value URL-encoded, the call still targets the right group (Task 2 `createEncodesNames`).
2. A template on SonarQube without pattern, or with a pattern Java rejects → the status is UP with no project, no exception (Task 3 `statusTemplateWithoutPattern`).
3. A missing or unparsable `lastAnalysisDate` → the project sorts with the never analyzed ones, no exception (Task 3 `statusTemplate`, project `ligoj-jupiter:bad`).
4. More matching projects than one page → the next page is read (Task 3 `statusTemplatePaging`).
5. A role mapping value that is a string, an empty list or holds `null` → `sonar-roles-json` / `sonar-roles-permission`, before any remote call (Task 2 `createInvalidRoles`).

## Ruling recorded at planning

- Spec §6 asks the "+N projects" list to carry a dashboard link per project. The host exports no menu to plugins (`@ligoj/host` has `VChip`, `VTooltip`, `VListItem`, no `VMenu`), and a new export would break older hosts. The chip lists the other projects with their last analysis date in its tooltip (the host promotes `title:`); the latest project keeps its dashboard link. Cost if wrong: a later host change plus a small renderer change.

## File Structure

- Modify `src/main/resources/csv/parameter.csv`, `src/main/resources/csv/node.csv`: seeds (Task 1).
- Modify `src/main/java/org/ligoj/app/plugin/sonarqube/SonarQubePluginResource.java`: constants, `update`, `create`, `delete`, template status (Tasks 1-4).
- Create `src/main/java/org/ligoj/app/plugin/sonarqube/SonarQubeTemplates.java`: SonarQube calls of the mode (Tasks 2-4).
- Create `src/main/java/org/ligoj/app/plugin/sonarqube/SonarQubeTemplateProject.java`: a matching project in the status data (Task 3).
- Create `src/main/java/org/ligoj/app/plugin/sonarqube/ResponseWarnings.java`: copy of the Nexus helper (Task 2).
- Create `src/test/java/org/ligoj/app/plugin/sonarqube/SonarQubePluginResourceCreateTest.java` (Tasks 1-4).
- Create `ui/src/params.js`, `ui/src/sonarJson.js`, `ui/src/fields/SonarTemplateField.vue`, `ui/src/fields/SonarRolesField.vue` (Task 5).
- Modify `ui/src/service.js`, `ui/src/index.js`, `ui/src/i18n/en.js`, `ui/src/i18n/fr.js` (Tasks 5-6).
- Create `ui/src/__tests__/sonarqube-create-mode.test.js` (Tasks 5-6).
- Modify `README.md` (Task 7).

---

### Task 1: Seeds, modes and the update hook

**Files:**
- Modify: `src/main/resources/csv/parameter.csv`, `src/main/resources/csv/node.csv`
- Modify: `src/main/java/org/ligoj/app/plugin/sonarqube/SonarQubePluginResource.java`
- Create: `src/test/java/org/ligoj/app/plugin/sonarqube/SonarQubePluginResourceCreateTest.java`

**Interfaces:**
- Produces: constants `SonarQubePluginResource.PARAMETER_TEMPLATE`, `PARAMETER_TEMPLATE_PATTERN`, `PARAMETER_ROLES` (String); `update(String)`; the test class with `setParameter(String, String)` and the CREATE subscription prepared in `@BeforeEach`.

- [ ] **Step 1: Write the failing test class**

```java
/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.plugin.sonarqube;

import jakarta.transaction.Transactional;
import org.apache.hc.core5.http.HttpStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.ligoj.app.AbstractServerTest;
import org.ligoj.app.api.SubscriptionMode;
import org.ligoj.app.model.*;
import org.ligoj.app.plugin.qa.QaResource;
import org.ligoj.app.resource.subscription.SubscriptionResource;
import org.ligoj.bootstrap.MatcherUtil;
import org.ligoj.bootstrap.core.validation.ValidationJsonException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

import static com.github.tomakehurst.wiremock.client.WireMock.*;

/**
 * Test class of {@link SonarQubePluginResource} in CREATE mode: the permission template of the project, its group
 * permissions, the projects it applies to, and the remote data deletion.
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
class SonarQubePluginResourceCreateTest extends AbstractServerTest {

	/**
	 * The role mapping of the Jupiter project.
	 */
	private static final String ROLES = """
			{"ligoj-jupiter-admin": ["admin", "user"], "ligoj-jupiter-dev": ["user", "codeviewer", "scan"]}""";

	@Autowired
	private CacheManager cacheManager;

	@Autowired
	private SubscriptionResource subscriptionResource;

	private SonarQubePluginResource resource;

	private final List<String> warnings = new ArrayList<>();

	private int subscription;

	@BeforeEach
	void prepareData() throws IOException {
		persistEntities("csv", new Class<?>[] { Node.class, Parameter.class, Project.class, Subscription.class, ParameterValue.class },
				StandardCharsets.UTF_8);
		this.subscription = getSubscription("Jupiter", QaResource.SERVICE_KEY);
		resource = new SonarQubePluginResource();
		applicationContext.getAutowireCapableBeanFactory().autowireBean(resource);

		// The Jupiter subscription in CREATE mode: a template instead of a project
		setParameter(SonarQubePluginResource.PARAMETER_PROJECT, null);
		setParameter(SonarQubePluginResource.PARAMETER_TEMPLATE, "ligoj-jupiter");
		setParameter(SonarQubePluginResource.PARAMETER_TEMPLATE_PATTERN, "ligoj-jupiter:.*");
		setParameter(SonarQubePluginResource.PARAMETER_ROLES, ROLES);
	}

	/**
	 * Replace a subscription parameter value.
	 */
	private void setParameter(final String parameter, final String value) {
		em.createQuery("DELETE ParameterValue WHERE parameter.id = :p AND subscription.id = :s").setParameter("p", parameter)
				.setParameter("s", subscription).executeUpdate();
		if (value != null) {
			final var pv = new ParameterValue();
			pv.setParameter(em.find(Parameter.class, parameter));
			pv.setSubscription(em.find(Subscription.class, subscription));
			pv.setData(value);
			em.persist(pv);
		}
		em.flush();
		cacheManager.getCache("subscription-parameters").clear();
	}

	@Test
	void createModeParameters() {
		final var template = em.find(Parameter.class, SonarQubePluginResource.PARAMETER_TEMPLATE);
		final var pattern = em.find(Parameter.class, SonarQubePluginResource.PARAMETER_TEMPLATE_PATTERN);
		final var roles = em.find(Parameter.class, SonarQubePluginResource.PARAMETER_ROLES);
		Assertions.assertEquals(SubscriptionMode.CREATE, template.getMode());
		Assertions.assertEquals(SubscriptionMode.CREATE, pattern.getMode());
		Assertions.assertEquals(SubscriptionMode.CREATE, roles.getMode());
		Assertions.assertTrue(template.isMandatory());
		Assertions.assertTrue(pattern.isMandatory());
		Assertions.assertFalse(roles.isMandatory());
		// The project is asked to link only
		Assertions.assertEquals(SubscriptionMode.LINK, em.find(Parameter.class, SonarQubePluginResource.PARAMETER_PROJECT).getMode());
	}

	@Test
	void update() {
		// An installation seeded before the CREATE mode
		em.find(Node.class, SonarQubePluginResource.KEY).setMode(SubscriptionMode.LINK);
		em.find(Parameter.class, SonarQubePluginResource.PARAMETER_PROJECT).setMode(SubscriptionMode.ALL);

		resource.update("5.0.2");
		Assertions.assertEquals(SubscriptionMode.ALL, em.find(Node.class, SonarQubePluginResource.KEY).getMode());
		Assertions.assertEquals(SubscriptionMode.LINK, em.find(Parameter.class, SonarQubePluginResource.PARAMETER_PROJECT).getMode());

		// Idempotent: it runs again on every restart of an IDE-run API
		resource.update("5.0.2");
		Assertions.assertEquals(SubscriptionMode.ALL, em.find(Node.class, SonarQubePluginResource.KEY).getMode());
		Assertions.assertEquals(SubscriptionMode.LINK, em.find(Parameter.class, SonarQubePluginResource.PARAMETER_PROJECT).getMode());
	}
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd ~/git/ligoj-plugins/plugin-qa-sonarqube && mvn -o -Djarsigner.skip=true -Djacoco.skip=true -Dskip.ui.build=true -Dtest=SonarQubePluginResourceCreateTest test 2>&1 | grep -E 'ERROR.*java|Tests run:|cannot find symbol' | head`
Expected: compilation error, `cannot find symbol` for `PARAMETER_TEMPLATE`.

- [ ] **Step 3: Seed the parameters and the tool mode**

Run (keeps CRLF):

```bash
cd ~/git/ligoj-plugins/plugin-qa-sonarqube && python3 - <<'EOF'
p = 'src/main/resources/csv/parameter.csv'
s = open(p, newline='').read()
old = 'service:qa:sonarqube:project;service:qa:sonarqube;;TRUE;TEXT;;;TRUE;FALSE'
assert s.count(old) == 1
s = s.replace(old, 'service:qa:sonarqube:project;service:qa:sonarqube;;TRUE;TEXT;LINK;;TRUE;FALSE\r\n'
    'service:qa:sonarqube:template;service:qa:sonarqube;;TRUE;TEXT;CREATE;;TRUE;FALSE\r\n'
    'service:qa:sonarqube:template-pattern;service:qa:sonarqube;;TRUE;TEXT;CREATE;;TRUE;FALSE\r\n'
    'service:qa:sonarqube:roles;service:qa:sonarqube;;FALSE;TEXT;CREATE;;TRUE;FALSE')
open(p, 'w', newline='').write(s)
n = 'src/main/resources/csv/node.csv'
s = open(n, newline='').read()
assert s.count('service:qa:sonarqube;SonarQube;service:qa;LINK;;;') == 1
open(n, 'w', newline='').write(s.replace('service:qa:sonarqube;SonarQube;service:qa;LINK;;;', 'service:qa:sonarqube;SonarQube;service:qa;ALL;;;'))
EOF
file src/main/resources/csv/*.csv
```

Expected: both files `with CRLF line terminators`.

- [ ] **Step 4: Add the constants and the update hook**

In `SonarQubePluginResource.java`, after `PARAMETER_ORGANIZATION`:

```java
	/**
	 * Name of the permission template created in CREATE mode, the project key by default.
	 */
	public static final String PARAMETER_TEMPLATE = KEY + ":template";

	/**
	 * Regular expression of the project keys the permission template applies to.
	 */
	public static final String PARAMETER_TEMPLATE_PATTERN = KEY + ":template-pattern";

	/**
	 * Role mapping of the permission template: a JSON object keyed by group, each value the list of its project
	 * permissions.
	 */
	public static final String PARAMETER_ROLES = KEY + ":roles";
```

After the `versionServer` field:

```java
	@Autowired
	private NodeRepository nodeRepository;

	@Autowired
	private ParameterRepository parameterRepository;
```

Before `getKey()`:

```java
	/**
	 * Upgrade the installed data, the CSV seed being insert-only: the tool node accepts the creation of a permission
	 * template, and the project is asked in LINK mode only, the CREATE mode finding the projects by template.
	 */
	@Override
	public void update(final String oldVersion) {
		nodeRepository.findById(KEY).filter(n -> n.getMode() == SubscriptionMode.LINK).ifPresent(n -> {
			log.info("Node {} now supports the permission template creation", KEY);
			n.setMode(SubscriptionMode.ALL);
		});
		parameterRepository.findById(PARAMETER_PROJECT).filter(p -> p.getMode() != SubscriptionMode.LINK).ifPresent(p -> {
			log.info("Parameter {} is now asked in LINK mode only", PARAMETER_PROJECT);
			p.setMode(SubscriptionMode.LINK);
		});
	}
```

Imports: `org.ligoj.app.api.SubscriptionMode`, `org.ligoj.app.dao.NodeRepository`, `org.ligoj.app.dao.ParameterRepository`.

- [ ] **Step 5: Run the tests**

Run: same command as Step 2.
Expected: `Tests run: 2, Failures: 0, Errors: 0`.

- [ ] **Step 6: Run the whole plugin suite**

Run: `cd ~/git/ligoj-plugins/plugin-qa-sonarqube && mvn -o -Djarsigner.skip=true -Djacoco.skip=true -Dskip.ui.build=true test 2>&1 | grep -E 'Tests run:|FAIL' | tail -4`
Expected: no failure; the existing `SonarQubePluginResourceTest` still passes (its subscription keeps the project parameter).

---

### Task 2: Subscribing creates the template and its group permissions

**Files:**
- Create: `src/main/java/org/ligoj/app/plugin/sonarqube/ResponseWarnings.java`
- Create: `src/main/java/org/ligoj/app/plugin/sonarqube/SonarQubeTemplates.java`
- Modify: `src/main/java/org/ligoj/app/plugin/sonarqube/SonarQubePluginResource.java`
- Test: `src/test/java/org/ligoj/app/plugin/sonarqube/SonarQubePluginResourceCreateTest.java`

**Interfaces:**
- Consumes: Task 1 constants and test class.
- Produces: `SonarQubeTemplates(Map<String,String> parameters, ObjectMapper objectMapper)` with `SonarQubeTemplate find(String name)`, `boolean create(String name, String pattern, String description)`, `boolean ensureGroup(String group)`, `boolean grant(String template, String group, Collection<String> permissions)`, `static final List<String> PERMISSIONS`; record `SonarQubeTemplates.SonarQubeTemplate(String id, String name, String projectKeyPattern)`; `SonarQubePluginResource.responseWarnings()` returning `ResponseWarnings.Sink`.

- [ ] **Step 1: Copy the warning helper**

Run:

```bash
cd ~/git/ligoj-plugins && sed 's/^package org.ligoj.app.plugin.nexus;/package org.ligoj.app.plugin.sonarqube;/' \
  plugin-registry-nexus/src/main/java/org/ligoj/app/plugin/nexus/ResponseWarnings.java \
  > plugin-qa-sonarqube/src/main/java/org/ligoj/app/plugin/sonarqube/ResponseWarnings.java
head -5 plugin-qa-sonarqube/src/main/java/org/ligoj/app/plugin/sonarqube/ResponseWarnings.java
```

Expected: `package org.ligoj.app.plugin.sonarqube;`.

- [ ] **Step 2: Write the failing tests**

In the test class, make the resource collect the warnings (replace the `resource = new SonarQubePluginResource();` line of `prepareData`):

```java
		resource = new SonarQubePluginResource() {
			@Override
			protected ResponseWarnings.Sink responseWarnings() {
				return (code, parameters) -> warnings.add(code + " " + new TreeMap<>(parameters));
			}
		};
```

Add the helpers and tests:

```java
	private static final String SEARCH_TEMPLATE = "/api/permissions/search_templates?q=ligoj-jupiter";

	private static final String CREATE_TEMPLATE = "/api/permissions/create_template?name=ligoj-jupiter&projectKeyPattern=ligoj-jupiter%3A.*&description=Ligoj+project+Jupiter";

	/**
	 * The node user administers SonarQube 26.6.
	 */
	private void mockAdmin() {
		httpServer.stubFor(get(urlEqualTo("/sessions/new")).willReturn(aResponse().withStatus(HttpStatus.SC_OK)));
		httpServer.stubFor(get(urlEqualTo("/api/server/version")).willReturn(ok("26.6.0.123539")));
		httpServer.stubFor(get(urlEqualTo("/api/authentication/validate?format=json")).willReturn(okJson("{\"valid\":true}")));
		httpServer.stubFor(get(urlEqualTo("/api/components/search?qualifiers=TRK&ps=1")).willReturn(okJson("{\"components\":[]}")));
	}

	/**
	 * The templates found by the search of the Jupiter template.
	 */
	private void mockTemplates(final String templates) {
		httpServer.stubFor(get(urlEqualTo(SEARCH_TEMPLATE)).willReturn(okJson("{\"permissionTemplates\":[" + templates + "]}")));
	}

	/**
	 * SonarQube knows the group, or not.
	 */
	private void mockGroup(final String encoded, final String group, final boolean exists) {
		httpServer.stubFor(get(urlEqualTo("/api/user_groups/search?q=" + encoded))
				.willReturn(okJson(exists ? "{\"groups\":[{\"name\":\"" + group + "\"}]}" : "{\"groups\":[{\"name\":\"" + group + "-old\"}]}")));
	}

	/**
	 * A refusal as SonarQube sends it: with a JSON body. The default callback accepts any response without body.
	 */
	private static ResponseDefinitionBuilder forbidden() {
		return aResponse().withStatus(HttpStatus.SC_FORBIDDEN).withBody("{\"errors\":[{\"msg\":\"Insufficient privileges\"}]}");
	}

	/**
	 * Every write succeeds.
	 */
	private void mockWrites() {
		httpServer.stubFor(post(urlPathMatching("/api/.*")).willReturn(aResponse().withStatus(HttpStatus.SC_NO_CONTENT)));
	}

	/**
	 * The group got exactly these permissions on the Jupiter template, the others removed.
	 */
	private void assertPermissions(final String encodedGroup, final String... granted) {
		for (final var permission : SonarQubeTemplates.PERMISSIONS) {
			final var action = Arrays.asList(granted).contains(permission) ? "add_group_to_template" : "remove_group_from_template";
			httpServer.verify(postRequestedFor(urlEqualTo("/api/permissions/" + action + "?templateName=ligoj-jupiter&groupName=" + encodedGroup
					+ "&permission=" + permission)));
		}
	}

	@Test
	void createNewTemplate() throws Exception {
		mockAdmin();
		// A template of a close name is not this one
		mockTemplates("{\"id\":\"T0\",\"name\":\"ligoj-jupiter-old\",\"projectKeyPattern\":\"old:.*\"}");
		mockGroup("ligoj-jupiter-admin", "ligoj-jupiter-admin", true);
		mockGroup("ligoj-jupiter-dev", "ligoj-jupiter-dev", false);
		mockWrites();
		httpServer.start();

		resource.create(subscription);
		httpServer.verify(postRequestedFor(urlEqualTo(CREATE_TEMPLATE)));
		httpServer.verify(0, postRequestedFor(urlEqualTo("/api/user_groups/create?name=ligoj-jupiter-admin")));
		httpServer.verify(postRequestedFor(urlEqualTo("/api/user_groups/create?name=ligoj-jupiter-dev")));
		assertPermissions("ligoj-jupiter-admin", "admin", "user");
		assertPermissions("ligoj-jupiter-dev", "user", "codeviewer", "scan");
		Assertions.assertEquals(List.of(), warnings);
	}

	@Test
	void createReusedTemplate() throws Exception {
		mockAdmin();
		mockTemplates("{\"id\":\"T1\",\"name\":\"ligoj-jupiter\",\"projectKeyPattern\":\"ligoj-jupiter:.*\"}");
		mockGroup("ligoj-jupiter-admin", "ligoj-jupiter-admin", true);
		mockGroup("ligoj-jupiter-dev", "ligoj-jupiter-dev", true);
		mockWrites();
		httpServer.start();

		resource.create(subscription);
		httpServer.verify(0, postRequestedFor(urlPathEqualTo("/api/permissions/create_template")));
		assertPermissions("ligoj-jupiter-dev", "user", "codeviewer", "scan");
		Assertions.assertEquals(List.of("sonar-template-reused {template=ligoj-jupiter}"), warnings);
	}

	@Test
	void createOtherPattern() {
		mockAdmin();
		mockTemplates("{\"id\":\"T1\",\"name\":\"ligoj-jupiter\",\"projectKeyPattern\":\"jupiter\\\\..*\"}");
		mockWrites();
		httpServer.start();

		final var e = Assertions.assertThrows(ValidationJsonException.class, () -> resource.create(subscription));
		MatcherUtil.assertThrows(e, SonarQubePluginResource.PARAMETER_TEMPLATE_PATTERN, "sonar-template-exists");
		httpServer.verify(0, postRequestedFor(urlPathMatching("/api/.*")));
	}

	@Test
	void createInvalidPattern() {
		setParameter(SonarQubePluginResource.PARAMETER_TEMPLATE_PATTERN, "ligoj-jupiter:(");
		httpServer.start();
		MatcherUtil.assertThrows(Assertions.assertThrows(ValidationJsonException.class, () -> resource.create(subscription)),
				SonarQubePluginResource.PARAMETER_TEMPLATE_PATTERN, "sonar-template-pattern");
		httpServer.verify(0, anyRequestedFor(anyUrl()));
	}

	@Test
	void createBlankTemplate() {
		setParameter(SonarQubePluginResource.PARAMETER_TEMPLATE, "  ");
		httpServer.start();
		MatcherUtil.assertThrows(Assertions.assertThrows(ValidationJsonException.class, () -> resource.create(subscription)),
				SonarQubePluginResource.PARAMETER_TEMPLATE, "NotBlank");
	}

	@Test
	void createInvalidRoles() {
		httpServer.start();
		for (final var roles : List.of("[\"admin\"]", "{\"dev\": \"user\"}", "{\"dev\": []}", "{\" \": [\"user\"]}", "{oops")) {
			setParameter(SonarQubePluginResource.PARAMETER_ROLES, roles);
			MatcherUtil.assertThrows(Assertions.assertThrows(ValidationJsonException.class, () -> resource.create(subscription)),
					SonarQubePluginResource.PARAMETER_ROLES, "sonar-roles-json");
		}
		for (final var roles : List.of("{\"dev\": [\"write\"]}", "{\"dev\": [null]}")) {
			setParameter(SonarQubePluginResource.PARAMETER_ROLES, roles);
			MatcherUtil.assertThrows(Assertions.assertThrows(ValidationJsonException.class, () -> resource.create(subscription)),
					SonarQubePluginResource.PARAMETER_ROLES, "sonar-roles-permission");
		}
		httpServer.verify(0, anyRequestedFor(anyUrl()));
	}

	@Test
	void createNoRoles() throws Exception {
		setParameter(SonarQubePluginResource.PARAMETER_ROLES, " ");
		mockAdmin();
		mockTemplates("");
		mockWrites();
		httpServer.start();

		resource.create(subscription);
		httpServer.verify(postRequestedFor(urlEqualTo(CREATE_TEMPLATE)));
		httpServer.verify(0, getRequestedFor(urlPathEqualTo("/api/user_groups/search")));
		httpServer.verify(0, postRequestedFor(urlPathMatching("/api/permissions/.*_group_.*")));
	}

	@Test
	void createEncodesNames() throws Exception {
		setParameter(SonarQubePluginResource.PARAMETER_ROLES, "{\"team a+b&c\": [\"user\"]}");
		mockAdmin();
		mockTemplates("");
		mockGroup("team+a%2Bb%26c", "team a+b&c", false);
		mockWrites();
		httpServer.start();

		resource.create(subscription);
		httpServer.verify(postRequestedFor(urlEqualTo("/api/user_groups/create?name=team+a%2Bb%26c")));
		assertPermissions("team+a%2Bb%26c", "user");
	}

	@Test
	void createRefused() {
		mockAdmin();
		mockTemplates("");
		httpServer.stubFor(post(urlPathEqualTo("/api/permissions/create_template")).willReturn(forbidden()));
		httpServer.start();
		MatcherUtil.assertThrows(Assertions.assertThrows(ValidationJsonException.class, () -> resource.create(subscription)),
				SonarQubePluginResource.PARAMETER_USER, "sonar-admin");
	}

	@Test
	void createGroupRefused() {
		mockAdmin();
		mockTemplates("");
		mockGroup("ligoj-jupiter-admin", "ligoj-jupiter-admin", false);
		mockWrites();
		httpServer.stubFor(post(urlPathEqualTo("/api/user_groups/create")).willReturn(forbidden()));
		httpServer.start();
		MatcherUtil.assertThrows(Assertions.assertThrows(ValidationJsonException.class, () -> resource.create(subscription)),
				SonarQubePluginResource.PARAMETER_USER, "sonar-admin");
	}

	@Test
	void createCloud() throws Exception {
		// The node of a SonarQube Cloud organization
		final var pv = new ParameterValue();
		pv.setParameter(em.find(Parameter.class, SonarQubePluginResource.PARAMETER_ORGANIZATION));
		pv.setNode(em.find(Node.class, "service:qa:sonarqube:bpr"));
		pv.setData("my-org");
		em.persist(pv);
		em.flush();
		cacheManager.getCache("subscription-parameters").clear();
		setParameter(SonarQubePluginResource.PARAMETER_ROLES, "{\"ligoj-jupiter-dev\": [\"user\"]}");

		mockAdmin();
		httpServer.stubFor(get(urlEqualTo("/api/components/search?qualifiers=TRK&ps=1&organization=my-org")).willReturn(okJson("{\"components\":[]}")));
		httpServer.stubFor(get(urlEqualTo(SEARCH_TEMPLATE + "&organization=my-org")).willReturn(okJson("{\"permissionTemplates\":[]}")));
		httpServer.stubFor(get(urlEqualTo("/api/user_groups/search?q=ligoj-jupiter-dev&organization=my-org"))
				.willReturn(okJson("{\"groups\":[{\"name\":\"ligoj-jupiter-dev\"}]}")));
		mockWrites();
		httpServer.start();

		resource.create(subscription);
		httpServer.verify(postRequestedFor(urlEqualTo(CREATE_TEMPLATE + "&organization=my-org")));
		httpServer.verify(postRequestedFor(urlEqualTo(
				"/api/permissions/add_group_to_template?templateName=ligoj-jupiter&groupName=ligoj-jupiter-dev&permission=user&organization=my-org")));
	}
```

Add the import `com.github.tomakehurst.wiremock.client.ResponseDefinitionBuilder` (`java.util.*` already covers `TreeMap` and `Arrays`).

- [ ] **Step 3: Run them to verify they fail**

Run: `cd ~/git/ligoj-plugins/plugin-qa-sonarqube && mvn -o -Djarsigner.skip=true -Djacoco.skip=true -Dskip.ui.build=true -Dtest=SonarQubePluginResourceCreateTest test 2>&1 | grep -E 'ERROR.*java|Tests run:|cannot find symbol' | head`
Expected: compilation error on `SonarQubeTemplates` and `responseWarnings()`.

- [ ] **Step 4: Write `SonarQubeTemplates`**

```java
/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.plugin.sonarqube;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.Strings;
import org.ligoj.bootstrap.core.curl.CurlRequest;
import tools.jackson.databind.ObjectMapper;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Permission template operations on a SonarQube node: the template of a Ligoj project and the project permissions of
 * its groups. Each call uses its own processor, the authentication being sent with the first request of a processor
 * only. On SonarQube Cloud, every call is scoped to the node organization.
 */
class SonarQubeTemplates {

	/**
	 * Project permissions a template grants, as the ligoj CLI {@code SONAR_PERMISSIONS_PROJECT}.
	 */
	static final List<String> PERMISSIONS = List.of("user", "codeviewer", "issueadmin", "securityhotspotadmin", "scan", "admin");

	/**
	 * A permission template.
	 *
	 * @param id                The SonarQube identifier.
	 * @param name              The unique name.
	 * @param projectKeyPattern The regular expression of the project keys it applies to, may be {@code null}.
	 */
	@JsonIgnoreProperties(ignoreUnknown = true)
	record SonarQubeTemplate(String id, String name, String projectKeyPattern) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record TemplateList(List<SonarQubeTemplate> permissionTemplates) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record Group(String name) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record GroupList(List<Group> groups) {
	}

	private final Map<String, String> parameters;

	private final ObjectMapper objectMapper;

	private final String baseUrl;

	/**
	 * The organization query parameter, empty for a SonarQube Server.
	 */
	private final String organization;

	SonarQubeTemplates(final Map<String, String> parameters, final ObjectMapper objectMapper) {
		this.parameters = parameters;
		this.objectMapper = objectMapper;
		this.baseUrl = Strings.CS.appendIfMissing(parameters.get(SonarQubePluginResource.PARAMETER_URL), "/");
		final var org = StringUtils.trimToNull(parameters.get(SonarQubePluginResource.PARAMETER_ORGANIZATION));
		this.organization = org == null ? "" : "&organization=" + encode(org);
	}

	static String encode(final String value) {
		return URLEncoder.encode(value, StandardCharsets.UTF_8);
	}

	/**
	 * Return the JSON of a resource, {@code null} when SonarQube refuses or fails.
	 */
	String get(final String resource) {
		try (var processor = new SonarQubeCurlProcessor(parameters)) {
			return processor.get(baseUrl + resource + organization);
		}
	}

	/**
	 * Send a write, its parameters in the query as the SonarQube web API accepts them.
	 *
	 * @return {@code true} when SonarQube accepted it.
	 */
	private boolean post(final String resource) {
		try (var processor = new SonarQubeCurlProcessor(parameters)) {
			return processor.process(new CurlRequest("POST", baseUrl + resource + organization, null));
		}
	}

	/**
	 * Return the template of this name, {@code null} when missing or unreadable. The search matches a part of the
	 * name, the exact name is kept.
	 */
	SonarQubeTemplate find(final String name) {
		final var json = get("api/permissions/search_templates?q=" + encode(name));
		if (json == null) {
			return null;
		}
		final var templates = objectMapper.readValue(json, TemplateList.class).permissionTemplates();
		return templates == null ? null : templates.stream().filter(t -> name.equals(t.name())).findFirst().orElse(null);
	}

	/**
	 * Create the template.
	 *
	 * @return {@code true} when SonarQube accepted it.
	 */
	boolean create(final String name, final String pattern, final String description) {
		return post("api/permissions/create_template?name=" + encode(name) + "&projectKeyPattern=" + encode(pattern)
				+ "&description=" + encode(description));
	}

	/**
	 * Create the group when SonarQube does not know it yet, as the ligoj CLI.
	 *
	 * @return {@code false} when the group cannot be read or created.
	 */
	boolean ensureGroup(final String group) {
		final var json = get("api/user_groups/search?q=" + encode(group));
		if (json == null) {
			return false;
		}
		final var groups = objectMapper.readValue(json, GroupList.class).groups();
		return groups != null && groups.stream().anyMatch(g -> group.equals(g.name()))
				|| post("api/user_groups/create?name=" + encode(group));
	}

	/**
	 * Give the group exactly these project permissions on the template, as the ligoj CLI: the listed ones are added,
	 * the others removed. Removing a permission the group does not have is not an error.
	 *
	 * @return {@code false} when SonarQube refuses an addition.
	 */
	boolean grant(final String template, final String group, final Collection<String> permissions) {
		final var target = "?templateName=" + encode(template) + "&groupName=" + encode(group) + "&permission=";
		for (final var permission : PERMISSIONS) {
			if (permissions.contains(permission)) {
				if (!post("api/permissions/add_group_to_template" + target + permission)) {
					return false;
				}
			} else {
				post("api/permissions/remove_group_from_template" + target + permission);
			}
		}
		return true;
	}
}
```

- [ ] **Step 5: Write `create` in the resource**

Add the warning sink, the factory, the role parsing and `create` (before `update`):

```java
	/**
	 * Sink of the non-blocking warnings of a subscription creation or deletion, reported to the caller.
	 */
	protected ResponseWarnings.Sink responseWarnings() {
		return ResponseWarnings::add;
	}

	private SonarQubeTemplates newTemplates(final Map<String, String> parameters) {
		return new SonarQubeTemplates(parameters, objectMapper);
	}

	/**
	 * Create the permission template of the project, or reuse a template of the same name and pattern, then give each
	 * group of the role mapping its project permissions on it. Everything is validated before the first remote call.
	 * The existing projects keep their permissions: SonarQube applies a template when a project is created.
	 */
	@Override
	public void create(final int subscription) {
		final var parameters = subscriptionResource.getParameters(subscription);
		final var name = StringUtils.trimToEmpty(parameters.get(PARAMETER_TEMPLATE));
		if (name.isEmpty()) {
			throw new ValidationJsonException(PARAMETER_TEMPLATE, "NotBlank");
		}
		final var pattern = StringUtils.trimToEmpty(parameters.get(PARAMETER_TEMPLATE_PATTERN));
		if (pattern.isEmpty()) {
			throw new ValidationJsonException(PARAMETER_TEMPLATE_PATTERN, "NotBlank");
		}
		try {
			Pattern.compile(pattern);
		} catch (final PatternSyntaxException e) {
			throw new ValidationJsonException(PARAMETER_TEMPLATE_PATTERN, "sonar-template-pattern");
		}
		final var roles = parseRoles(parameters.get(PARAMETER_ROLES));
		validateAdminAccess(parameters);

		final var templates = newTemplates(parameters);
		final var existing = templates.find(name);
		if (existing == null) {
			final var description = "Ligoj project " + subscriptionRepository.findOneExpected(subscription).getProject().getName();
			if (!templates.create(name, pattern, description)) {
				throw new ValidationJsonException(PARAMETER_USER, "sonar-admin");
			}
		} else if (pattern.equals(existing.projectKeyPattern())) {
			log.info("SonarQube permission template {} already exists, reused", name);
			responseWarnings().warn("sonar-template-reused", ResponseWarnings.parameters("template", name));
		} else {
			throw new ValidationJsonException(PARAMETER_TEMPLATE_PATTERN, "sonar-template-exists", "pattern",
					Objects.toString(existing.projectKeyPattern(), ""));
		}
		roles.forEach((group, permissions) -> {
			if (!templates.ensureGroup(group) || !templates.grant(name, group, permissions)) {
				throw new ValidationJsonException(PARAMETER_USER, "sonar-admin");
			}
		});
	}

	/**
	 * Parse and validate the role mapping, trimmed first: a JSON object keyed by group, each value a non-empty list of
	 * project permissions. Blank: no group permission.
	 */
	private Map<String, List<String>> parseRoles(final String raw) {
		final var json = StringUtils.trimToNull(raw);
		if (json == null) {
			return Map.of();
		}
		final Map<String, List<String>> roles;
		try {
			roles = objectMapper.readValue(json, new TypeReference<LinkedHashMap<String, List<String>>>() {
				// Nothing to extend
			});
		} catch (final JacksonException e) {
			log.info("Invalid SonarQube role mapping: {}", e.getOriginalMessage());
			throw new ValidationJsonException(PARAMETER_ROLES, "sonar-roles-json");
		}
		roles.forEach((group, permissions) -> {
			if (StringUtils.isBlank(group) || permissions == null || permissions.isEmpty()) {
				throw new ValidationJsonException(PARAMETER_ROLES, "sonar-roles-json");
			}
			permissions.stream().filter(p -> p == null || !SonarQubeTemplates.PERMISSIONS.contains(p)).findFirst().ifPresent(p -> {
				throw new ValidationJsonException(PARAMETER_ROLES, "sonar-roles-permission", "group", group, "permission",
						String.valueOf(p));
			});
		});
		return roles;
	}
```

Imports: `java.util.regex.Pattern`, `java.util.regex.PatternSyntaxException` (`java.util.*` already covers `LinkedHashMap`, `List`, `Map`, `Objects`).

If Jackson coerces `{"dev": "user"}` into a list (the `createInvalidRoles` assertion fails with no exception), check `permissions` is a real JSON array by parsing with `objectMapper.readTree(json)` first: every field value must be `isArray()`, else `sonar-roles-json`; then convert. Record the deviation as a ruling.

- [ ] **Step 6: Run the tests**

Run: same command as Step 3.
Expected: `Tests run: 12, Failures: 0, Errors: 0` (2 from Task 1, 10 new).

---

### Task 3: The status check finds the projects of the template

**Files:**
- Create: `src/main/java/org/ligoj/app/plugin/sonarqube/SonarQubeTemplateProject.java`
- Modify: `src/main/java/org/ligoj/app/plugin/sonarqube/SonarQubeTemplates.java`, `SonarQubePluginResource.java`
- Test: `SonarQubePluginResourceCreateTest.java`

**Interfaces:**
- Consumes: `SonarQubeTemplates.find(String)`, `get(String)`.
- Produces: `List<SonarQubeTemplateProject> SonarQubeTemplates.projects(String pattern)`; `static String literalPrefix(String)`; status data keys `template` (`{name, pattern}`), `project` (`SonarQubeProject`, optional), `projects` (`List<SonarQubeTemplateProject>`, at most 20), `projectsCount` (`int`). Task 6 renders these keys.

- [ ] **Step 1: Write the failing tests**

```java
	private static final String PROJECTS = "/api/projects/search?ps=500&p=1&q=ligoj-jupiter%3A";

	/**
	 * The latest analyzed project: its measures, no branch.
	 */
	private Map<String, String> statusParameters() {
		final var parameters = new HashMap<>(subscriptionResource.getParameters(subscription));
		parameters.put(SonarQubePluginResource.PARAMETER_MAX_BRANCHES, "1");
		return parameters;
	}

	private void mockMeasures(final String key) {
		httpServer.stubFor(get(urlEqualTo("/api/server/version")).willReturn(ok("26.6.0.123539")));
		httpServer.stubFor(get(urlEqualTo("/api/measures/component?component=" + SonarQubeTemplates.encode(key)
				+ "&metricKeys=" + SonarQubePluginResource.DEFAULT_METRICS_63))
				.willReturn(okJson("{\"component\":{\"key\":\"" + key + "\",\"name\":\"API\",\"measures\":[{\"metric\":\"ncloc\",\"value\":\"120\"}]}}")));
	}

	@SuppressWarnings("unchecked")
	private static List<String> keys(final Map<String, Object> data) {
		return ((List<SonarQubeTemplateProject>) data.get("projects")).stream().map(SonarQubeTemplateProject::key).toList();
	}

	@Test
	void statusTemplate() throws Exception {
		mockTemplates("{\"id\":\"T1\",\"name\":\"ligoj-jupiter\",\"projectKeyPattern\":\"ligoj-jupiter:.*\"}");
		httpServer.stubFor(get(urlEqualTo(PROJECTS)).willReturn(okJson("""
				{"paging": {"pageIndex": 1, "pageSize": 500, "total": 5}, "components": [
				  {"key": "ligoj-jupiter:web", "name": "Web", "lastAnalysisDate": "2026-10-01T08:00:00+0000"},
				  {"key": "ligoj-jupiter:new", "name": "New"},
				  {"key": "ligoj-jupiter:api", "name": "API", "lastAnalysisDate": "2026-10-10T08:00:00+0200"},
				  {"key": "ligoj-jupiter:bad", "name": "Bad", "lastAnalysisDate": "yesterday"},
				  {"key": "other:ligoj-jupiter:x", "name": "Other", "lastAnalysisDate": "2026-10-12T08:00:00+0000"}]}""")));
		mockMeasures("ligoj-jupiter:api");
		httpServer.start();

		final var data = resource.checkSubscriptionStatus(statusParameters()).getData();
		Assertions.assertEquals(Map.of("name", "ligoj-jupiter", "pattern", "ligoj-jupiter:.*"), data.get("template"));
		// Latest analysis first, the never analyzed and unreadable dates last, by key; the other keys are ignored
		Assertions.assertEquals(List.of("ligoj-jupiter:api", "ligoj-jupiter:web", "ligoj-jupiter:bad", "ligoj-jupiter:new"), keys(data));
		Assertions.assertEquals(4, data.get("projectsCount"));
		final var project = (SonarQubeProject) data.get("project");
		Assertions.assertEquals("ligoj-jupiter:api", project.getKey());
		Assertions.assertEquals(120, project.getMeasuresAsMap().get("ncloc"));
	}

	@Test
	void statusTemplateNotAnalyzed() throws Exception {
		mockTemplates("{\"id\":\"T1\",\"name\":\"ligoj-jupiter\",\"projectKeyPattern\":\"ligoj-jupiter:.*\"}");
		httpServer.stubFor(get(urlEqualTo(PROJECTS)).willReturn(okJson("""
				{"paging": {"pageIndex": 1, "pageSize": 500, "total": 1}, "components": [{"key": "ligoj-jupiter:new", "name": "New"}]}""")));
		httpServer.start();

		final var data = resource.checkSubscriptionStatus(statusParameters()).getData();
		Assertions.assertEquals(List.of("ligoj-jupiter:new"), keys(data));
		Assertions.assertFalse(data.containsKey("project"));
	}

	@Test
	void statusTemplateMissing() {
		mockTemplates("");
		httpServer.start();
		MatcherUtil.assertThrows(Assertions.assertThrows(ValidationJsonException.class, () -> resource.checkSubscriptionStatus(statusParameters())),
				SonarQubePluginResource.PARAMETER_TEMPLATE, "sonar-template");
	}

	@Test
	void statusTemplateWithoutPattern() throws Exception {
		mockTemplates("{\"id\":\"T1\",\"name\":\"ligoj-jupiter\"}");
		httpServer.start();

		final var data = resource.checkSubscriptionStatus(statusParameters()).getData();
		Assertions.assertEquals(List.of(), keys(data));
		Assertions.assertEquals(0, data.get("projectsCount"));
		httpServer.verify(0, getRequestedFor(urlPathEqualTo("/api/projects/search")));
	}

	@Test
	void statusTemplatePaging() throws Exception {
		// No literal start: no server side filter
		mockTemplates("{\"id\":\"T1\",\"name\":\"ligoj-jupiter\",\"projectKeyPattern\":\".*-jupiter:.*\"}");
		httpServer.stubFor(get(urlEqualTo("/api/projects/search?ps=500&p=1")).willReturn(okJson("""
				{"paging": {"pageIndex": 1, "pageSize": 500, "total": 501}, "components": [{"key": "ligoj-jupiter:a", "name": "A"}]}""")));
		httpServer.stubFor(get(urlEqualTo("/api/projects/search?ps=500&p=2")).willReturn(okJson("""
				{"paging": {"pageIndex": 2, "pageSize": 500, "total": 501}, "components": [{"key": "ligoj-jupiter:b", "name": "B"}]}""")));
		httpServer.start();

		Assertions.assertEquals(List.of("ligoj-jupiter:a", "ligoj-jupiter:b"), keys(resource.checkSubscriptionStatus(statusParameters()).getData()));
	}

	@Test
	void literalPrefix() {
		Assertions.assertEquals("ligoj-jupiter:", SonarQubeTemplates.literalPrefix("ligoj-jupiter:.*"));
		Assertions.assertEquals("", SonarQubeTemplates.literalPrefix(".*"));
		Assertions.assertEquals("abc", SonarQubeTemplates.literalPrefix("abc"));
	}
```

- [ ] **Step 2: Run them to verify they fail**

Run: same command as Task 2 Step 3.
Expected: compilation error on `SonarQubeTemplateProject` and `literalPrefix`.

- [ ] **Step 3: Write `SonarQubeTemplateProject`**

```java
/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.plugin.sonarqube;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * A SonarQube project a permission template applies to, listed in the status data of a template-based subscription.
 *
 * @param key              The project key.
 * @param name             The project name.
 * @param lastAnalysisDate The last analysis date as SonarQube returns it, {@code null} when never analyzed.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SonarQubeTemplateProject(String key, String name, String lastAnalysisDate) {
}
```

- [ ] **Step 4: Add the project search to `SonarQubeTemplates`**

Constants and records, after `PERMISSIONS`:

```java
	/**
	 * Projects per page of the project search, the SonarQube maximum.
	 */
	static final int PAGE_SIZE = 500;

	/**
	 * Pages read at most: 10,000 projects.
	 */
	static final int MAX_PAGES = 20;

	/**
	 * Regular expression characters ending the literal start of a pattern.
	 */
	private static final String REGEX_CHARS = "\\.[]{}()*+?^$|";

	/**
	 * Analysis dates of SonarQube, such as {@code 2026-10-10T08:00:00+0000}.
	 */
	private static final DateTimeFormatter ANALYSIS_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssZ");

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record Paging(int total) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record ProjectPage(Paging paging, List<SonarQubeTemplateProject> components) {
	}
```

Methods:

```java
	/**
	 * Return the projects whose key matches the pattern, latest analysis first, the never analyzed ones last, then by
	 * key. The literal start of the pattern, when long enough, narrows the search on the server: the search matches a
	 * part of the key, so it returns a superset.
	 *
	 * @param pattern The project key pattern of the template, may be {@code null}.
	 * @return The matching projects, empty without a usable pattern.
	 */
	List<SonarQubeTemplateProject> projects(final String pattern) {
		if (StringUtils.isBlank(pattern)) {
			return List.of();
		}
		final Pattern regex;
		try {
			regex = Pattern.compile(pattern);
		} catch (final PatternSyntaxException e) {
			log.info("Unusable project key pattern {}", pattern);
			return List.of();
		}
		final var literal = literalPrefix(pattern);
		final var query = literal.length() < 2 ? "" : "&q=" + encode(literal);
		final var matching = new ArrayList<SonarQubeTemplateProject>();
		for (var page = 1; page <= MAX_PAGES; page++) {
			final var json = get("api/projects/search?ps=" + PAGE_SIZE + "&p=" + page + query);
			if (json == null) {
				break;
			}
			final var result = objectMapper.readValue(json, ProjectPage.class);
			ListUtils.emptyIfNull(result.components()).stream().filter(p -> p.key() != null && regex.matcher(p.key()).matches())
					.forEach(matching::add);
			if (result.paging() == null || page * PAGE_SIZE >= result.paging().total()) {
				break;
			}
			if (page == MAX_PAGES) {
				log.info("Projects matching {} beyond the first {} are ignored", pattern, MAX_PAGES * PAGE_SIZE);
			}
		}
		matching.sort(Comparator.comparing(SonarQubeTemplates::analysisTime, Comparator.nullsLast(Comparator.reverseOrder()))
				.thenComparing(SonarQubeTemplateProject::key));
		return matching;
	}

	/**
	 * Return the literal start of a regular expression, up to its first special character.
	 */
	static String literalPrefix(final String pattern) {
		final var end = StringUtils.indexOfAny(pattern, REGEX_CHARS);
		return end < 0 ? pattern : pattern.substring(0, end);
	}

	/**
	 * Return the last analysis time, {@code null} when never analyzed or unreadable.
	 */
	static Instant analysisTime(final SonarQubeTemplateProject project) {
		try {
			return project.lastAnalysisDate() == null ? null : ANALYSIS_DATE.parse(project.lastAnalysisDate(), Instant::from);
		} catch (final DateTimeParseException e) {
			return null;
		}
	}
```

Add `@Slf4j` on the class and the imports `lombok.extern.slf4j.Slf4j`, `org.apache.commons.collections4.ListUtils`, `java.time.Instant`, `java.time.format.DateTimeFormatter`, `java.time.format.DateTimeParseException`, `java.util.ArrayList`, `java.util.Comparator`, `java.util.regex.Pattern`, `java.util.regex.PatternSyntaxException`. If `commons-collections4` is not on the classpath, use `Objects.requireNonNullElse(result.components(), List.<SonarQubeTemplateProject>of())`.

- [ ] **Step 5: Branch the status check**

Replace `checkSubscriptionStatus`:

```java
	/**
	 * Projects of a template listed in the status data at most.
	 */
	static final int LISTED_PROJECTS = 20;

	@Override
	public SubscriptionStatusWithData checkSubscriptionStatus(final Map<String, String> parameters) throws Exception {
		final var nodeStatusWithData = new SubscriptionStatusWithData();
		final var template = StringUtils.trimToNull(parameters.get(PARAMETER_TEMPLATE));
		if (template == null) {
			nodeStatusWithData.put("project", validateProject(parameters));
		} else {
			checkTemplateStatus(parameters, template, nodeStatusWithData);
		}
		return nodeStatusWithData;
	}

	/**
	 * Gather the projects of the permission template: the template as SonarQube has it now, the matching projects, and
	 * the details of the latest analyzed one in the shape of a linked project.
	 */
	private void checkTemplateStatus(final Map<String, String> parameters, final String name, final SubscriptionStatusWithData data) {
		final var templates = newTemplates(parameters);
		final var template = templates.find(name);
		if (template == null) {
			throw new ValidationJsonException(PARAMETER_TEMPLATE, "sonar-template", "name", name);
		}
		final var projects = templates.projects(template.projectKeyPattern());
		data.put("template", Map.of("name", template.name(), "pattern", StringUtils.defaultString(template.projectKeyPattern())));
		data.put("projects", List.copyOf(projects.subList(0, Math.min(LISTED_PROJECTS, projects.size()))));
		data.put("projectsCount", projects.size());
		projects.stream().filter(p -> SonarQubeTemplates.analysisTime(p) != null).findFirst().map(p -> getProject(parameters, p.key()))
				.ifPresent(p -> data.put("project", p));
	}
```

The latest project is the first with a readable analysis date: `ligoj-jupiter:bad`, with an unreadable one, is never shown as the latest.

- [ ] **Step 6: Run the tests**

Run: same command.
Expected: `Tests run: 18, Failures: 0, Errors: 0`.

---

### Task 4: Unsubscribing deletes the template

**Files:**
- Modify: `SonarQubeTemplates.java`, `SonarQubePluginResource.java`
- Test: `SonarQubePluginResourceCreateTest.java`

**Interfaces:**
- Produces: `boolean SonarQubeTemplates.delete(String name)`; `SonarQubePluginResource.delete(int, boolean)`.

- [ ] **Step 1: Write the failing tests**

```java
	private static final String DELETE_TEMPLATE = "/api/permissions/delete_template?templateName=ligoj-jupiter";

	@Test
	void deleteNoRemoteData() throws Exception {
		httpServer.start();
		resource.delete(subscription, false);
		httpServer.verify(0, anyRequestedFor(anyUrl()));
	}

	@Test
	void deleteLinkSubscription() throws Exception {
		setParameter(SonarQubePluginResource.PARAMETER_TEMPLATE, null);
		setParameter(SonarQubePluginResource.PARAMETER_PROJECT, "123456");
		httpServer.start();
		resource.delete(subscription, true);
		httpServer.verify(0, anyRequestedFor(anyUrl()));
	}

	@Test
	void deleteTemplate() throws Exception {
		mockTemplates("{\"id\":\"T1\",\"name\":\"ligoj-jupiter\",\"projectKeyPattern\":\"ligoj-jupiter:.*\"}");
		mockWrites();
		httpServer.start();

		resource.delete(subscription, true);
		httpServer.verify(postRequestedFor(urlEqualTo(DELETE_TEMPLATE)));
		// Groups and projects are kept
		httpServer.verify(1, postRequestedFor(urlPathMatching("/api/.*")));
		Assertions.assertEquals(List.of(), warnings);
	}

	@Test
	void deleteTemplateGone() throws Exception {
		mockTemplates("");
		mockWrites();
		httpServer.start();

		resource.delete(subscription, true);
		httpServer.verify(0, postRequestedFor(urlPathMatching("/api/.*")));
		Assertions.assertEquals(List.of("sonar-template-missing {template=ligoj-jupiter}"), warnings);
	}

	@Test
	void deleteRefused() {
		mockTemplates("{\"id\":\"T1\",\"name\":\"ligoj-jupiter\",\"projectKeyPattern\":\"ligoj-jupiter:.*\"}");
		httpServer.stubFor(post(urlPathEqualTo("/api/permissions/delete_template")).willReturn(forbidden()));
		httpServer.start();
		MatcherUtil.assertThrows(Assertions.assertThrows(ValidationJsonException.class, () -> resource.delete(subscription, true)),
				SonarQubePluginResource.PARAMETER_USER, "sonar-admin");
	}
```

- [ ] **Step 2: Run them to verify they fail**

Run: same command.
Expected: `deleteTemplate`, `deleteTemplateGone`, `deleteRefused` fail (the inherited `delete` does nothing); the two others pass already.

- [ ] **Step 3: Implement**

In `SonarQubeTemplates`:

```java
	/**
	 * Delete the template.
	 *
	 * @return {@code true} when SonarQube accepted it.
	 */
	boolean delete(final String name) {
		return post("api/permissions/delete_template?templateName=" + encode(name));
	}
```

In the resource, after `create`:

```java
	/**
	 * Delete the remote data of a template-based subscription: its permission template. The groups are kept, often
	 * shared or synchronized from LDAP, and the projects too, created by the scanners. A template already gone is a
	 * warning.
	 */
	@Override
	public void delete(final int subscription, final boolean deleteRemoteData) {
		if (!deleteRemoteData) {
			return;
		}
		final var parameters = subscriptionResource.getParameters(subscription);
		final var name = StringUtils.trimToNull(parameters.get(PARAMETER_TEMPLATE));
		if (name == null) {
			// A linked project is not a remote data of Ligoj
			return;
		}
		final var templates = newTemplates(parameters);
		if (templates.find(name) == null) {
			log.info("SonarQube permission template {} already deleted", name);
			responseWarnings().warn("sonar-template-missing", ResponseWarnings.parameters("template", name));
		} else if (!templates.delete(name)) {
			throw new ValidationJsonException(PARAMETER_USER, "sonar-admin");
		}
	}
```

- [ ] **Step 4: Run the tests, then the whole suite and the Javadoc**

Run: same command, then `mvn -o -Djarsigner.skip=true -Djacoco.skip=true -Dskip.ui.build=true test 2>&1 | grep -E 'Tests run:|FAIL' | tail -4`, then `mvn -o -Pjavadoc -Djarsigner.skip=true -Djacoco.skip=true -Dskip.ui.build=true -DskipTests package 2>&1 | grep -cE '\.java:[0-9]+: (error|warning)'`.
Expected: `Tests run: 23, Failures: 0, Errors: 0` for the class; the plugin suite without failure; `0` Javadoc issue.

---

### Task 5: Subscription form fields, layout and the roles summary

**Files:**
- Create: `ui/src/params.js`, `ui/src/sonarJson.js`, `ui/src/fields/SonarTemplateField.vue`, `ui/src/fields/SonarRolesField.vue`
- Modify: `ui/src/service.js`, `ui/src/index.js`, `ui/src/i18n/en.js`, `ui/src/i18n/fr.js`
- Test: `ui/src/__tests__/sonarqube-create-mode.test.js`

**Interfaces:**
- Produces: `params.js` exports `PARAM_URL`, `PARAM_PROJECT`, `PARAM_TEMPLATE`, `PARAM_TEMPLATE_PATTERN`, `PARAM_ROLES`; `sonarJson.js` exports `PERMISSIONS`, `rolesError(value)`, `rolesSample(pkey)`, `rolesSummary(value, t)`; features `parameterLayout`, `parameterSummary`; `parameterField` also returns the two new fields.

- [ ] **Step 1: Write the failing tests**

```js
/*
 * CREATE mode of SonarQube: the permission template fields of the subscription form, prefilled from the project key,
 * the role mapping checks, the layout, and the role mapping summary of the status tooltip.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { useI18nStore } from '@ligoj/host'
import def from '../index.js'
import { rolesError, rolesSample } from '../sonarJson.js'

const TEMPLATE = { id: 'service:qa:sonarqube:template', type: 'TEXT', mandatory: true }
const PATTERN = { id: 'service:qa:sonarqube:template-pattern', type: 'TEXT', mandatory: true }
const ROLES = { id: 'service:qa:sonarqube:roles', type: 'TEXT', mandatory: false }
const PROJECT = { id: 1, name: 'Demo', pkey: 'demo-1' }
const stubs = {
  LigojTextField: { name: 'LigojTextField', props: ['modelValue', 'label'], template: '<input />' },
  LigojTextarea: { name: 'LigojTextarea', props: ['modelValue', 'label', 'placeholder'], template: '<textarea />' },
}

beforeEach(() => {
  setActivePinia(createPinia())
  def.install()
  useI18nStore().setLocale('en')
})

describe('SonarQube CREATE mode form', () => {
  it('orders the template fields in CREATE mode only', () => {
    expect(def.feature('parameterLayout', { mode: 'create', isNode: false })).toEqual([{ parameters: [TEMPLATE.id, PATTERN.id, ROLES.id] }])
    expect(def.feature('parameterLayout', { mode: 'link', isNode: false })).toEqual([])
    expect(def.feature('parameterLayout', { mode: 'create', isNode: true })).toEqual([])
  })

  it('gives a field to each template parameter, the default input to edit a node', () => {
    const field = def.feature('parameterField', { parameter: TEMPLATE, mode: 'create', isNode: false })
    expect(field).toBeTruthy()
    expect(def.feature('parameterField', { parameter: PATTERN, mode: 'create', isNode: false })).toBe(field)
    expect(def.feature('parameterField', { parameter: ROLES, mode: 'create', isNode: false })).toBeTruthy()
    expect(def.feature('parameterField', { parameter: TEMPLATE, mode: 'create', isNode: true })).toBeNull()
  })

  it('prefills the template name and pattern from the project key', () => {
    const Field = def.feature('parameterField', { parameter: TEMPLATE, mode: 'create', isNode: false })
    const name = mount(Field, { props: { parameter: TEMPLATE, mode: 'create', project: PROJECT, modelValue: '' }, global: { stubs } })
    expect(name.emitted('update:modelValue')[0]).toEqual(['demo-1'])
    const pattern = mount(Field, { props: { parameter: PATTERN, mode: 'create', project: PROJECT, modelValue: null }, global: { stubs } })
    expect(pattern.emitted('update:modelValue')[0]).toEqual(['demo-1:.*'])
    // A typed value is kept
    const typed = mount(Field, { props: { parameter: TEMPLATE, mode: 'create', project: PROJECT, modelValue: 'team' }, global: { stubs } })
    expect(typed.emitted('update:modelValue')).toBeUndefined()
  })

  it('suggests a role mapping built from the project key', () => {
    const Field = def.feature('parameterField', { parameter: ROLES, mode: 'create', isNode: false })
    const w = mount(Field, { props: { parameter: ROLES, mode: 'create', project: PROJECT, modelValue: '' }, global: { stubs } })
    expect(w.findComponent({ name: 'LigojTextarea' }).props('placeholder')).toBe(rolesSample('demo-1'))
    expect(rolesSample('demo-1')).toContain('"demo-1-dev": ["user", "codeviewer", "scan"]')
  })

  it('checks the role mapping as the backend does', () => {
    expect(rolesError('')).toBeNull()
    expect(rolesError(rolesSample('demo-1'))).toBeNull()
    expect(rolesError('{oops')).toBe('error.rule.sonar-roles-json')
    expect(rolesError('["admin"]')).toBe('error.rule.sonar-roles-json')
    expect(rolesError('{"dev": "user"}')).toBe('error.rule.sonar-roles-json')
    expect(rolesError('{"dev": []}')).toBe('error.rule.sonar-roles-json')
    expect(rolesError('{" ": ["user"]}')).toBe('error.rule.sonar-roles-json')
    expect(rolesError('{"dev": ["write"]}')).toBe('error.rule.sonar-roles-permission')
  })

  it('summarizes the role mapping in the status tooltip', () => {
    const summary = (value) => def.feature('parameterSummary', { parameter: ROLES.id, value })
    expect(summary(rolesSample('demo-1'))).toBe('2 groups: demo-1-admin, demo-1-dev')
    expect(summary('{"a": ["user"]}')).toBe('1 group: a')
    expect(summary(JSON.stringify({ a: ['user'], b: ['user'], c: ['user'], d: ['user'] }))).toBe('4 groups: a, b, c +1')
    expect(summary('{}')).toBe('No group')
    expect(summary('{oops')).toBeNull()
    expect(def.feature('parameterSummary', { parameter: TEMPLATE.id, value: 'demo-1' })).toBeNull()
    useI18nStore().setLocale('fr')
    expect(summary('{"a": ["user"], "b": ["user"]}')).toBe('2 groupes : a, b')
  })

  it('labels the CREATE mode in English and French', async () => {
    const en = (await import('../i18n/en.js')).default
    const fr = (await import('../i18n/fr.js')).default
    for (const key of ['service:qa:sonarqube:template', 'service:qa:sonarqube:template-description', 'service:qa:sonarqube:template-pattern',
      'service:qa:sonarqube:template-pattern-description', 'service:qa:sonarqube:roles', 'service:qa:sonarqube:roles-description',
      'error.rule.sonar-roles-json', 'error.rule.sonar-roles-permission', 'error.rule.sonar-template-pattern', 'error.rule.sonar-template-exists',
      'error.rule.sonar-template', 'error.rule.sonar-admin', 'warning.sonar-template-reused', 'warning.sonar-template-missing']) {
      expect(en[key], key).toBeTruthy()
      expect(fr[key], key).toBeTruthy()
      expect(fr[key], key).not.toBe(en[key])
    }
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `/bin/bash --noprofile --norc -c 'export PATH=/Users/fabdouglas/.nvm/versions/node/v26.8.1/bin:$PATH; cd ~/git/ligoj-plugins/plugin-qa-sonarqube/ui && npx vitest run src/__tests__/sonarqube-create-mode.test.js 2>&1 | grep -E "✓|×|Error|Tests "'`
Expected: fails to import `../sonarJson.js`.

- [ ] **Step 3: Write `params.js` and `sonarJson.js`**

`ui/src/params.js`:

```js
// Parameter identifiers of the SonarQube tool.
export const PARAM_URL = 'service:qa:sonarqube:url'
export const PARAM_PROJECT = 'service:qa:sonarqube:project'
export const PARAM_TEMPLATE = 'service:qa:sonarqube:template'
export const PARAM_TEMPLATE_PATTERN = 'service:qa:sonarqube:template-pattern'
export const PARAM_ROLES = 'service:qa:sonarqube:roles'
```

`ui/src/sonarJson.js`:

```js
/**
 * Role mapping of the CREATE mode (`service:qa:sonarqube:roles`): a JSON object keyed by SonarQube group, each value
 * the non-empty list of the project permissions the permission template grants to the group. The checks mirror the
 * backend so the message shows while typing; the backend stays the reference. A blank value is valid: no group
 * permission.
 */

/** Project permissions of a permission template. */
export const PERMISSIONS = ['user', 'codeviewer', 'issueadmin', 'securityhotspotadmin', 'scan', 'admin']

/** Groups named in a summary; the others are counted. */
const SUMMARY_NAMES = 3

function parseObject(value) {
  const text = String(value ?? '').trim()
  if (!text) return { empty: true }
  try {
    const json = JSON.parse(text)
    return json && typeof json === 'object' && !Array.isArray(json) ? { json } : { invalid: true }
  } catch {
    return { invalid: true }
  }
}

/**
 * @param {string|null|undefined} value The typed mapping.
 * @returns {string|null} The i18n key of the first problem, or null.
 */
export function rolesError(value) {
  const { json, invalid } = parseObject(value)
  if (invalid) return 'error.rule.sonar-roles-json'
  for (const [group, permissions] of Object.entries(json || {})) {
    if (!group.trim() || !Array.isArray(permissions) || !permissions.length) return 'error.rule.sonar-roles-json'
    if (permissions.some((p) => !PERMISSIONS.includes(p))) return 'error.rule.sonar-roles-permission'
  }
  return null
}

/**
 * Role mapping sample of a project, placeholder of the roles input: its administrators and developers groups.
 *
 * @param {string} pkey The project key.
 */
export function rolesSample(pkey) {
  const key = pkey || 'project'
  return `{\n  "${key}-admin": ["admin", "user"],\n  "${key}-dev": ["user", "codeviewer", "scan"]\n}`
}

/**
 * Short text of the role mapping, for the subscription status tooltip: "2 groups: demo-1-admin, demo-1-dev", the first
 * names only then "+N".
 *
 * @returns {string|null} The summary, or null for a blank or unreadable value.
 */
export function rolesSummary(value, t) {
  const { json } = parseObject(value)
  if (!json) return null
  const names = Object.keys(json)
  const shown = names.slice(0, SUMMARY_NAMES).join(', ') + (names.length > SUMMARY_NAMES ? ` +${names.length - SUMMARY_NAMES}` : '')
  return t('service:qa:sonarqube:roles-summary', { count: names.length, names: shown }, names.length)
}
```

- [ ] **Step 4: Write the two fields**

`ui/src/fields/SonarTemplateField.vue`:

```vue
<template>
  <!-- CREATE mode: the permission template name and the project key pattern it applies to, prefilled from the Ligoj
       project key while empty (`demo-1`, `demo-1:.*`), editable. -->
  <LigojTextField
    :model-value="modelValue"
    :label="label"
    :hint="t(`${parameter.id}-description`)"
    :rules="rules"
    persistent-hint
    variant="outlined"
    density="compact"
    @update:model-value="(v) => emit('update:modelValue', v ?? '')"
  />
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18nStore, LigojTextField } from '@ligoj/host'
import { PARAM_TEMPLATE } from '../params.js'

const props = defineProps({
  modelValue: { type: [String, null], default: null },
  parameter: { type: Object, required: true },
  formValues: { type: Object, default: () => ({}) },
  mode: { type: String, default: null },
  isNode: { type: Boolean, default: false },
  nodeId: { type: String, default: null },
  instanceNodeId: { type: String, default: null },
  project: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18nStore()

const label = computed(() => `${t(props.parameter.id)}${props.parameter.mandatory ? ' *' : ''}`)
const rules = [(v) => (v != null && String(v).trim() !== '') || t('error.rule.NotBlank')]

/** Default of a new subscription: the template is named after the project key and applies to its keys `<key>:...`. */
function defaultValue(pkey) {
  return props.parameter.id === PARAM_TEMPLATE ? pkey : `${pkey}:.*`
}
watch(() => props.project?.pkey, (pkey) => {
  if (pkey && (props.modelValue == null || props.modelValue === '')) emit('update:modelValue', defaultValue(pkey))
}, { immediate: true })
</script>
```

`ui/src/fields/SonarRolesField.vue`:

```vue
<template>
  <!-- CREATE mode role mapping: the project permissions of each group on the permission template. The live check keeps
       a malformed value from reaching the backend, which validates it again. -->
  <LigojTextarea
    :model-value="modelValue"
    :label="t(parameter.id)"
    :placeholder="rolesSample(project?.pkey)"
    :hint="t(`${parameter.id}-description`)"
    :rules="rules"
    persistent-hint
    variant="outlined"
    density="compact"
    rows="4"
    auto-grow
    @blur="trimValue"
    @update:model-value="(v) => emit('update:modelValue', v ?? '')"
  />
</template>

<script setup>
import { useI18nStore, LigojTextarea } from '@ligoj/host'
import { rolesError, rolesSample } from '../sonarJson.js'

const props = defineProps({
  modelValue: { type: [String, null], default: null },
  parameter: { type: Object, required: true },
  formValues: { type: Object, default: () => ({}) },
  mode: { type: String, default: null },
  isNode: { type: Boolean, default: false },
  nodeId: { type: String, default: null },
  instanceNodeId: { type: String, default: null },
  project: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18nStore()

/** Saved trimmed: trim when the field loses the focus, which the submit click triggers first (not while typing). */
function trimValue() {
  const value = props.modelValue
  if (typeof value === 'string' && value.trim() !== value) emit('update:modelValue', value.trim())
}
const rules = [(v) => { const key = rolesError(v); return key ? t(key) : true }]
</script>
```

- [ ] **Step 5: Wire the service, the features and the messages**

In `ui/src/service.js`: replace the two local constants by `import { PARAM_URL, PARAM_PROJECT, PARAM_TEMPLATE, PARAM_TEMPLATE_PATTERN, PARAM_ROLES } from './params.js'`, add `import { rolesSummary } from './sonarJson.js'`, `import SonarTemplateField from './fields/SonarTemplateField.vue'`, `import SonarRolesField from './fields/SonarRolesField.vue'`, then replace `parameterField` and the export:

```js
/**
 * Subscribe-wizard hooks: the project is picked among the projects of the selected SonarQube node; in CREATE mode, the
 * permission template name and pattern are prefilled from the project key, and the role mapping is a checked JSON.
 * Null when editing a node and for the other parameters: the default type-based input is rendered.
 */
function parameterField({ parameter, isNode } = {}) {
  if (isNode) return null
  const id = parameter?.id
  if (id === PARAM_PROJECT) return ProjectField
  if (id === PARAM_TEMPLATE || id === PARAM_TEMPLATE_PATTERN) return SonarTemplateField
  if (id === PARAM_ROLES) return SonarRolesField
  return null
}

/**
 * Subscribe-wizard order of the CREATE mode: the template, its pattern, then the role mapping. The default order
 * elsewhere.
 */
function parameterLayout({ mode, isNode } = {}) {
  if (isNode || String(mode).toLowerCase() !== 'create') return []
  return [{ parameters: [PARAM_TEMPLATE, PARAM_TEMPLATE_PATTERN, PARAM_ROLES] }]
}

/**
 * Subscription status tooltip: the role mapping as its groups instead of the raw JSON. Null for the other parameters.
 */
function parameterSummary({ parameter, value } = {}) {
  return parameter === PARAM_ROLES ? rolesSummary(value, useI18nStore().t) : null
}

export default { renderFeatures, renderDetailsKey, renderDetailsFeatures, parameterField, parameterLayout, parameterSummary }
```

In `ui/src/index.js`, add to `features`: `parameterLayout: service.parameterLayout,` and `parameterSummary: service.parameterSummary,`.

In `ui/src/i18n/en.js`, after `'service:qa:sonarqube:organization-description'`:

```js
  // CREATE mode: the permission template of the project
  'service:qa:sonarqube:template': 'Permission template',
  'service:qa:sonarqube:template-description': 'Name of the SonarQube permission template created for the project, its key by default',
  'service:qa:sonarqube:template-pattern': 'Project key pattern',
  'service:qa:sonarqube:template-pattern-description': 'Regular expression of the project keys the template applies to. SonarQube applies it to the projects created afterwards',
  'service:qa:sonarqube:roles': 'Role mapping (JSON)',
  'service:qa:sonarqube:roles-description': 'Optional JSON object keyed by SonarQube group, each with its project permissions among user, codeviewer, issueadmin, securityhotspotadmin, scan and admin. A missing group is created',
  'service:qa:sonarqube:roles-summary': 'No group | {count} group: {names} | {count} groups: {names}',
  'error.rule.sonar-roles-json': 'The role mapping must be a JSON object keyed by group, each value being a non-empty list of permissions',
  'error.rule.sonar-roles-permission': 'Unknown permission "{permission}" for group {group}: user, codeviewer, issueadmin, securityhotspotadmin, scan or admin',
  'error.rule.sonar-template-pattern': 'This pattern is not a valid regular expression',
  'error.rule.sonar-template-exists': 'This permission template already exists with the pattern {pattern}',
  'error.rule.sonar-template': 'The permission template {name} no longer exists in SonarQube',
  'error.rule.sonar-admin': 'These credentials cannot administer SonarQube: a permission template needs the Administer System permission',
  'warning.sonar-template-reused': 'The permission template {template} already exists in SonarQube with this pattern: it is reused, only the role mapping was applied',
  'warning.sonar-template-missing': 'The permission template {template} was already deleted from SonarQube',
```

In `ui/src/i18n/fr.js`, at the same place:

```js
  // Mode CREATE : le modèle de permissions du projet
  'service:qa:sonarqube:template': 'Modèle de permissions',
  'service:qa:sonarqube:template-description': 'Nom du modèle de permissions SonarQube créé pour le projet, sa clé par défaut',
  'service:qa:sonarqube:template-pattern': 'Motif des clés de projet',
  'service:qa:sonarqube:template-pattern-description': 'Expression régulière des clés de projet auxquelles le modèle s\'applique. SonarQube l\'applique aux projets créés ensuite',
  'service:qa:sonarqube:roles': 'Correspondance des rôles (JSON)',
  'service:qa:sonarqube:roles-description': 'Objet JSON optionnel indexé par groupe SonarQube, chacun avec ses permissions projet parmi user, codeviewer, issueadmin, securityhotspotadmin, scan et admin. Un groupe absent est créé',
  'service:qa:sonarqube:roles-summary': 'Aucun groupe | {count} groupe : {names} | {count} groupes : {names}',
  'error.rule.sonar-roles-json': 'La correspondance des rôles doit être un objet JSON indexé par groupe, chaque valeur étant une liste non vide de permissions',
  'error.rule.sonar-roles-permission': 'Permission « {permission} » inconnue pour le groupe {group} : user, codeviewer, issueadmin, securityhotspotadmin, scan ou admin',
  'error.rule.sonar-template-pattern': 'Ce motif n\'est pas une expression régulière valide',
  'error.rule.sonar-template-exists': 'Ce modèle de permissions existe déjà avec le motif {pattern}',
  'error.rule.sonar-template': 'Le modèle de permissions {name} n\'existe plus dans SonarQube',
  'error.rule.sonar-admin': 'Ces identifiants ne peuvent pas administrer SonarQube : un modèle de permissions demande la permission Administer System',
  'warning.sonar-template-reused': 'Le modèle de permissions {template} existe déjà dans SonarQube avec ce motif : il est réutilisé, seule la correspondance des rôles a été appliquée',
  'warning.sonar-template-missing': 'Le modèle de permissions {template} était déjà supprimé de SonarQube',
```

Use the quote style of each file (check `head -3 ui/src/i18n/fr.js`).

- [ ] **Step 6: Run the tests, the whole UI suite and the lint**

Run: `/bin/bash --noprofile --norc -c 'export PATH=/Users/fabdouglas/.nvm/versions/node/v26.8.1/bin:$PATH; cd ~/git/ligoj-plugins/plugin-qa-sonarqube/ui && npx vitest run 2>&1 | grep -E "×|Test Files|Tests "; npx eslint src; echo lint=$?'`
Expected: every test passes, `lint=0`.

---

### Task 6: The row of a template-based subscription

**Files:**
- Modify: `ui/src/service.js`, `ui/src/i18n/en.js`, `ui/src/i18n/fr.js`
- Test: `ui/src/__tests__/sonarqube-create-mode.test.js`

**Interfaces:**
- Consumes: Task 3 status data (`data.template`, `data.project`, `data.projects`, `data.projectsCount`).
- Produces: `renderFeatures`, `renderDetailsKey`, `renderDetailsFeatures` handling both kinds of subscription.

- [ ] **Step 1: Write the failing tests**

Append to the test file:

```js
const URL = 'https://sonar.example.org'
const TEMPLATE_SUB = {
  parameters: { 'service:qa:sonarqube:url': URL, 'service:qa:sonarqube:template': 'demo-1', 'service:qa:sonarqube:template-pattern': 'demo-1:.*' },
  data: {
    template: { name: 'demo-1', pattern: 'demo-1:.*' },
    project: { key: 'demo-1:api', measuresAsMap: { ncloc: 1200 }, branches: [] },
    projects: [
      { key: 'demo-1:api', name: 'API', lastAnalysisDate: '2026-10-10T08:00:00+0200' },
      { key: 'demo-1:web', name: 'Web', lastAnalysisDate: '2026-10-01T08:00:00+0000' },
      { key: 'demo-1:new', name: 'New' },
    ],
    projectsCount: 25,
  },
}

describe('SonarQube template-based subscription row', () => {
  it('links the latest analyzed project', () => {
    const vnodes = def.feature('renderFeatures', TEMPLATE_SUB)
    expect(vnodes).toHaveLength(1)
    expect(vnodes[0].props.href).toBe(`${URL}/dashboard?id=demo-1%3Aapi`)
  })

  it('shows the template as key, its pattern as tooltip', () => {
    const chip = def.feature('renderDetailsKey', TEMPLATE_SUB)
    expect(chip.props.title).toBe('demo-1:.*')
    // renderDetailsChip children: [icon, ' ', text]
    expect(chip.children.default()[2]).toBe('demo-1')
  })

  it('lists the other projects with their last analysis', () => {
    const out = def.feature('renderDetailsFeatures', TEMPLATE_SUB)
    const chip = out[out.length - 1]
    expect(chip.children.default()[2]).toBe('+24 projects')
    expect(chip.props.title.split('\n')).toEqual(['demo-1:web — 2026-10-01', 'demo-1:new — never analyzed', 'and 22 more'])
  })

  it('tells no project was analyzed yet', () => {
    const sub = { ...TEMPLATE_SUB, data: { ...TEMPLATE_SUB.data, project: undefined, projects: [{ key: 'demo-1:new' }], projectsCount: 1 } }
    expect(def.feature('renderFeatures', sub)).toEqual([])
    const out = def.feature('renderDetailsFeatures', sub)
    expect(out[0].children).toBe('No analyzed project yet')
    expect(out).toHaveLength(2)
  })

  it('shows nothing until the status data arrives', () => {
    expect(def.feature('renderDetailsFeatures', { parameters: TEMPLATE_SUB.parameters })).toBeNull()
    expect(def.feature('renderFeatures', { parameters: TEMPLATE_SUB.parameters })).toEqual([])
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: same command as Task 5 Step 2.
Expected: the 5 new tests fail (no link, no template chip, no list).

- [ ] **Step 3: Implement**

In `ui/src/service.js`, after `dashboardUrl`:

```js
// The project a row shows: the linked one, or for a permission template the latest analyzed of its projects
function shownProject(subscription) {
  return subscription?.parameters?.[PARAM_PROJECT] || subscription?.data?.project?.key || null
}

// SonarQube analysis dates (`2026-10-10T08:00:00+0200`) as the day only
function analysisDay(date) {
  return date ? String(date).slice(0, 10) : null
}
```

Replace `renderFeatures` and `renderDetailsKey`:

```js
function renderFeatures(subscription) {
  const url = subscription?.parameters?.[PARAM_URL]
  const project = shownProject(subscription)
  if (!url || !project) return []
  const { t } = useI18nStore()
  return [renderServiceLink({
    icon: 'mdi-home',
    href: dashboardUrl(url, project),
    title: t('service:qa:sonarqube:project'),
  })]
}

function renderDetailsKey(subscription) {
  const { t } = useI18nStore()
  const template = subscription?.parameters?.[PARAM_TEMPLATE]
  if (template) {
    const pattern = subscription?.data?.template?.pattern || subscription?.parameters?.[PARAM_TEMPLATE_PATTERN] || ''
    return renderDetailsChip({ icon: 'mdi-shield-key-outline', text: template, title: pattern })
  }
  const project = subscription?.parameters?.[PARAM_PROJECT]
  if (!project) return null
  return renderDetailsChip({ icon: 'mdi-shield-check-outline', text: project, title: t('service:qa:sonarqube:project') })
}
```

Replace `renderDetailsFeatures`:

```js
// The other projects of a permission template: a chip, its tooltip listing them with their last analysis
function renderOtherProjects(data, shown, t) {
  const others = (data.projects || []).filter((p) => p.key !== shown)
  const count = (data.projectsCount ?? others.length) - (shown ? 1 : 0)
  if (count <= 0) return null
  const lines = others.map((p) => `${p.key} — ${analysisDay(p.lastAnalysisDate) || t('service:qa:sonarqube:never-analyzed')}`)
  if (count > others.length) lines.push(t('service:qa:sonarqube:more-projects', { count: count - others.length }))
  return renderDetailsChip({ icon: 'mdi-folder-multiple-outline', text: t('service:qa:sonarqube:other-projects', { count }, count), title: lines.join('\n') })
}

// Live SonarQube details: project metrics + the non-main branch/PR list, and for a permission template the other
// projects. Reads `subscription.data` (populated by status/refresh); returns null until it arrives, so the row degrades
// cleanly to the key chip alone.
function renderDetailsFeatures(subscription) {
  const data = subscription?.data
  const project = data?.project
  const template = !!subscription?.parameters?.[PARAM_TEMPLATE]
  if (!project && !(template && data?.projects)) return null
  const { t } = useI18nStore()
  const out = []
  if (project) {
    const metrics = renderMetrics(project, t)
    if (metrics) out.push(metrics)
    const url = subscription?.parameters?.[PARAM_URL]
    const projectKey = shownProject(subscription)
    const branches = (project.branches || [])
      .filter((b) => !b.isMain)
      .map((b) => renderBranch(b, url, projectKey, t))
      .filter(Boolean)
    if (branches.length) {
      out.push(h('div', { class: 'sq-branches', style: 'display:flex;flex-direction:column;gap:2px;margin-top:2px;width:100%;' }, branches))
    }
  } else {
    out.push(h('span', { class: 'sq-none', style: 'font-size:12px;opacity:.7;' }, t('service:qa:sonarqube:no-analyzed-project')))
  }
  if (template) {
    const others = renderOtherProjects(data, project?.key, t)
    if (others) out.push(others)
  }
  return out.length ? out : null
}
```

In the "no analyzed project" test, `projects` holds one never analyzed project and no shown project: `count` is 1, so the chip lists it: `out` has 2 entries.

Messages, `en.js`:

```js
  'service:qa:sonarqube:other-projects': '+{count} project | +{count} projects',
  'service:qa:sonarqube:more-projects': 'and {count} more',
  'service:qa:sonarqube:never-analyzed': 'never analyzed',
  'service:qa:sonarqube:no-analyzed-project': 'No analyzed project yet',
```

`fr.js`:

```js
  'service:qa:sonarqube:other-projects': '+{count} projet | +{count} projets',
  'service:qa:sonarqube:more-projects': 'et {count} autres',
  'service:qa:sonarqube:never-analyzed': 'jamais analysé',
  'service:qa:sonarqube:no-analyzed-project': 'Aucun projet analysé pour l\'instant',
```

- [ ] **Step 4: Run the whole UI suite and the lint**

Run: same command as Task 5 Step 6.
Expected: every test passes (the existing LINK tests included), `lint=0`.

---

### Task 7: README, bundle and live check

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the mode**

In `README.md`, add to the features list:

```markdown
- CREATE mode: creates a SonarQube permission template for the project (or reuses one with the same pattern), creates the mapped groups when missing and grants them their project permissions on it. The subscription shows the latest analyzed project matching the template pattern, the others listed. Unsubscribing with the remote data deletes the template; groups and projects are kept.
```

Add the three parameters to the parameters table:

```markdown
| service:qa:sonarqube:template | ✓ (CREATE) | Name of the permission template, the project key by default |
| service:qa:sonarqube:template-pattern | ✓ (CREATE) | Regular expression of the project keys the template applies to, `<project key>:.*` by default |
| service:qa:sonarqube:roles | | JSON object keyed by group, each value a list of project permissions among `user`, `codeviewer`, `issueadmin`, `securityhotspotadmin`, `scan`, `admin` |
```

Match the column layout of the existing table (check it first with `grep -n '^|' README.md`).

- [ ] **Step 2: Build the bundle and sync it**

Run:

```bash
/bin/bash --noprofile --norc -c 'export PATH=/Users/fabdouglas/.nvm/versions/node/v26.8.1/bin:$PATH; cd ~/git/ligoj-plugins/plugin-qa-sonarqube/ui && npx vite build 2>&1 | grep -E "built in|error"'
cd ~/git/ligoj-plugins/plugin-qa-sonarqube && mvn -o -Djarsigner.skip=true -Djacoco.skip=true -Dskip.ui.build=true -DskipTests package -q; echo rc=$?
rsync -a --delete src/main/resources/META-INF/resources/webjars/qa-sonarqube/vue/ target/classes/META-INF/resources/webjars/qa-sonarqube/vue/
```

Expected: `built in`, `rc=0`.

- [ ] **Step 3: Live check (after the user restarts the API)**

The Java changes need an API restart, which only the user can do. Once restarted:

1. The plugin update runs `update()`: `rest/node/service:qa:sonarqube` reports mode `all`, and `rest/node/service:qa:sonarqube/parameter/CREATE` lists the three template parameters without the project.
2. With the user's go-ahead for these writes on the local SonarQube 26.6 container (`http://localhost:9000`) and in Ligoj: switch a local SonarQube instance to ALL, subscribe a test project in CREATE mode with a role mapping, then check on SonarQube (token `sonar_api_token` from `~/.ligoj/credentials` as `Authorization: Bearer`, never printed): `api/permissions/search_templates?q=<pkey>` lists the template with its pattern, and its group permissions match.
3. The project row shows the template chip; with a matching analyzed project, its metrics and the "+N projects" chip.
4. Unsubscribe with "delete remote data": the template is gone from `search_templates`, the groups remain.
5. Nothing is created on the SonarQube Cloud organization without an explicit go-ahead.

Record in the ledger what ran and what waits for the restart.
