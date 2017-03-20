package org.ligoj.app.resource.plugin;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import javax.persistence.EntityManager;
import javax.transaction.Transactional;
import javax.ws.rs.Path;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import org.ligoj.bootstrap.core.dao.csv.CsvForJpa;
import org.ligoj.bootstrap.model.system.SystemAuthorization;
import org.ligoj.bootstrap.model.system.SystemRole;
import org.ligoj.bootstrap.model.system.SystemRoleAssignment;
import org.ligoj.bootstrap.model.system.SystemUser;
import org.ligoj.app.model.Event;
import org.ligoj.app.model.Node;
import org.ligoj.app.model.Parameter;
import org.ligoj.app.model.ParameterValue;
import org.ligoj.app.model.Project;
import org.ligoj.app.model.Subscription;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;

/**
 * Populate the system data on demand and on start.
 */
@Slf4j
@Service
@Transactional
@Path("system/populate")
public class PopulateResource {

	@Autowired
	private CsvForJpa csvForJpa;

	@Autowired
	private EntityManager em;

	/**
	 * Flag to request the reset when then application is ready.
	 */
	@Value("${jpa.populate:false}")
	@Setter
	@Getter
	private boolean populate;

	/**
	 * Executed on startup.
	 */
	@EventListener(ContextRefreshedEvent.class)
	public void start() throws IOException {
		log.info("Initializing reset on start : " + isPopulate());
		if (populate) {
			// Populate on start is requested.
			reset();
		}
	}

	protected void reset() throws IOException {
		em.createQuery("UPDATE Node n SET n.refined = NULL").executeUpdate();
		csvForJpa.reset("csv/app-populate",
				new Class[] { Node.class, Parameter.class, Project.class, Subscription.class, Event.class, ParameterValue.class },
				StandardCharsets.UTF_8.name());
		csvForJpa.reset("csv/app-populate/system",
				new Class[] { SystemUser.class, SystemRole.class, SystemAuthorization.class, SystemRoleAssignment.class },
				StandardCharsets.UTF_8.name());
	}

}
