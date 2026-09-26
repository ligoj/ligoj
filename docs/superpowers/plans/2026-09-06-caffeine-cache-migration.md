# Caffeine Cache Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Hazelcast by Caffeine as the JCache (JSR-107) provider of the Ligoj API, behind a provider-neutral plugin SPI, without changing the REST contract of `rest/system/cache` or any `@CacheResult` usage.

**Architecture:** Hazelcast is used only as a JSR-107 provider (no maps, locks or topics) and every deployment runs one API instance, so an in-process cache replaces it. The provider leaks through one SPI (`CacheManagerAware` / `CacheConfigurer`, 10 main + 5 test implementations across bootstrap, app-api, ligoj-api and the plugins), through the factory bean that merges those declarations, and through `CacheResource` (statistics, cluster info, shutdown). The SPI becomes pure `javax.cache`, the factory becomes a Caffeine factory, `CacheResource` reads the standard `CacheStatisticsMXBean` through JMX, and the cluster fields disappear (the admin page never displayed them).

**Tech Stack:** Java 25, Spring Boot 4.1.1 (bootstrap `parent/pom.xml`), `javax.cache:cache-api:1.1.1`, `com.github.ben-manes.caffeine:jcache:3.2.4` (+ transitive `caffeine`, `com.typesafe:config`), Spring `spring-context-support` `JCacheCacheManager`, JUnit 5 + Mockito, Maven offline builds (`mvn -o`).

**Spec:** No separate spec document. The requirements are the assessment given in the session of 2026-09-06 (summarized below) and the constraints of this section.

## Global Constraints

- Keep the JSR-107 programming model: every `@CacheResult` / `@CacheRemove*` / `@CachePut` in the 57 files that use them stays untouched. Only `CacheManagerAware` implementations change.
- Keep the REST contract of `rest/system/cache`: `GET` (list), `GET {name}`, `POST|DELETE {name}` (invalidate one), `DELETE` (invalidate all), `POST statistics/enable`, `POST statistics/disable`. `CacheStatistics` keeps `id, size, hitCount, missCount, hitPercentage, missPercentage, averageGetTime`; its `node` field and the `CacheNode` / `CacheCluster` classes are removed (plugin-ui `SystemCacheView` and ligoj-cli never read them).
- Keep the per-cache TTL override `cache.<name>.ttl` (`-1` = eternal, otherwise seconds), exactly as today.
- Rename `hazelcast.statistics.enable` to `cache.statistics.enable`, keeping the old name as a fallback: `@Value("${cache.statistics.enable:${hazelcast.statistics.enable:false}}")`.
- New property `cache.store-by-value` (default `false`, store by reference). Hazelcast stored by value; the property lets an operator restore that behaviour without a rebuild.
- Every cache keeps an entry cap. Hazelcast applied its default of 10 000 entries per cache; the neutral SPI exposes `CacheConfigurer.DEFAULT_MAXIMUM_SIZE = 10_000L` and a 3-argument `newCacheConfig(name, duration, maximumSize)` for the caches that declared `1000`.
- No Hazelcast artifact, class, XML or property may remain anywhere in bootstrap, ligoj-api, app-api or the plugins after Task 7 (`grep -ri hazelcast` must return nothing except git history).
- The SPI change is a breaking change of the plugin API: it must ship in a bootstrap **minor** release (the current `5.0.1-SNAPSHOT` must be renumbered `5.1.0-SNAPSHOT` before release; renumbering is a release decision outside this plan and is not part of any task). Dependents point at the SNAPSHOT that carries the change.
- Local builds: `mvn -o -q -Djarsigner.skip=true ...` (the jarsigner prompt hangs without `LIGOJ_SIGN_STOREPASS`). `~/java/maven-repository` holds no Caffeine `jcache` artifact yet, so the very first build of Task 1 needs network (drop `-o` once).
- Never commit or push without the user's explicit request; the steps below say "commit" as in the skill template, but each commit needs the user's go-ahead in this workspace.
- Repositories: bootstrap `~/git/bootstrap`, ligoj-api `~/git/ligoj-api`, host `~/git/ligoj`, plugins `~/git/ligoj-plugins/plugin-<id>` (each plugin is its own git repository).

---

## File Structure

**bootstrap (`bootstrap-business` unless noted)**

- Modify `parent/pom.xml`: add `caffeine.version` + managed `caffeine` / `jcache` artifacts; remove `hazelcast.version` and both Hazelcast managed artifacts (Task 3).
- Modify `bootstrap-business/pom.xml`: replace the `hazelcast-spring` dependency by `com.github.ben-manes.caffeine:jcache`.
- Modify `src/main/java/org/ligoj/bootstrap/resource/system/cache/CacheManagerAware.java`: neutral signature.
- Modify `src/main/java/org/ligoj/bootstrap/resource/system/cache/CacheConfigurer.java`: returns `MutableConfiguration`, adds the size argument and default.
- Create `src/main/java/org/ligoj/bootstrap/resource/system/cache/CaffeineCacheManagerFactoryBean.java`: builds the Caffeine `CacheManager`, applies TTL / size / statistics / store mode, calls the `CacheManagerAware` beans.
- Delete `MergedHazelCastManagerFactoryBean.java`, `CacheNode.java`, `CacheCluster.java`, `src/main/resources/META-INF/hazelcast-local.xml`, `src/main/resources/META-INF/hazelcast-multicast.xml`.
- Modify `CacheBeansConfiguration.java`: instantiate the Caffeine factory, no `cache.location`.
- Modify `CacheResource.java`: JMX statistics, Caffeine size, no cluster, no `ContextClosedEvent` listener.
- Modify `CacheStatistics.java`: drop `node`.
- Modify `resource/system/security/AuthorizationCache.java`, `resource/system/configuration/ConfigurationCache.java`: neutral SPI.
- Tests: create `CaffeineCacheManagerFactoryBeanTest.java` (replaces `MergedHazelCastManagerFactoryBeanTest.java`, deleted), modify `CacheResourceTest.java`, modify `ConfigurationTestCache.java`.
- Modify `README.md` (module description) and `../ligoj/DOC.md` (cache section + property table, Task 5).

**ligoj-api**: `plugin-core/.../resource/node/NodeCache.java`, `plugin-iam-empty/.../iam/empty/IamEmptyCache.java`, `plugin-api/src/test/.../iam/IdLdapTestCache.java`.

**app-api (`~/git/ligoj/app-api`)**: `src/main/java/org/ligoj/app/resource/plugin/repository/PluginCache.java`, `src/main/resources/application.properties`.

**plugins**: `plugin-id/.../id/resource/IdCache.java`, `plugin-id-ldap/.../ldap/resource/IdLdapCache.java` + `src/test/.../IdLdapTestCache.java`, `plugin-id-sql/.../idsql/resource/IdSqlCache.java` + `src/test/.../IdSqlTestCache.java`, `plugin-id-cognito/src/test/.../IdCognitoTestCache.java`, `plugin-iam-node/.../iam/IamNodeCache.java`, `plugin-prov/.../prov/terraform/ProvCache.java`, `plugin-vm-azure/.../vmazure/AzureCache.java`.

---

### Task 1: Add the Caffeine JCache dependency to bootstrap (Hazelcast still present)

**Files:**
- Modify: `~/git/bootstrap/parent/pom.xml` (properties block near line 105, `dependencyManagement` near line 347)
- Modify: `~/git/bootstrap/bootstrap-business/pom.xml` (dependencies near line 59)

**Interfaces:**
- Produces: the artifacts `com.github.ben-manes.caffeine:caffeine` and `:jcache` at version `3.2.4` on the `bootstrap-business` compile classpath, next to `javax.cache:cache-api:1.1.1`.

