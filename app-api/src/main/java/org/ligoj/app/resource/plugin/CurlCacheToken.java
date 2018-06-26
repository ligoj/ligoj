/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import java.util.function.Function;
import java.util.function.Supplier;

import javax.cache.annotation.CacheKey;
import javax.validation.constraints.NotNull;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * A a cache manager for token used by the {@link CurlProcessor}
 *
 * @deprecated Use bootstrap version
 */
@Deprecated(since = "3.0.0")
@Component("deprecatedCurlCacheToken")
public class CurlCacheToken {

	@Autowired
	protected org.ligoj.bootstrap.core.curl.CurlCacheToken token;

	/**
	 * Return a cache token.
	 *
	 * @param key
	 *            The cache key.
	 * @param function
	 *            The {@link Function} used to retrieve the token value when the cache fails.
	 * @param retries
	 *            The amount of retries until the provider returns a not <code>null</code> value.
	 * @param exceptionSupplier
	 *            The exception used when the token cannot be retrieved.
	 * @return The token value either from the cache, either from the fresh computed one.
	 */
	public String getTokenCache(@CacheKey @NotNull final String key, final Function<String, String> function, final int retries,
			final Supplier<? extends RuntimeException> exceptionSupplier) {
		return token.getTokenCache(key, function, retries, exceptionSupplier);
	}

	/**
	 * Return a synchronized cache token.
	 *
	 * @param synchronizeObject
	 *            The object used to synchronize the access to the cache.
	 * @param key
	 *            The cache key.
	 * @param function
	 *            The {@link Function} used to retrieve the token value when the cache fails.
	 * @param retries
	 *            The amount of retries until the provider returns a not <code>null</code> value.
	 * @param exceptionSupplier
	 *            The exception used when the token cannot be retrieved.
	 * @return The token value either from the cache, either from the fresh computed one.
	 */
	public String getTokenCache(@NotNull final Object synchronizeObject, @NotNull final String key, final Function<String, String> function,
			final int retries, final Supplier<? extends RuntimeException> exceptionSupplier) {
		return token.getTokenCache(synchronizeObject, key, function, retries, exceptionSupplier);
	}

}
