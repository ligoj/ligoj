/*
 * Licensed under MIT (https://github.com/ligoj/ligoj/blob/master/LICENSE)
 */
package org.ligoj.app.resource.plugin;

import java.util.concurrent.atomic.AtomicInteger;

import javax.transaction.Transactional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.ligoj.bootstrap.AbstractAppTest;
import org.ligoj.bootstrap.core.validation.ValidationJsonException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * Test class of {@link CurlCacheToken}
 *
 * @deprecated Use bootstrap version
 */
@Deprecated(since = "3.0.0")
@ExtendWith(SpringExtension.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
public class CurlCacheTokenTest extends AbstractAppTest {

	@Autowired
	private CurlCacheToken cacheToken;

	@BeforeEach
	@AfterEach
	public void clearCache() {
		clearAllCache();
	}

	@Test
	public void getTokenCacheNoSync() {
		AtomicInteger counter = new AtomicInteger();
		Assertions.assertEquals("ok", cacheToken.getTokenCache("key", k -> {
			if (counter.incrementAndGet() == 2) {
				return "ok";
			}
			return null;
		}, 2, () -> new ValidationJsonException()));
		Assertions.assertEquals(2, counter.get());
	}

	@Test
	public void getTokenCache() {
		final Object sync = new Object();
		AtomicInteger counter = new AtomicInteger();
		Assertions.assertEquals("ok", cacheToken.getTokenCache(sync, "key", k -> {
			if (counter.incrementAndGet() == 2) {
				return "ok";
			}
			return null;
		}, 2, () -> new ValidationJsonException()));
		Assertions.assertEquals(2, counter.get());
	}
}