- [ ] **Step 1: Declare the version and the managed artifacts in `parent/pom.xml`**

Add the property next to `<hazelcast.version>5.7.0</hazelcast.version>`:

```xml
        <caffeine.version>3.2.4</caffeine.version>
```

Add to `<dependencyManagement><dependencies>` right after the two Hazelcast entries:

```xml
            <dependency>
                <groupId>com.github.ben-manes.caffeine</groupId>
                <artifactId>caffeine</artifactId>
                <version>${caffeine.version}</version>
            </dependency>
            <dependency>
                <groupId>com.github.ben-manes.caffeine</groupId>
                <artifactId>jcache</artifactId>
                <version>${caffeine.version}</version>
            </dependency>
```

- [ ] **Step 2: Add the dependency to `bootstrap-business/pom.xml`**

Right after the `hazelcast-spring` dependency (kept for now):

```xml
        <dependency>
            <groupId>com.github.ben-manes.caffeine</groupId>
            <artifactId>jcache</artifactId>
        </dependency>
```

- [ ] **Step 3: Resolve the artifact (network needed once) and check the tree**

Run: `cd ~/git/bootstrap && mvn -q -Djarsigner.skip=true -pl parent,bootstrap-business -am install -DskipTests && mvn -o -q -pl bootstrap-business dependency:tree -Dincludes=com.github.ben-manes.caffeine,com.typesafe,javax.cache`
Expected: the tree lists `com.github.ben-manes.caffeine:jcache:jar:3.2.4`, `com.github.ben-manes.caffeine:caffeine:jar:3.2.4`, `com.typesafe:config` and `javax.cache:cache-api:jar:1.1.1`, with no version conflict warning.

- [ ] **Step 4: Commit (bootstrap repository)**

```bash
cd ~/git/bootstrap && git add parent/pom.xml bootstrap-business/pom.xml && git commit -m "build(cache): add Caffeine JCache provider"
```

---

### Task 2: Provider-neutral cache SPI, Caffeine factory and JMX-based cache resource

**Files:**
- Modify: `bootstrap-business/src/main/java/org/ligoj/bootstrap/resource/system/cache/CacheManagerAware.java`
- Modify: `bootstrap-business/src/main/java/org/ligoj/bootstrap/resource/system/cache/CacheConfigurer.java`
- Create: `bootstrap-business/src/main/java/org/ligoj/bootstrap/resource/system/cache/CaffeineCacheManagerFactoryBean.java`
- Delete: `bootstrap-business/src/main/java/org/ligoj/bootstrap/resource/system/cache/MergedHazelCastManagerFactoryBean.java`, `CacheNode.java`, `CacheCluster.java`
- Modify: `bootstrap-business/src/main/java/org/ligoj/bootstrap/resource/system/cache/CacheBeansConfiguration.java`
- Modify: `bootstrap-business/src/main/java/org/ligoj/bootstrap/resource/system/cache/CacheResource.java`
- Modify: `bootstrap-business/src/main/java/org/ligoj/bootstrap/resource/system/cache/CacheStatistics.java`
- Modify: `bootstrap-business/src/main/java/org/ligoj/bootstrap/resource/system/security/AuthorizationCache.java`
- Modify: `bootstrap-business/src/main/java/org/ligoj/bootstrap/resource/system/configuration/ConfigurationCache.java`
- Test (create): `bootstrap-business/src/test/java/org/ligoj/bootstrap/resource/system/cache/CaffeineCacheManagerFactoryBeanTest.java`
- Test (delete): `bootstrap-business/src/test/java/org/ligoj/bootstrap/resource/system/cache/MergedHazelCastManagerFactoryBeanTest.java`
- Test (modify): `bootstrap-business/src/test/java/org/ligoj/bootstrap/resource/system/cache/CacheResourceTest.java`, `ConfigurationTestCache.java`

**Interfaces:**
- Consumes: Task 1 classpath.
- Produces (used by every later task):
  - `interface CacheManagerAware { void onCreate(javax.cache.CacheManager cacheManager, CacheConfigurer configurer); }`
  - `interface CacheConfigurer { long DEFAULT_MAXIMUM_SIZE = 10_000L; MutableConfiguration<String, Object> newCacheConfig(String name, javax.cache.expiry.Duration defaultDuration, long maximumSize); default ...(String name, Duration defaultDuration); default ...(String name); }`
  - `CaffeineCacheManagerFactoryBean.MANAGER_URI = URI.create("ligoj")`, `resolveDuration(String, Duration)`.
  - `CacheResource.statisticsName(String cacheName)`, `CacheResource.setStatistics(CacheStatistics, CacheStatisticsMXBean)`.

- [ ] **Step 1: Write the failing unit test of the factory**

Create `CaffeineCacheManagerFactoryBeanTest.java`:

```java
/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.bootstrap.resource.system.cache;

import com.github.benmanes.caffeine.jcache.configuration.CaffeineConfiguration;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.ConfigurableEnvironment;

import javax.cache.CacheManager;
import javax.cache.expiry.Duration;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CaffeineCacheManagerFactoryBeanTest {

	private CaffeineCacheManagerFactoryBean bean;

	@BeforeEach
	void prepare() {
		bean = new CaffeineCacheManagerFactoryBean();
		bean.env = mock(ConfigurableEnvironment.class);
	}

	@Test
	void destroy() {
		bean.cacheManager = mock(CacheManager.class);
		bean.destroy();
		verify(bean.cacheManager).close();
	}

	@Test
	void getObjectTypeNotInitialized() {
		Assertions.assertEquals(CacheManager.class, bean.getObjectType());
	}

	@Test
	void getObjectType() {
		bean.cacheManager = mock(CacheManager.class);
		Assertions.assertNotNull(bean.getObjectType());
		Assertions.assertNotEquals(CacheManager.class, bean.getObjectType());
	}

	@Test
	void newCacheConfigDefaults() {
		final var config = (CaffeineConfiguration<String, Object>) bean.newCacheConfig("test");
		Assertions.assertTrue(config.getExpiryPolicyFactory().create().getExpiryForUpdate().isEternal());
		Assertions.assertEquals(CacheConfigurer.DEFAULT_MAXIMUM_SIZE, config.getMaximumSize().orElseThrow());
		Assertions.assertFalse(config.isStoreByValue());
		Assertions.assertFalse(config.isStatisticsEnabled());
		Assertions.assertEquals(String.class, config.getKeyType());
		Assertions.assertEquals(Object.class, config.getValueType());
	}

	@Test
	void newCacheConfigDuration() {
		final var config = bean.newCacheConfig("test", Duration.ONE_HOUR);
		final var expiry = config.getExpiryPolicyFactory().create().getExpiryForUpdate();
		Assertions.assertEquals(Duration.ONE_HOUR, expiry);
	}

	@Test
	void newCacheConfigMaximumSize() {
		final var config = (CaffeineConfiguration<String, Object>) bean.newCacheConfig("test", Duration.ONE_DAY, 1000);
		Assertions.assertEquals(1000, config.getMaximumSize().orElseThrow());
	}

	@Test
	void newCacheConfigStatisticsAndStoreByValue() {
		bean.setStatisticsEnabled(true);
		bean.setStoreByValue(true);
		final var config = (CaffeineConfiguration<String, Object>) bean.newCacheConfig("test");
		Assertions.assertTrue(config.isStatisticsEnabled());
		Assertions.assertTrue(config.isStoreByValue());
		Assertions.assertNotNull(config.getCopierFactory());
	}

	@Test
	void newCacheConfigTtlEternal() {
		when(bean.env.getProperty("cache.test.ttl")).thenReturn("-1");
		final var config = bean.newCacheConfig("test", Duration.ONE_MINUTE);
		Assertions.assertTrue(config.getExpiryPolicyFactory().create().getExpiryForUpdate().isEternal());
	}

	@Test
	void newCacheConfigTtlOverride() {
		when(bean.env.getProperty("cache.test.ttl")).thenReturn("3600");
		final var config = bean.newCacheConfig("test");
		final var expiry = config.getExpiryPolicyFactory().create().getExpiryForUpdate();
		Assertions.assertFalse(expiry.isEternal());
		Assertions.assertEquals(3600, expiry.getDurationAmount());
	}

	@Test
	void afterPropertiesSetBuildsManagerAndCallsAware() {
		final var context = mock(org.springframework.context.ApplicationContext.class);
		final var aware = mock(CacheManagerAware.class);
		when(context.getBeansOfType(CacheManagerAware.class)).thenReturn(java.util.Map.of("aware", aware));
		bean.setApplicationContext(context);
		bean.afterPropertiesSet();
		try {
			Assertions.assertNotNull(bean.getObject());
			Assertions.assertEquals(CaffeineCacheManagerFactoryBean.MANAGER_URI, bean.getObject().getURI());
			verify(aware).onCreate(bean.getObject(), bean);
		} finally {
			bean.destroy();
		}
	}
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd ~/git/bootstrap && mvn -o -q -Djarsigner.skip=true -pl bootstrap-business test -Dtest=CaffeineCacheManagerFactoryBeanTest -Dsurefire.failIfNoSpecifiedTests=false`
Expected: compilation error, `CaffeineCacheManagerFactoryBean` does not exist.

