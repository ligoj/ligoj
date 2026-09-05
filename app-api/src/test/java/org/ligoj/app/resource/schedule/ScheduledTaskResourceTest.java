package org.ligoj.app.resource.schedule;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.apache.commons.lang3.reflect.FieldUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.FixedRateTask;
import org.springframework.scheduling.config.ScheduledTaskHolder;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.scheduling.support.ScheduledMethodRunnable;

/**
 * Test class of {@link ScheduledTaskResource}: real Spring scheduled tasks through a registrar, plus a provider.
 */
class ScheduledTaskResourceTest {

	private ThreadPoolTaskScheduler scheduler;
	private ScheduledTaskRegistrar registrar;

	/**
	 * Sample scheduled bean.
	 */
	public static class SampleJob {
		public void purge() {
			// Nothing to do
		}
	}

	/**
	 * Sample plain runnable (not a scheduled method).
	 */
	public static class Ticker implements Runnable {
		@Override
		public void run() {
			// Nothing to do
		}
	}

	@AfterEach
	void destroy() {
		if (registrar != null) {
			registrar.destroy();
		}
		if (scheduler != null) {
			scheduler.shutdown();
		}
	}

	@Test
	void describe() {
		final var vo = new ScheduledTaskVo();
		ScheduledTaskResource.describe(() -> {
		}, vo);
		Assertions.assertEquals("run", vo.getMethod());
		Assertions.assertNotNull(vo.getBeanClass());

		// Spring's outcome tracking wrapper renders the scheduled method as "class.method"
		ScheduledTaskResource.describe(new Runnable() {
			@Override
			public void run() {
				// Nothing to do
			}

			@Override
			public String toString() {
				return "org.ligoj.app.resource.node.NodeResource.checkNodesStatusScheduler";
			}
		}, vo);
		Assertions.assertEquals("NodeResource", vo.getBean());
		Assertions.assertEquals("org.ligoj.app.resource.node.NodeResource", vo.getBeanClass());
		Assertions.assertEquals("checkNodesStatusScheduler", vo.getMethod());
	}

	@Test
	void findAllOutcome() throws Exception {
		scheduler = new ThreadPoolTaskScheduler();
		scheduler.initialize();
		registrar = new ScheduledTaskRegistrar();
		registrar.setTaskScheduler(scheduler);
		registrar.addCronTask(new CronTask(new ScheduledMethodRunnable(new SampleJob(), "purge"), "0 0 4 * * *"));
		registrar.addCronTask(new CronTask(() -> {
			throw new IllegalStateException("boom");
		}, "0 0 5 * * *"));
		registrar.afterPropertiesSet();
		final var resource = new ScheduledTaskResource();

		// Run the wrapped runnables once: Spring records the outcome
		for (final var scheduled : registrar.getScheduledTasks()) {
			try {
				scheduled.getTask().getRunnable().run();
			} catch (final IllegalStateException e) {
				// Expected for the failing task
			}
		}
		for (final var scheduled : registrar.getScheduledTasks()) {
			final var vo = resource.toVo(scheduled);
			Assertions.assertNotNull(vo.getLastExecution());
			if ("purge".equals(vo.getMethod())) {
				Assertions.assertEquals("succeeded", vo.getLastStatus());
				Assertions.assertNull(vo.getLastError());
			} else {
				Assertions.assertEquals("failed", vo.getLastStatus());
				Assertions.assertEquals("boom", vo.getLastError());
			}
			Assertions.assertEquals("scheduled", vo.getStatus());
		}
	}

	@Test
	void findAll() throws Exception {
		scheduler = new ThreadPoolTaskScheduler();
		scheduler.initialize();
		registrar = new ScheduledTaskRegistrar();
		registrar.setTaskScheduler(scheduler);
		final var job = new SampleJob();
		registrar.addCronTask(new CronTask(new ScheduledMethodRunnable(job, "purge"), "0 0 4 * * *"));
		registrar.addFixedRateTask(new FixedRateTask(new Ticker(), Duration.ofMinutes(5), Duration.ofMinutes(1)));
		registrar.afterPropertiesSet();

		final var provided = new ScheduledTaskVo();
		provided.setBean("PluginScheduleResource");
		provided.setMethod("check");
		provided.setStatus("disabled");
		final ScheduledTaskProvider provider = () -> List.of(provided);
		final var context = mock(ApplicationContext.class);
		when(context.getBeansOfType(ScheduledTaskHolder.class)).thenReturn(Map.of("registrar", registrar));
		when(context.getBeansOfType(ScheduledTaskProvider.class)).thenReturn(Map.of("provider", provider));
		final var resource = new ScheduledTaskResource();
		FieldUtils.writeField(resource, "context", context, true);

		final var tasks = resource.findAll();
		Assertions.assertEquals(3, tasks.size());

		// Sorted by bean: PluginScheduleResource (provider), SampleJob (cron), Ticker (fixed rate)
		Assertions.assertEquals(List.of("PluginScheduleResource", "SampleJob", "Ticker"),
				tasks.stream().map(ScheduledTaskVo::getBean).toList());
		Assertions.assertSame(provided, tasks.getFirst());
		final var cron = tasks.stream().filter(t -> "purge".equals(t.getMethod())).findFirst().orElseThrow();
		Assertions.assertEquals("spring", cron.getSource());
		Assertions.assertEquals("SampleJob", cron.getBean());
		Assertions.assertEquals(SampleJob.class.getName(), cron.getBeanClass());
		Assertions.assertEquals("spring:" + SampleJob.class.getName() + "#purge", cron.getId());
		Assertions.assertEquals("cron", cron.getTrigger());
		Assertions.assertEquals("0 0 4 * * *", cron.getExpression());
		Assertions.assertEquals("scheduled", cron.getStatus());
		Assertions.assertNotNull(cron.getNextExecution());
		Assertions.assertNull(cron.getLastExecution());
		Assertions.assertNull(cron.getLastStatus());

		final var rate = tasks.stream().filter(t -> "fixed-rate".equals(t.getTrigger())).findFirst().orElseThrow();
		Assertions.assertEquals("PT5M", rate.getExpression());
		Assertions.assertEquals("run", rate.getMethod());
		Assertions.assertEquals("scheduled", rate.getStatus());
		Assertions.assertNotNull(rate.getNextExecution());
	}
}
