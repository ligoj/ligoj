/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin.repository;

import com.hazelcast.cache.HazelcastCacheManager;
import org.ligoj.bootstrap.resource.system.cache.CacheConfigurer;
import org.ligoj.bootstrap.resource.system.cache.CacheManagerAware;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.Role;
import org.springframework.stereotype.Component;

import javax.cache.expiry.Duration;

/**
 * Plug-in cache configuration.
 */
@Component
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
public class PluginCache implements CacheManagerAware {

	@Override
	public void onCreate(final HazelcastCacheManager cacheManager, final CacheConfigurer configurer) {
		final var central = configurer.newCacheConfig("plugins-last-version-central", Duration.ONE_DAY);
		cacheManager.createCache("plugins-last-version-central", central);
		final var nexus = configurer.newCacheConfig("plugins-last-version-nexus", Duration.ONE_DAY);
		cacheManager.createCache("plugins-last-version-nexus", nexus);
	}
}