- [ ] **Step 3: Rewrite the SPI**

`CacheManagerAware.java`:

```java
/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.bootstrap.resource.system.cache;

import javax.cache.CacheManager;

/**
 * Callback when the JSR-107 cache manager is built but not yet injected in the beans. Implementors declare their
 * caches with {@link CacheManager#createCache(String, javax.cache.configuration.Configuration)} using a
 * configuration produced by the {@link CacheConfigurer}.
 */
public interface CacheManagerAware {

	/**
	 * Callback when the cache manager is built but not yet injected in the beans.
	 *
	 * @param cacheManager The provider-neutral JSR-107 cache manager.
	 * @param configurer   The {@link CacheConfigurer} producing a configuration from a cache name, a default TTL and
	 *                     an optional maximum size.
	 */
	void onCreate(CacheManager cacheManager, CacheConfigurer configurer);
}
```

`CacheConfigurer.java`:

```java
/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.bootstrap.resource.system.cache;

import javax.cache.configuration.MutableConfiguration;
import javax.cache.expiry.Duration;

/**
 * Helper of cache configuration. See {@link CaffeineCacheManagerFactoryBean} and {@link CacheManagerAware}.
 */
public interface CacheConfigurer {

	/**
	 * Maximum entry count of a cache when not specified. Matches the bound the previous provider applied by default.
	 */
	long DEFAULT_MAXIMUM_SIZE = 10_000L;

	/**
	 * Create a new configuration with the shared settings (statistics, store mode, TTL override from
	 * <code>cache.&lt;name&gt;.ttl</code>) applied before the {@link CacheManagerAware} implementor completes it.
	 *
	 * @param name            The cache name to configure.
	 * @param defaultDuration The default TTL, overridable by the <code>cache.&lt;name&gt;.ttl</code> property.
	 * @param maximumSize     The maximum entry count; the least recently used entries are evicted beyond it.
	 * @return The configuration, ready for {@link javax.cache.CacheManager#createCache}.
	 */
	MutableConfiguration<String, Object> newCacheConfig(String name, Duration defaultDuration, long maximumSize);

	/**
	 * Same as {@link #newCacheConfig(String, Duration, long)} with {@link #DEFAULT_MAXIMUM_SIZE} entries.
	 *
	 * @param name            The cache name to configure.
	 * @param defaultDuration The default TTL.
	 * @return The configuration.
	 */
	default MutableConfiguration<String, Object> newCacheConfig(final String name, final Duration defaultDuration) {
		return newCacheConfig(name, defaultDuration, DEFAULT_MAXIMUM_SIZE);
	}

	/**
	 * Same as {@link #newCacheConfig(String, Duration)} with an eternal TTL.
	 *
	 * @param name The cache name to configure.
	 * @return The configuration.
	 */
	default MutableConfiguration<String, Object> newCacheConfig(final String name) {
		return newCacheConfig(name, Duration.ETERNAL);
	}
}
```

- [ ] **Step 4: Create the Caffeine factory bean**

`CaffeineCacheManagerFactoryBean.java`:

```java
/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.bootstrap.resource.system.cache;

import com.github.benmanes.caffeine.jcache.configuration.CaffeineConfiguration;
import com.github.benmanes.caffeine.jcache.copy.JavaSerializationCopier;
import com.github.benmanes.caffeine.jcache.spi.CaffeineCachingProvider;
import lombok.Setter;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.math.NumberUtils;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.FactoryBean;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.core.env.ConfigurableEnvironment;

import javax.cache.CacheManager;
import javax.cache.Caching;
import javax.cache.configuration.MutableConfiguration;
import javax.cache.expiry.Duration;
import javax.cache.expiry.ModifiedExpiryPolicy;
import java.net.URI;
import java.util.OptionalLong;
import java.util.concurrent.TimeUnit;

/**
 * Builds the single Caffeine JSR-107 {@link CacheManager} of the application from the caches declared by every
 * {@link CacheManagerAware} bean, and produces their configurations ({@link CacheConfigurer}).
 */
public class CaffeineCacheManagerFactoryBean implements FactoryBean<CacheManager>, InitializingBean, DisposableBean,
		ApplicationContextAware, CacheConfigurer {

	/**
	 * URI of the cache manager. It is also the <code>CacheManager</code> key of the JMX statistics beans.
	 */
	public static final URI MANAGER_URI = URI.create("ligoj");

	protected CacheManager cacheManager;

	@Setter
	protected ApplicationContext applicationContext;

	@Autowired
	protected ConfigurableEnvironment env;

	/**
	 * When enabled, the JSR-107 statistics of every cache are registered in JMX and exposed by the cache resource.
	 */
	@Setter
	@Value("${cache.statistics.enable:${hazelcast.statistics.enable:false}}")
	private boolean statisticsEnabled;

	/**
	 * When enabled, entries are copied (Java serialization) on put and get instead of being stored by reference.
	 */
	@Setter
	@Value("${cache.store-by-value:false}")
	private boolean storeByValue;

	@Override
	public void afterPropertiesSet() {
		final var provider = Caching.getCachingProvider(CaffeineCachingProvider.class.getName());
		final var manager = provider.getCacheManager(MANAGER_URI, provider.getDefaultClassLoader());
		applicationContext.getBeansOfType(CacheManagerAware.class).forEach((n, a) -> a.onCreate(manager, this));
		this.cacheManager = manager;
	}

	@Override
	public MutableConfiguration<String, Object> newCacheConfig(final String name, final Duration defaultDuration,
			final long maximumSize) {
		final var config = new CaffeineConfiguration<String, Object>();
		config.setTypes(String.class, Object.class);
		config.setMaximumSize(OptionalLong.of(maximumSize));
		config.setStatisticsEnabled(statisticsEnabled);
		config.setStoreByValue(storeByValue);
		if (storeByValue) {
			config.setCopierFactory(JavaSerializationCopier::new);
		}
		config.setExpiryPolicyFactory(ModifiedExpiryPolicy.factoryOf(resolveDuration(name, defaultDuration)));
		return config;
	}

	/**
	 * Resolve the TTL of a cache: the <code>cache.&lt;name&gt;.ttl</code> property wins over the default duration,
	 * <code>-1</code> meaning eternal, any other value being seconds.
	 *
	 * @param name            The cache name.
	 * @param defaultDuration The duration when no property is set.
	 * @return The effective duration.
	 */
	protected Duration resolveDuration(final String name, final Duration defaultDuration) {
		final var ttl = StringUtils.trimToNull(env.getProperty("cache." + name + ".ttl"));
		if (ttl == null) {
			return defaultDuration;
		}
		if ("-1".equals(ttl)) {
			return Duration.ETERNAL;
		}
		return new Duration(TimeUnit.SECONDS, NumberUtils.toLong(ttl));
	}

	@Override
	@Nullable
	public CacheManager getObject() {
		return this.cacheManager;
	}

	@Override
	public Class<? extends CacheManager> getObjectType() {
		return this.cacheManager == null ? CacheManager.class : this.cacheManager.getClass();
	}

	@Override
	public void destroy() {
		this.cacheManager.close();
	}
}
```

