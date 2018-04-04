/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.repository;

import java.util.function.Function;

import javax.cache.expiry.AccessedExpiryPolicy;
import javax.cache.expiry.Duration;
import javax.cache.expiry.ModifiedExpiryPolicy;

import org.ligoj.bootstrap.resource.system.cache.CacheManagerAware;
import org.springframework.stereotype.Component;

import com.hazelcast.cache.HazelcastCacheManager;
import com.hazelcast.config.CacheConfig;

/**
 * Plug-in cache configuration.
 */
@Component
public class PluginCache implements CacheManagerAware {

	@Override
	public void onCreate(final HazelcastCacheManager cacheManager, final Function<String, CacheConfig<?, ?>> provider) {
		final CacheConfig<?, ?> central = provider.apply("authorizations");
		central.setExpiryPolicyFactory(ModifiedExpiryPolicy.factoryOf(Duration.ONE_DAY));
		cacheManager.createCache("plugins-last-version-central", central);
		final CacheConfig<?, ?> nexus = provider.apply("authorizations");
		nexus.setExpiryPolicyFactory(AccessedExpiryPolicy.factoryOf(Duration.ONE_DAY));
		cacheManager.createCache("plugins-last-version-nexus", nexus);
	}
}
