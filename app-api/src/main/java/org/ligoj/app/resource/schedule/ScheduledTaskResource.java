package org.ligoj.app.resource.schedule;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;

import org.apache.commons.lang3.StringUtils;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.FixedDelayTask;
import org.springframework.scheduling.config.FixedRateTask;
import org.springframework.scheduling.config.ScheduledTask;
import org.springframework.scheduling.config.ScheduledTaskHolder;
import org.springframework.scheduling.config.TaskExecutionOutcome;
import org.springframework.scheduling.config.TriggerTask;
import org.springframework.scheduling.support.ScheduledMethodRunnable;
import org.springframework.stereotype.Service;
import org.springframework.util.ClassUtils;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/**
 * Scheduled tasks of the application: the Spring {@code @Scheduled} methods registered by the annotation processor
 * ({@link ScheduledTaskHolder} beans), plus the schedules contributed by the {@link ScheduledTaskProvider} beans,
 * such as the plug-ins automation. Read-only, for the administration "Tasks" view.
 */
@Path("/system/schedule")
@Service
@Produces(MediaType.APPLICATION_JSON)
public class ScheduledTaskResource {

	/**
	 * {@code ScheduledMethodRunnable#toString()}: <code>fully.qualified.Class.method</code>.
	 */
	private static final Pattern METHOD_PATTERN = Pattern.compile("^([\\w.$]+)\\.(\\w+)$");

	/**
	 * Default {@code Object#toString()}: <code>fully.qualified.Class@hash</code>.
	 */
	private static final Pattern OBJECT_PATTERN = Pattern.compile("^([\\w.$]+)@[0-9a-fA-F]+$");

	@Autowired
	private ApplicationContext context;

	/**
	 * Return all the scheduled tasks, sorted by bean then method.
	 *
	 * @return The scheduled tasks with their trigger, next execution and state.
	 */
	@GET
	public List<ScheduledTaskVo> findAll() {
		final var tasks = new ArrayList<ScheduledTaskVo>();
		context.getBeansOfType(ScheduledTaskHolder.class).values()
				.forEach(holder -> holder.getScheduledTasks().forEach(task -> tasks.add(toVo(task))));
		context.getBeansOfType(ScheduledTaskProvider.class).values()
				.forEach(provider -> tasks.addAll(provider.getScheduledTasks()));
		tasks.sort(Comparator.comparing(ScheduledTaskVo::getBean, Comparator.nullsLast(String::compareTo))
				.thenComparing(ScheduledTaskVo::getMethod, Comparator.nullsLast(String::compareTo)));
		return tasks;
	}

	/**
	 * Describe a Spring scheduled task.
	 */
	ScheduledTaskVo toVo(final ScheduledTask scheduled) {
		final var task = scheduled.getTask();
		final var vo = new ScheduledTaskVo();
		vo.setSource("spring");
		describe(task.getRunnable(), vo);
		vo.setId("spring:" + vo.getBeanClass() + "#" + vo.getMethod());
		if (task instanceof CronTask cron) {
			vo.setTrigger("cron");
			vo.setExpression(cron.getExpression());
		} else if (task instanceof FixedRateTask rate) {
			vo.setTrigger("fixed-rate");
			vo.setExpression(rate.getIntervalDuration().toString());
		} else if (task instanceof FixedDelayTask delay) {
			vo.setTrigger("fixed-delay");
			vo.setExpression(delay.getIntervalDuration().toString());
		} else if (task instanceof TriggerTask trigger) {
			vo.setTrigger("trigger");
			vo.setExpression(String.valueOf(trigger.getTrigger()));
		} else {
			vo.setTrigger("unknown");
		}
		vo.setNextExecution(scheduled.nextExecution());
		vo.setStatus(vo.getNextExecution() == null ? "disabled" : "scheduled");

		// Last execution, tracked by Spring since 6.2
		final var outcome = task.getLastExecutionOutcome();
		if (outcome != null && outcome.status() != TaskExecutionOutcome.Status.NONE) {
			vo.setLastExecution(outcome.executionTime());
			switch (outcome.status()) {
			case STARTED -> vo.setStatus("running");
			case SUCCESS -> vo.setLastStatus("succeeded");
			case ERROR -> {
				vo.setLastStatus("failed");
				final var throwable = outcome.throwable();
				vo.setLastError(throwable == null ? null
						: StringUtils.defaultIfBlank(throwable.getMessage(), throwable.getClass().getSimpleName()));
			}
			default -> {
				// Nothing to add
			}
			}
		}
		return vo;
	}

	/**
	 * Fill the bean and method from the runnable. Spring wraps the scheduled runnable in an outcome tracking
	 * decorator without accessor, whose {@code toString()} delegates: a scheduled method renders as
	 * <code>fully.qualified.Class.method</code>, a plain runnable with the default <code>Class@hash</code> form.
	 */
	static void describe(final Runnable runnable, final ScheduledTaskVo vo) {
		if (runnable instanceof ScheduledMethodRunnable methodRunnable) {
			final var clazz = ClassUtils.getUserClass(methodRunnable.getTarget());
			setBean(vo, clazz.getName(), methodRunnable.getMethod().getName());
			return;
		}
		final var text = String.valueOf(runnable);
		final var method = METHOD_PATTERN.matcher(text);
		if (method.matches()) {
			setBean(vo, method.group(1), method.group(2));
			return;
		}
		final var object = OBJECT_PATTERN.matcher(text);
		setBean(vo, object.matches() ? object.group(1) : ClassUtils.getUserClass(runnable).getName(), "run");
	}

	private static void setBean(final ScheduledTaskVo vo, final String className, final String method) {
		vo.setBeanClass(className);
		final var simple = className.substring(className.lastIndexOf('.') + 1);
		vo.setBean(simple.substring(simple.lastIndexOf('$') + 1));
		vo.setMethod(method);
	}
}