Notes for the implementer: `org.jspecify.annotations.Nullable` is what the deleted Hazelcast factory imported; keep the same import. If `CaffeineConfiguration` in 3.2.4 rejects `setCopierFactory` with a method reference, use `config.setCopierFactory(() -> new JavaSerializationCopier())`.

- [ ] **Step 5: Wire the factory in `CacheBeansConfiguration`**

Replace the `hazelcast` bean method by:

```java
	@Bean
	@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
	public static CaffeineCacheManagerFactoryBean jcache() {
		return new CaffeineCacheManagerFactoryBean();
	}

	@Bean
	@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
	public static JCacheCacheManager cacheManager(@Qualifier("jcache") final CacheManager jcache) {
		return new JCacheCacheManager(jcache);
	}
```

Remove the `@Value("${cache.location...}")` parameter and the `MergedHazelCastManagerFactoryBean` import. Delete `MergedHazelCastManagerFactoryBean.java`, `CacheNode.java`, `CacheCluster.java` and `MergedHazelCastManagerFactoryBeanTest.java`.

- [ ] **Step 6: Rewrite the two bootstrap cache declarations**

`AuthorizationCache.java`:

```java
/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.bootstrap.resource.system.security;

import org.ligoj.bootstrap.resource.system.cache.CacheConfigurer;
import org.ligoj.bootstrap.resource.system.cache.CacheManagerAware;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.Role;
import org.springframework.stereotype.Component;

import javax.cache.CacheManager;
import javax.cache.expiry.Duration;

/**
 * Authorization cache configurations.
 */
@Component
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
public class AuthorizationCache implements CacheManagerAware {

	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("authorizations", configurer.newCacheConfig("authorizations"));
		cacheManager.createCache("user-details", configurer.newCacheConfig("user-details", Duration.ONE_HOUR));
	}
}
```

`ConfigurationCache.java`:

```java
/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.bootstrap.resource.system.configuration;

import org.ligoj.bootstrap.resource.system.cache.CacheConfigurer;
import org.ligoj.bootstrap.resource.system.cache.CacheManagerAware;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.Role;
import org.springframework.stereotype.Component;

import javax.cache.CacheManager;

/**
 * Configuration cache configurations.
 */
@Component
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
public class ConfigurationCache implements CacheManagerAware {

	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("configuration", configurer.newCacheConfig("configuration"));
		cacheManager.createCache("hooks", configurer.newCacheConfig("hooks"));
	}
}
```

- [ ] **Step 7: Rewrite the test cache declaration**

`ConfigurationTestCache.java`:

```java
/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.bootstrap.resource.system.cache;

import org.springframework.stereotype.Component;

import javax.cache.CacheManager;
import javax.cache.expiry.Duration;
import javax.cache.expiry.TouchedExpiryPolicy;
import java.util.concurrent.TimeUnit;

/**
 * Test cache configurations: a bounded cache, a one-second modified-expiry cache and a one-second touched-expiry cache.
 */
@Component
class ConfigurationTestCache implements CacheManagerAware {

	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("test-cache", configurer.newCacheConfig("test-cache", Duration.ETERNAL, 200));
		cacheManager.createCache("test-cache-1",
				configurer.newCacheConfig("test-cache-1", new Duration(TimeUnit.SECONDS, 1)));
		final var touched = configurer.newCacheConfig("test-cache-2");
		touched.setExpiryPolicyFactory(TouchedExpiryPolicy.factoryOf(new Duration(TimeUnit.SECONDS, 1)));
		cacheManager.createCache("test-cache-2", touched);
	}
}
```

- [ ] **Step 8: Rewrite `CacheStatistics` and `CacheResource`**

`CacheStatistics.java` keeps `id, size, hitCount, missCount, hitPercentage, missPercentage, averageGetTime` and loses the `node` field (delete the field and its javadoc only).

`CacheResource.java`:

```java
/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.bootstrap.resource.system.cache;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.jcache.JCacheCacheManager;
import org.springframework.stereotype.Service;

import javax.cache.management.CacheStatisticsMXBean;
import javax.management.JMX;
import javax.management.MalformedObjectNameException;
import javax.management.ObjectName;
import java.lang.management.ManagementFactory;
import java.util.List;
import java.util.Optional;
import java.util.stream.StreamSupport;

/**
 * Cache resource: statistics (JSR-107 JMX beans), invalidation and runtime statistics toggle.
 */
@Path("/system/cache")
@Service
@Transactional
@Slf4j
@Produces(MediaType.APPLICATION_JSON)
public class CacheResource {

	@Autowired
	protected CacheManager cacheManager;

	@Setter
	@Value("${cache.statistics.enable:${hazelcast.statistics.enable:false}}")
	private boolean statisticsEnabled;

	/**
	 * Return the statistics of every cache.
	 *
	 * @return The statistics of every cache.
	 */
	@GET
	public List<CacheStatistics> getCaches() {
		return cacheManager.getCacheNames().stream().map(this::getCache).toList();
	}

	/**
	 * Return the statistics of a cache. Hit and miss figures are present only while statistics are enabled.
	 *
	 * @param name The cache name.
	 * @return The statistics of the cache.
	 */
	@GET
	@Path("{name:[\\w\\-]+}")
	public CacheStatistics getCache(@PathParam("name") final String name) {
		final var cache = getCacheExpected(name);
		final var result = new CacheStatistics();
		result.setId(name);
		result.setSize(size(cache));
		if (statisticsEnabled) {
			setStatistics(result, statisticsOf(name));
		}
		return result;
	}

	private Cache getCacheExpected(final String name) {
		return Optional.ofNullable(cacheManager.getCache(name)).orElseThrow(() -> new EntityNotFoundException(name));
	}

	/**
	 * Entry count of a cache. Caffeine gives it directly (after the pending maintenance, so evicted entries are not
	 * counted); any other provider is iterated.
	 *
	 * @param cache The Spring cache wrapping a JSR-107 cache.
	 * @return The entry count.
	 */
	protected long size(final Cache cache) {
		final var jcache = (javax.cache.Cache<?, ?>) cache.getNativeCache();
		try {
			final var caffeine = jcache.unwrap(com.github.benmanes.caffeine.cache.Cache.class);
			caffeine.cleanUp();
			return caffeine.estimatedSize();
		} catch (final IllegalArgumentException e) {
			return StreamSupport.stream(jcache.spliterator(), false).count();
		}
	}

	/**
	 * The JSR-107 statistics bean of a cache, registered in the platform MBean server while statistics are enabled.
	 *
	 * @param name The cache name.
	 * @return The statistics bean, or <code>null</code> when it is not registered.
	 */
	protected CacheStatisticsMXBean statisticsOf(final String name) {
		final var server = ManagementFactory.getPlatformMBeanServer();
		final var objectName = statisticsName(name);
		return server.isRegistered(objectName) ? JMX.newMXBeanProxy(server, objectName, CacheStatisticsMXBean.class)
				: null;
	}

	/**
	 * JMX name of the JSR-107 statistics bean of a cache: <code>javax.cache:type=CacheStatistics,CacheManager=&lt;uri&gt;,Cache=&lt;name&gt;</code>,
	 * where <code>,</code> <code>:</code> <code>=</code> and new lines are replaced by <code>.</code> as the
	 * specification requires.
	 *
	 * @param cacheName The cache name.
	 * @return The JMX object name.
	 */
	static ObjectName statisticsName(final String cacheName) {
		try {
			return new ObjectName("javax.cache:type=CacheStatistics,CacheManager="
					+ sanitize(CaffeineCacheManagerFactoryBean.MANAGER_URI.toString()) + ",Cache=" + sanitize(cacheName));
		} catch (final MalformedObjectNameException e) {
			throw new IllegalArgumentException(cacheName, e);
		}
	}

	private static String sanitize(final String value) {
		return value.replaceAll("[,:=\n]", ".");
	}

	/**
	 * Copy the hit and miss figures of a statistics bean into the result.
	 *
	 * @param result     The target statistics.
	 * @param statistics The source bean, ignored when <code>null</code>.
	 */
	protected void setStatistics(final CacheStatistics result, final CacheStatisticsMXBean statistics) {
		if (statistics == null) {
			return;
		}
		result.setMissPercentage(statistics.getCacheMissPercentage());
		result.setMissCount(statistics.getCacheMisses());
		result.setHitPercentage(statistics.getCacheHitPercentage());
		result.setHitCount(statistics.getCacheHits());
		result.setAverageGetTime(statistics.getAverageGetTime());
	}

	/**
	 * Invalidate a cache.
	 *
	 * @param name The cache name.
	 */
	@POST
	@DELETE
	@Path("{name:[\\w\\-]+}")
	public void invalidate(@PathParam("name") final String name) {
		getCacheExpected(name).clear();
	}

	/**
	 * Enable the statistics of every cache.
	 */
	@POST
	@Path("statistics/enable")
	public void enableStatistics() {
		changeStatistics(true);
	}

	/**
	 * Disable the statistics of every cache.
	 */
	@POST
	@Path("statistics/disable")
	public void disableStatistics() {
		changeStatistics(false);
	}

	private void changeStatistics(final boolean enabled) {
		final var jcache = ((JCacheCacheManager) cacheManager).getCacheManager();
		cacheManager.getCacheNames().forEach(name -> jcache.enableStatistics(name, enabled));
		statisticsEnabled = enabled;
		log.info("Cache statistics {}", enabled ? "enabled" : "disabled");
	}

	/**
	 * Invalidate all caches.
	 */
	@DELETE
	public void invalidate() {
		cacheManager.getCacheNames().stream().map(cacheManager::getCache).forEach(Cache::clear);
	}
}
```

The `ContextClosedEvent` listener is gone: the factory's `destroy()` closes the manager and Caffeine holds no thread or port.

- [ ] **Step 9: Update `CacheResourceTest`**

Replace the imports of `com.hazelcast.*`, `HazelcastInstance`, `LifecycleService`, `JCacheCacheManager` (if no longer used) and `ContextClosedEvent`. Then:

Replace `assertCache` by:

```java
	private void assertCache(final CacheStatistics cache) {
		Assertions.assertEquals("test-cache", cache.getId());
		Assertions.assertTrue(cache.getSize() <= 200, "bounded by the declared maximum size");
		Assertions.assertTrue(cache.getSize() > 100);
		Assertions.assertNotNull(cache.getHitCount());
		Assertions.assertNotNull(cache.getMissCount());
		Assertions.assertTrue(cache.getMissCount() >= 100000);
		Assertions.assertNotNull(cache.getHitPercentage());
		Assertions.assertNotNull(cache.getAverageGetTime());
	}
```

Replace the tail of `getCache()` (statistics disabled keeps the size, drops the figures):

```java
	@Test
	void getCache() {
		dummyCacheBean.getHit("entry-key");
		cacheResource.invalidate("test-cache");
		dummyCacheBean.getHit("entry-key");
		doManyHits();
		assertCache(cacheResource.getCache("test-cache"));
		cacheResource.disableStatistics();
		doManyHits();
		final var noStatistics = cacheResource.getCache("test-cache");
		Assertions.assertTrue(noStatistics.getSize() > 100);
		Assertions.assertNull(noStatistics.getHitCount());
		Assertions.assertNull(noStatistics.getMissCount());
		Assertions.assertNull(noStatistics.getHitPercentage());
	}
```

Replace `setStatistics()` by a JSR-107 mock, and add the name test; delete `onApplicationEventNotRunning` and `onApplicationEventRunning`:

```java
	@Test
	void setStatistics() {
		final var result = new CacheStatistics();
		final var statistics = mock(javax.cache.management.CacheStatisticsMXBean.class);
		Mockito.doReturn(1.1F).when(statistics).getCacheMissPercentage();
		Mockito.doReturn(2.2F).when(statistics).getCacheHitPercentage();
		Mockito.doReturn(3L).when(statistics).getCacheHits();
		Mockito.doReturn(4L).when(statistics).getCacheMisses();
		Mockito.doReturn(5F).when(statistics).getAverageGetTime();
		cacheResource.setStatistics(result, statistics);
		Assertions.assertEquals(1.1, result.getMissPercentage(), 0.01);
		Assertions.assertEquals(2.2, result.getHitPercentage(), 0.01);
		Assertions.assertEquals(3, result.getHitCount().longValue());
		Assertions.assertEquals(4, result.getMissCount().longValue());
		Assertions.assertEquals(5, result.getAverageGetTime(), 0.01);
	}

	@Test
	void setStatisticsNull() {
		final var result = new CacheStatistics();
		cacheResource.setStatistics(result, null);
		Assertions.assertNull(result.getHitCount());
	}

	@Test
	void statisticsName() {
		Assertions.assertEquals("javax.cache:type=CacheStatistics,CacheManager=ligoj,Cache=a.b.c",
				CacheResource.statisticsName("a,b=c").toString());
	}

	@Test
	void statisticsOfUnregistered() {
		Assertions.assertNull(cacheResource.statisticsOf("not-a-cache"));
	}
```

`getCaches()` keeps asserting 7 caches (authorizations, user-details, configuration, hooks, test-cache, test-cache-1, test-cache-2).

- [ ] **Step 10: Run the module tests**

Run: `cd ~/git/bootstrap && mvn -o -q -Djarsigner.skip=true -pl bootstrap-business test -Dtest='CaffeineCacheManagerFactoryBeanTest,CacheResourceTest' -Dsurefire.failIfNoSpecifiedTests=false`
Expected: PASS. The two expiry tests (`expiryModifyPolicy`, `expiryTouchedPolicy`) rely on Caffeine honouring the JSR-107 `ModifiedExpiryPolicy` / `TouchedExpiryPolicy`; if `expiryTouchedPolicy` fails on the "last access was 800ms ago" step, replace the `TouchedExpiryPolicy` of `test-cache-2` by `((CaffeineConfiguration<String, Object>) touched).setExpireAfterAccess(OptionalLong.of(TimeUnit.SECONDS.toNanos(1)))` and keep the JSR-107 policy factory unset.

Then the whole module: `mvn -o -q -Djarsigner.skip=true -pl bootstrap-business test`
Expected: PASS (the other resources use the cache through `@CacheResult` only).

- [ ] **Step 11: Commit**

```bash
cd ~/git/bootstrap && git add -A bootstrap-business/src && git commit -m "feat(cache): provider-neutral cache SPI backed by Caffeine"
```

---

### Task 3: Remove every Hazelcast leftover from bootstrap

**Files:**
- Modify: `~/git/bootstrap/parent/pom.xml` (remove `hazelcast.version`, the two managed Hazelcast artifacts)
- Modify: `~/git/bootstrap/bootstrap-business/pom.xml` (remove the `hazelcast-spring` dependency)
- Delete: `bootstrap-business/src/main/resources/META-INF/hazelcast-local.xml`, `hazelcast-multicast.xml`
- Modify: `~/git/bootstrap/README.md` line 79 (module description)

**Interfaces:**
- Produces: a bootstrap build with no Hazelcast on any classpath; installed as `5.0.1-SNAPSHOT` in the local repository for the dependents.

- [ ] **Step 1: Delete the configuration files and the dependency entries**

```bash
cd ~/git/bootstrap && git rm -q bootstrap-business/src/main/resources/META-INF/hazelcast-local.xml bootstrap-business/src/main/resources/META-INF/hazelcast-multicast.xml
```

In `parent/pom.xml` delete the `<hazelcast.version>5.7.0</hazelcast.version>` property and the two `<dependency>` blocks of `com.hazelcast` in `dependencyManagement`. In `bootstrap-business/pom.xml` delete the `hazelcast-spring` dependency block.

In `README.md` line 79 replace the word `Hazelcast` (in the bootstrap-business bullet) by `Caffeine (JSR-107)`.

- [ ] **Step 2: Verify nothing references Hazelcast anymore**

Run: `cd ~/git/bootstrap && grep -rni hazelcast --include='*.java' --include='*.xml' --include='*.md' --include='*.properties' . | grep -v '/target/'`
Expected: no output.

- [ ] **Step 3: Full bootstrap build and install**

Run: `cd ~/git/bootstrap && mvn -o -q -Djarsigner.skip=true install`
Expected: BUILD SUCCESS, all modules' tests green. The `MfaResourceTest`, `UserResourceTest` and the other business tests boot the same Spring test context, so they exercise the Caffeine manager end to end.

- [ ] **Step 4: Commit**

```bash
cd ~/git/bootstrap && git add -A && git commit -m "build(cache): drop Hazelcast"
```

---

### Task 4: Migrate ligoj-api (plugin-core, plugin-iam-empty, plugin-api tests)

**Files:**
- Modify: `~/git/ligoj-api/plugin-core/src/main/java/org/ligoj/app/resource/node/NodeCache.java`
- Modify: `~/git/ligoj-api/plugin-iam-empty/src/main/java/org/ligoj/app/iam/empty/IamEmptyCache.java`
- Modify: `~/git/ligoj-api/plugin-api/src/test/java/org/ligoj/app/iam/IdLdapTestCache.java`
- Modify: `~/git/ligoj-api/parent/pom.xml` line 9 (`bootstrap-business-parent` version → the SNAPSHOT carrying Task 2)

**Interfaces:**
- Consumes: `CacheManagerAware.onCreate(javax.cache.CacheManager, CacheConfigurer)` from Task 2.
- Produces: ligoj-api installed locally for app-api and the plugins.

- [ ] **Step 1: Point the parent at the bootstrap SNAPSHOT**

In `parent/pom.xml`, `<parent>` block: `<version>5.0.0</version>` → `<version>5.0.1-SNAPSHOT</version>` (or the renumbered minor once decided).

- [ ] **Step 2: Rewrite the three declarations**

`NodeCache.java` (body of the class, imports replaced by `javax.cache.CacheManager`, `javax.cache.expiry.Duration`, `static java.util.concurrent.TimeUnit.HOURS`, the SPI classes and the Spring annotations):

```java
@Component
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
public class NodeCache implements CacheManagerAware {

	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("nodes", configurer.newCacheConfig("nodes"));
		cacheManager.createCache("node-parameters", configurer.newCacheConfig("node-parameters"));
		cacheManager.createCache("services", configurer.newCacheConfig("services"));
		cacheManager.createCache("node-enablement", configurer.newCacheConfig("node-enablement"));
		cacheManager.createCache("curl-tokens", configurer.newCacheConfig("curl-tokens", new Duration(HOURS, 10)));
		cacheManager.createCache("subscription-parameters", configurer.newCacheConfig("subscription-parameters"));
		cacheManager.createCache("plugin-data", configurer.newCacheConfig("plugin-data"));
	}
}
```

`IamEmptyCache.java`:

```java
@Component
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
public class IamEmptyCache implements CacheManagerAware {

	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("iam-empty-configuration", configurer.newCacheConfig("iam-empty-configuration"));
	}
}
```

`IdLdapTestCache.java` (plugin-api tests):

```java
@Component
public class IdLdapTestCache implements CacheManagerAware {

	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("iam-ldap-configuration", configurer.newCacheConfig("iam-ldap-configuration"));
	}
}
```

In each file the import `com.hazelcast.cache.HazelcastCacheManager` becomes `javax.cache.CacheManager`; `NodeCache` also drops `com.hazelcast.config.EvictionConfig`.

- [ ] **Step 3: Build, test and install**

Run: `cd ~/git/ligoj-api && grep -rni hazelcast --include='*.java' . | grep -v /target/; mvn -o -q -Djarsigner.skip=true install`
Expected: the grep prints nothing; BUILD SUCCESS with the plugin-core, plugin-iam-empty and plugin-api-test suites green.

- [ ] **Step 4: Commit**

```bash
cd ~/git/ligoj-api && git add -A && git commit -m "feat(cache): provider-neutral cache declarations"
```

---

### Task 5: Migrate app-api and the documentation

**Files:**
- Modify: `~/git/ligoj/app-api/src/main/java/org/ligoj/app/resource/plugin/repository/PluginCache.java`
- Modify: `~/git/ligoj/app-api/src/main/resources/application.properties` (lines 28, 127-128)
- Modify: `~/git/ligoj/app-api/pom.xml` line 7 (parent version, already `5.0.1-SNAPSHOT` in the working tree)
- Modify: `~/git/ligoj/DOC.md` (lines 86-87 and the property table row at line 2569)

**Interfaces:**
- Consumes: Task 2 SPI, Task 4 ligoj-api (through `api.version` if the ligoj-api version changed).

- [ ] **Step 1: Rewrite `PluginCache`**

```java
@Component
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
public class PluginCache implements CacheManagerAware {

	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("plugins-last-version-central",
				configurer.newCacheConfig("plugins-last-version-central", Duration.ONE_DAY));
		cacheManager.createCache("plugins-last-version-nexus",
				configurer.newCacheConfig("plugins-last-version-nexus", Duration.ONE_DAY));
	}
}
```

Import `javax.cache.CacheManager` instead of `com.hazelcast.cache.HazelcastCacheManager`.

- [ ] **Step 2: Update `application.properties`**

Delete line 28 `logging.level.com.hazelcast=warn`. Replace the block

```properties
# Hazelcast
hazelcast.statistics.enable=true
```

by

```properties
# Cache (Caffeine, JSR-107). Statistics are exposed by rest/system/cache and the Administration > Caches page.
cache.statistics.enable=true
# Store entries by reference (default). Set to true to copy entries on put/get (Java serialization) as the former provider did.
cache.store-by-value=false
```

- [ ] **Step 3: Update `DOC.md`**

Replace the "## Cache" paragraph (lines 86-87):

```markdown
## Cache

The cache is a JSR-107 (JCache) manager backed by Caffeine, in-process. Each module declares its caches through the `CacheManagerAware` callback of bootstrap, which merges every declaration into the single manager at startup: name, default TTL (overridable with `cache.<name>.ttl`), maximum entry count (10 000 by default) and statistics. The `rest/system/cache` resource lists the caches with their size and hit/miss statistics, invalidates them, and toggles the statistics at runtime. See [[Hibernate Ext]].
```

Replace the property row `| cache.location | ... |` by these two rows (same column widths as the table):

```markdown
| cache.statistics.enable                               | `false`                                  | Register the JSR-107 statistics of every cache (hits, misses, average get time) and expose them in `rest/system/cache`. |
| cache.store-by-value                                  | `false`                                  | Copy cache entries on put/get (Java serialization) instead of storing them by reference.           |
```

- [ ] **Step 4: Compile and run the app-api tests**

Run: `cd ~/git/ligoj/app-api && grep -rni hazelcast src | grep -v /target/; mvn -o -q -Djarsigner.skip=true test`
Expected: the grep prints nothing; BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
cd ~/git/ligoj && git add app-api/src DOC.md && git commit -m "feat(cache): Caffeine-backed cache declarations and documentation"
```

The `app-api/pom.xml` parent bump is the user's pending change; leave it to the user.

---

### Task 6: Migrate the plugins (one sub-step per repository)

**Files:**
- Modify: `~/git/ligoj-plugins/plugin-id/src/main/java/org/ligoj/app/plugin/id/resource/IdCache.java`
- Modify: `~/git/ligoj-plugins/plugin-id-ldap/src/main/java/org/ligoj/app/plugin/ldap/resource/IdLdapCache.java` and `src/test/java/org/ligoj/app/plugin/ldap/resource/IdLdapTestCache.java`
- Modify: `~/git/ligoj-plugins/plugin-id-sql/src/main/java/org/ligoj/app/plugin/idsql/resource/IdSqlCache.java` and `src/test/java/org/ligoj/app/plugin/idsql/resource/IdSqlTestCache.java`
- Modify: `~/git/ligoj-plugins/plugin-id-cognito/src/test/java/org/ligoj/app/plugin/cognito/resource/IdCognitoTestCache.java`
- Modify: `~/git/ligoj-plugins/plugin-iam-node/src/main/java/org/ligoj/app/plugin/iam/IamNodeCache.java`
- Modify: `~/git/ligoj-plugins/plugin-prov/src/main/java/org/ligoj/app/plugin/prov/terraform/ProvCache.java`
- Modify: `~/git/ligoj-plugins/plugin-vm-azure/src/main/java/org/ligoj/app/plugin/vmazure/AzureCache.java`
- Modify: each plugin's `pom.xml` `<parent>` version so it resolves the ligoj-api build of Task 4 (currently `plugin-parent:5.0.0`; use the ligoj-api SNAPSHOT that carries the change)

**Interfaces:**
- Consumes: Task 2 SPI through the ligoj-api parent of Task 4.

For every file: replace `import com.hazelcast.cache.HazelcastCacheManager;` by `import javax.cache.CacheManager;`, change the parameter type of `onCreate` to `CacheManager`, and delete every `com.hazelcast.config.*` import and `EvictionConfig` line. Sizes previously set through `EvictionConfig().setSize(1000)` move to the third argument of `newCacheConfig`.

- [ ] **Step 1: plugin-id**

```java
	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("container-scopes", configurer.newCacheConfig("container-scopes"));
		cacheManager.createCache("user-is-admin", configurer.newCacheConfig("user-is-admin", Duration.ONE_MINUTE));
		cacheManager.createCache("id-configuration", configurer.newCacheConfig("id-configuration"));
	}
```

Run: `cd ~/git/ligoj-plugins/plugin-id && mvn -o -q -Djarsigner.skip=true install`
Expected: BUILD SUCCESS (plugin-id-ldap, -sql and -cognito depend on this install).

- [ ] **Step 2: plugin-id-ldap (main + test)**

```java
	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("id-ldap-data", configurer.newCacheConfig("id-ldap-data", Duration.ONE_DAY));
		cacheManager.createCache("customers", configurer.newCacheConfig("customers", Duration.ONE_HOUR));
		cacheManager.createCache("customers-by-id", configurer.newCacheConfig("customers-by-id", Duration.ONE_HOUR));
	}
```

Test cache:

```java
	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("iam-ldap-configuration", configurer.newCacheConfig("iam-ldap-configuration"));
	}
```

Run: `cd ~/git/ligoj-plugins/plugin-id-ldap && mvn -o -q -Djarsigner.skip=true test`
Expected: BUILD SUCCESS.

- [ ] **Step 3: plugin-id-sql (main + test)**

```java
	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("id-sql-data", configurer.newCacheConfig("id-sql-data"));
	}
```

Test cache: same shape with `"iam-sql-configuration"`.

Run: `cd ~/git/ligoj-plugins/plugin-id-sql && mvn -o -q -Djarsigner.skip=true test`
Expected: BUILD SUCCESS.

- [ ] **Step 4: plugin-id-cognito (test only)**

```java
	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("iam-cognito-configuration", configurer.newCacheConfig("iam-cognito-configuration"));
	}
```

Run: `cd ~/git/ligoj-plugins/plugin-id-cognito && mvn -o -q -Djarsigner.skip=true test`
Expected: BUILD SUCCESS.

- [ ] **Step 5: plugin-iam-node**

```java
	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("iam-node-configuration", configurer.newCacheConfig("iam-node-configuration"));
	}
```

Run: `cd ~/git/ligoj-plugins/plugin-iam-node && mvn -o -q -Djarsigner.skip=true test`
Expected: BUILD SUCCESS.

- [ ] **Step 6: plugin-prov**

```java
	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("terraform-version", configurer.newCacheConfig("terraform-version"));
		cacheManager.createCache("terraform-version-latest",
				configurer.newCacheConfig("terraform-version-latest", Duration.ONE_DAY));
		cacheManager.createCache("prov-location", configurer.newCacheConfig("prov-location", Duration.ETERNAL, 1000));
		// Instance cache configurations
		createCache(cacheManager, configurer, 1000, "prov-instance-type", "prov-instance-type-dyn",
				"prov-instance-type-has-dyn", "prov-instance-has-co2", "prov-instance-term", "prov-database-type",
				"prov-database-type-dyn", "prov-database-type-has-dyn", "prov-database-has-co2", "prov-container-type",
				"prov-container-type-dyn", "prov-container-type-has-dyn", "prov-container-has-co2",
				"prov-function-type", "prov-function-type-dyn", "prov-function-type-has-dyn", "prov-function-has-co2");
		createCache(cacheManager, configurer, CacheConfigurer.DEFAULT_MAXIMUM_SIZE, "prov-processor",
				"prov-instance-software", "prov-instance-license", "prov-instance-os", "prov-database-engine",
				"prov-database-edition", "prov-database-license", "prov-container-license", "prov-container-os",
				"prov-architecture");
	}

	private void createCache(final CacheManager cacheManager, final CacheConfigurer configurer,
			final long maximumSize, final String... names) {
		Stream.of(names).forEach(name -> cacheManager.createCache(name,
				configurer.newCacheConfig(name, Duration.ETERNAL, maximumSize)));
	}
```

Delete the former `createCacheEvict` method and the `EvictionConfig` / `EvictionPolicy` imports.

Run: `cd ~/git/ligoj-plugins/plugin-prov && mvn -o -q -Djarsigner.skip=true install`
Expected: BUILD SUCCESS (long suite; the prov tools depend on this install).

- [ ] **Step 7: plugin-vm-azure**

```java
	@Override
	public void onCreate(final CacheManager cacheManager, final CacheConfigurer configurer) {
		cacheManager.createCache("azure-sizes", configurer.newCacheConfig("azure-sizes"));
	}
```

Run: `cd ~/git/ligoj-plugins/plugin-vm-azure && mvn -o -q -Djarsigner.skip=true test`
Expected: BUILD SUCCESS.

- [ ] **Step 8: Workspace-wide check**

Run: `grep -rli hazelcast ~/git/ligoj-plugins/plugin-*/src ~/git/ligoj-plugins/plugin-*/pom.xml 2>/dev/null | grep -v plugin-id_old`
Expected: no output (`plugin-id_old` is a stale copy, not a plugin).

- [ ] **Step 9: Commit each plugin repository**

```bash
for p in plugin-id plugin-id-ldap plugin-id-sql plugin-id-cognito plugin-iam-node plugin-prov plugin-vm-azure; do
  git -C ~/git/ligoj-plugins/$p add -A && git -C ~/git/ligoj-plugins/$p commit -m "feat(cache): provider-neutral cache declarations"
done
```

---

### Task 7: Runtime verification in the dev stack, store-mode audit, notes

**Files:**
- Modify: `/Users/fabdouglas/.claude/projects/-Users-fabdouglas-git-ligoj/memory/ligoj-dev-diagnosis-tips.md` (one bullet: cache provider is Caffeine, statistics via `cache.statistics.enable`, no port 5701)
- No source change expected; findings of the audit become follow-up items.

**Interfaces:**
- Consumes: everything above, running API (IDE) on `:8081` and UI dev server on `:5173`.

- [ ] **Step 1: Restart the API from the IDE and check the startup log**

Run: `awk '/Hazelcast|hazelcast|5701/' ~/git/ligoj/app-api/target/api-rolling.log | tail -3; awk '/Started .*Application in/' ~/git/ligoj/app-api/target/api-rolling.log | tail -1`
Expected: no Hazelcast line after the restart timestamp; the "Started ... in N seconds" line shows a lower figure than before the migration (record both in the final report).

- [ ] **Step 2: Exercise the REST contract with the API key headers**

```bash
KEY=$(awk '/^api_key/{v=$0; sub(/^[^=:]*[=:][ \t]*/, "", v); gsub(/["'"'"' \r]/, "", v); print v}' ~/.ligoj/credentials | head -1)
H=(-H "x-api-user: ligoj-admin" -H "x-api-key: $KEY")
curl -s "${H[@]}" http://localhost:5173/ligoj/rest/system/cache | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d), 'caches;', [c['id'] for c in d][:6]); print({k: d[0].get(k) for k in ('id','size','hitCount','missCount')})"
curl -s -o /dev/null -w 'enable → %{http_code}\n' -X POST "${H[@]}" http://localhost:5173/ligoj/rest/system/cache/statistics/enable
curl -s "${H[@]}" http://localhost:5173/ligoj/rest/subscription > /dev/null   # populate a few caches
curl -s "${H[@]}" http://localhost:5173/ligoj/rest/system/cache/nodes | python3 -m json.tool
curl -s -o /dev/null -w 'invalidate → %{http_code}\n' -X DELETE "${H[@]}" http://localhost:5173/ligoj/rest/system/cache/nodes
```

Expected: the list contains every cache declared by the installed plugins (at least `authorizations, user-details, configuration, hooks, nodes, node-parameters, services, node-enablement, curl-tokens, subscription-parameters, plugin-data, plugins-last-version-central, plugins-last-version-nexus` plus the id/ldap ones), `statistics/enable` → 204, the `nodes` payload has `hitCount`/`missCount` numbers and no `node` key, invalidate → 204.

- [ ] **Step 3: Check the Administration > Caches page**

Headless (API-token mode avoids the MFA prompt), reusing the pattern of the session scripts:

```js
// scratchpad/check-cache-view.cjs
const { chromium } = require('@playwright/test')
const BASE = 'http://localhost:5173/ligoj/'
;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'x-api-user': 'ligoj-admin', 'x-api-key': process.env.KEY }, viewport: { width: 1440, height: 1000 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)) })
  await page.goto(BASE + 'index.html#/system/cache', { waitUntil: 'domcontentloaded' })
  await page.locator('table tbody tr').first().waitFor({ timeout: 30000 })
  console.log('cache rows:', await page.locator('table tbody tr').count(), '| console errors:', errors.join(' | ') || 'none')
  await page.screenshot({ path: process.env.S + '/cache-view.png' })
  await browser.close()
})().catch((e) => { console.error('SCRIPT FAILURE', e.message.split('\n')[0]); process.exit(1) })
```

Run: `cd $S && KEY=... S=$S NODE_PATH=~/git/ligoj/app-ui/src/main/webapp/node_modules node check-cache-view.cjs`
Expected: a row per cache, statistics columns filled after Step 2, no console error; look at the screenshot.

- [ ] **Step 4: Store-by-reference audit**

Run in each repository: `grep -rn -B2 -A12 "@CacheResult" --include='*.java' src/main | grep -n "\.set[A-Z][A-Za-z]*(\|\.add(\|\.put(\|\.remove(\|\.clear(" | head -40`
Review each hit: a `@CacheResult` method must return a value its callers never mutate (a defensive copy, an unmodifiable collection, or an entity the callers only read). Any method whose result is later modified in place is listed as a follow-up: either wrap the returned collection with `List.copyOf` / `Map.copyOf` inside the cached method, or set `cache.store-by-value=true` for that deployment until fixed. Report the list; do not fix inside this plan.

- [ ] **Step 5: Record the result in the memory note**

Append to `ligoj-dev-diagnosis-tips.md`:

```markdown
- Cache provider is Caffeine (JSR-107) since the bootstrap SNAPSHOT of the Caffeine migration: no port 5701, statistics through `cache.statistics.enable` (old `hazelcast.statistics.enable` still honoured), store mode through `cache.store-by-value` (default by reference). Cache declarations implement `CacheManagerAware.onCreate(javax.cache.CacheManager, CacheConfigurer)`; sizes go through the 3-argument `newCacheConfig`.
```

- [ ] **Step 6: Final report to the user**

State: startup time before/after, the cache count exposed, the audit findings (follow-ups), the repositories with uncommitted or committed changes, and the release note that the bootstrap version carrying this must be a minor (SPI change).

---

## Self-review

- **Coverage:** neutral SPI (Task 2), Caffeine factory with TTL/size/statistics/store mode (Task 2), `rest/system/cache` contract preserved with JMX statistics and no cluster (Task 2), Hazelcast fully removed (Tasks 3-6), every one of the 10 main and 5 test `CacheManagerAware` implementations rewritten (Tasks 2, 4, 5, 6), properties and DOC.md (Task 5), runtime proof and store-mode risk (Task 7).
- **Placeholders:** none; every code step carries the code.
- **Type consistency:** `onCreate(CacheManager, CacheConfigurer)` and `newCacheConfig(String, Duration, long)` are used identically in Tasks 2, 4, 5 and 6; `CaffeineCacheManagerFactoryBean.MANAGER_URI` is used by `CacheResource.statisticsName` and asserted in both test classes as `ligoj`.
