package org.ligoj.app.resource.project;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import javax.persistence.EntityNotFoundException;
import javax.transaction.Transactional;
import javax.ws.rs.core.UriInfo;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import org.ligoj.bootstrap.core.json.TableItem;
import org.ligoj.bootstrap.core.validation.ValidationJsonException;
import org.ligoj.app.api.NodeVo;
import org.ligoj.app.dao.ProjectRepository;
import org.ligoj.app.ldap.dao.LdapCacheRepository;
import org.ligoj.app.model.DelegateLdap;
import org.ligoj.app.model.DelegateLdapType;
import org.ligoj.app.model.Event;
import org.ligoj.app.model.Node;
import org.ligoj.app.model.Parameter;
import org.ligoj.app.model.ParameterValue;
import org.ligoj.app.model.Project;
import org.ligoj.app.model.Subscription;
import org.ligoj.app.resource.subscription.SubscriptionVo;
import net.sf.ehcache.CacheManager;

/**
 * Test class of {@link ProjectResource}
 */
@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
public class ProjectResourceTest extends org.ligoj.app.AbstractJpaTest {

	@Autowired
	private ProjectResource resource;

	@Autowired
	private ProjectRepository repository;

	private Project testProject;

	@Autowired
	private LdapCacheRepository cache;

	@Before
	public void setUpEntities() throws IOException {
		persistEntities("csv/app-test",
				new Class[] { Node.class, Parameter.class, Project.class, Subscription.class, ParameterValue.class, DelegateLdap.class },
				StandardCharsets.UTF_8.name());
		testProject = repository.findByName("MDA");

		// Ensure LDAP cache is loaded
		CacheManager.getInstance().getCache("ldap").removeAll();
		cache.getLdapData();
		em.flush();
		em.clear();
	}

	@Test
	public void findAll() {
		// create a mock URI info with pagination information
		final UriInfo uriInfo = newFindAllParameters();
		initSpringSecurityContext("fdaugan");
		final TableItem<ProjectLightVo> result = resource.findAll(uriInfo, null);
		Assert.assertEquals(2, result.getData().size());

		final ProjectLightVo project = result.getData().get(0);
		checkProjectMDA(project);

		Assert.assertEquals("gStack", result.getData().get(1).getName());

		// KPI, Build, Bug Tracker, Identity x2, KM
		Assert.assertTrue(result.getData().get(1).getNbSubscriptions() >= 6);
	}

	@Test
	public void findAllNotMemberButDelegateGroupVisible() {
		final DelegateLdap delegateLdap = new DelegateLdap();
		delegateLdap.setType(DelegateLdapType.GROUP);
		delegateLdap.setReceiver("user");
		delegateLdap.setDn("cn=gfi-gstack,ou=gfi,ou=project,dc=sample,dc=com");
		delegateLdap.setName("gfi-gStack");
		em.persist(delegateLdap);
		em.flush();
		em.clear();

		// create a mock URI info with pagination information
		final UriInfo uriInfo = newFindAllParameters();
		initSpringSecurityContext("user");
		final TableItem<ProjectLightVo> result = resource.findAll(uriInfo, "gStack");
		Assert.assertEquals(1, result.getData().size());

		Assert.assertEquals("gStack", result.getData().get(0).getName());

		// KPI, Build, Bug Tracker, Identity x2, KM
		Assert.assertTrue(result.getData().get(0).getNbSubscriptions() >= 6);
	}

	@Test
	public void findAllNotMemberButTreeVisible() {
		// create a mock URI info with pagination information
		final UriInfo uriInfo = newFindAllParameters();

		final TableItem<ProjectLightVo> result = resource.findAll(uriInfo, null);
		Assert.assertEquals(1, result.getData().size());
		Assert.assertEquals("gStack", result.getData().get(0).getName());

		// KPI, Build, Bug Tracker, Identity x2, KM
		Assert.assertTrue(result.getData().get(0).getNbSubscriptions() >= 6);
	}

	@Test
	public void findAllNotVisible() {
		// create a mock URI info with pagination information
		final UriInfo uriInfo = newFindAllParameters();

		initSpringSecurityContext("any");
		final TableItem<ProjectLightVo> result = resource.findAll(uriInfo, "MDA");
		Assert.assertEquals(0, result.getData().size());
	}

	@Test
	public void findAllTeamLeader() {
		// create a mock URI info with pagination information
		final UriInfo uriInfo = newFindAllParameters();

		initSpringSecurityContext("fdaugan");
		final TableItem<ProjectLightVo> result = resource.findAll(uriInfo, "mdA");
		Assert.assertEquals(1, result.getData().size());

		final ProjectLightVo project = result.getData().get(0);
		checkProjectMDA(project);
	}

	@Test
	public void findAllMember() {
		// create a mock URI info with pagination information
		final UriInfo uriInfo = newFindAllParameters();

		initSpringSecurityContext("alongchu");
		final TableItem<ProjectLightVo> result = resource.findAll(uriInfo, "gStack");
		Assert.assertEquals(1, result.getData().size());

		final ProjectLightVo project = result.getData().get(0);
		Assert.assertEquals("gStack", project.getName());
	}

	private void checkProjectMDA(final ProjectLightVo project) {
		Assert.assertEquals("MDA", project.getName());
		Assert.assertEquals("Model Driven Architecture implementation of Gfi", project.getDescription());
		Assert.assertEquals("mda", project.getPkey());
		Assert.assertNotNull(project.getCreatedDate());
		Assert.assertNotNull(project.getLastModifiedDate());
		Assert.assertEquals(DEFAULT_USER, project.getCreatedBy().getId());
		Assert.assertEquals(DEFAULT_USER, project.getLastModifiedBy().getId());
		Assert.assertEquals(1, project.getNbSubscriptions());
		Assert.assertEquals("fdaugan", project.getTeamLeader().getId());
	}

	private UriInfo newFindAllParameters() {
		final UriInfo uriInfo = newUriInfo();
		uriInfo.getQueryParameters().add("draw", "1");
		uriInfo.getQueryParameters().add("length", "10");
		uriInfo.getQueryParameters().add("columns[0][data]", "name");
		uriInfo.getQueryParameters().add("order[0][column]", "0");
		uriInfo.getQueryParameters().add("order[0][dir]", "desc");
		return uriInfo;
	}

	/**
	 * test {@link ProjectResource#findById(int)}
	 */
	@Test(expected = ValidationJsonException.class)
	public void findByIdInvalid() {
		initSpringSecurityContext("alongchu");
		Assert.assertNull(resource.findById(0));
	}

	/**
	 * test {@link ProjectResource#findById(int)}
	 */
	@Test(expected = ValidationJsonException.class)
	public void findByIdNotVisible() {
		final Project byName = repository.findByName("gStack");
		initSpringSecurityContext("any");
		final ProjectVo project = resource.findById(byName.getId());
		Assert.assertNull(project);
	}

	/**
	 * test {@link ProjectResource#findById(int)}
	 */
	@Test(expected = ValidationJsonException.class)
	public void findByIdVisibleSinceAdmin() {
		initSpringSecurityContext("admin");
		final Project byName = repository.findByName("gStack");
		final ProjectVo project = resource.findById(byName.getId());
		Assert.assertNull(project);
	}

	/**
	 * test {@link ProjectResource#findById(int)}
	 */
	@Test
	public void findByIdWithSubscription() throws IOException {
		final Project byName = repository.findByName("gStack");
		persistEntities("csv/app-test", new Class[] { Event.class }, StandardCharsets.UTF_8.name());

		initSpringSecurityContext("alongchu");
		final ProjectVo project = resource.findById(byName.getId());

		// Check subscription
		Assert.assertTrue(project.getSubscriptions().size() >= 6);
		for (final SubscriptionVo subscription : project.getSubscriptions()) {
			if (subscription.getStatus() != null) {
				return;
			}
		}
		Assert.fail("Subscriptions status was expected.");
	}

	/**
	 * test {@link ProjectResource#findById(int)}
	 */
	@Test
	public void findById() {
		initSpringSecurityContext("fdaugan");
		checkProject(resource.findById(testProject.getId()));
	}

	/**
	 * test {@link ProjectResource#findById(int)}
	 */
	@Test
	public void findByPKey() {
		initSpringSecurityContext("fdaugan");
		checkProject(resource.findByPKey("mda"));
	}

	private void checkProject(final BasicProjectVo project) {
		Assert.assertEquals("MDA", project.getName());
		Assert.assertEquals(testProject.getId(), project.getId());
		Assert.assertEquals("Model Driven Architecture implementation of Gfi", project.getDescription());
		Assert.assertNotNull(project.getCreatedDate());
		Assert.assertNotNull(project.getLastModifiedDate());
		Assert.assertEquals(DEFAULT_USER, project.getCreatedBy().getId());
		Assert.assertEquals(DEFAULT_USER, project.getLastModifiedBy().getId());
		Assert.assertEquals("mda", project.getPkey());
		Assert.assertEquals("fdaugan", project.getTeamLeader().getId());
	}

	private void checkProject(final ProjectVo project) {
		checkProject((BasicProjectVo) project);
		Assert.assertTrue(project.isManageSubscriptions());

		// Check subscription
		Assert.assertEquals(1, project.getSubscriptions().size());
		final SubscriptionVo subscription = project.getSubscriptions().iterator().next();
		Assert.assertNotNull(subscription.getCreatedDate());
		Assert.assertNotNull(subscription.getLastModifiedDate());
		Assert.assertNotNull(subscription.getId());
		Assert.assertEquals(DEFAULT_USER, subscription.getCreatedBy().getId());
		Assert.assertEquals(DEFAULT_USER, subscription.getLastModifiedBy().getId());

		// Check service (ordered by id)
		final NodeVo service = subscription.getNode();
		Assert.assertNotNull(service);
		Assert.assertEquals("JIRA 4", service.getName());
		Assert.assertNotNull(service.getId());
		Assert.assertEquals("Instance JIRA 4", service.getDescription());
		Assert.assertEquals("service:bt:jira", service.getRefined().getId());
		Assert.assertEquals("service:bt", service.getRefined().getRefined().getId());
		Assert.assertNull(service.getRefined().getRefined().getRefined());

		// Check subscription values
		Assert.assertEquals(3, subscription.getParameters().size());
		Assert.assertEquals("http://localhost:8120", subscription.getParameters().get("service:bt:jira:url"));
		Assert.assertEquals(10074, ((Integer) subscription.getParameters().get("service:bt:jira:project")).intValue());
		Assert.assertEquals("MDA", subscription.getParameters().get("service:bt:jira:pkey"));
	}

	/**
	 * test create
	 */
	@Test
	public void create() {
		final ProjectEditionVo vo = new ProjectEditionVo();
		vo.setName("Name");
		vo.setDescription("Description");
		vo.setPkey("artifact-id");
		vo.setTeamLeader(DEFAULT_USER);
		final int id = resource.create(vo);
		em.flush();
		em.clear();

		final Project entity = repository.findOneExpected(id);
		Assert.assertEquals("Name", entity.getName());
		Assert.assertEquals("Description", entity.getDescription());
		Assert.assertEquals("artifact-id", entity.getPkey());
		Assert.assertEquals(DEFAULT_USER, entity.getTeamLeader());
	}

	/**
	 * test update
	 */
	@Test
	public void updateWithSubscriptions() {
		final ProjectEditionVo vo = new ProjectEditionVo();
		vo.setId(testProject.getId());
		vo.setName("Name");
		vo.setDescription("Description");
		vo.setPkey("artifact-id");
		vo.setTeamLeader(DEFAULT_USER);
		resource.update(vo);
		em.flush();
		em.clear();

		final Project projFromDB = repository.findOne(testProject.getId());
		Assert.assertEquals("Name", projFromDB.getName());
		Assert.assertEquals("Description", projFromDB.getDescription());
		Assert.assertEquals("mda", projFromDB.getPkey());
		Assert.assertEquals(DEFAULT_USER, projFromDB.getTeamLeader());
	}

	/**
	 * test update
	 */
	@Test
	public void update() {
		create();
		final Project project = repository.findByName("Name");
		final ProjectEditionVo vo = new ProjectEditionVo();
		vo.setId(project.getId());
		vo.setName("Name");
		vo.setDescription("Description");
		vo.setPkey("artifact-id");
		vo.setTeamLeader(DEFAULT_USER);
		resource.update(vo);
		em.flush();
		em.clear();

		final Project projFromDB = repository.findOne(project.getId());
		Assert.assertEquals("Name", projFromDB.getName());
		Assert.assertEquals("Description", projFromDB.getDescription());
		Assert.assertEquals("artifact-id", projFromDB.getPkey());
		Assert.assertEquals(DEFAULT_USER, projFromDB.getTeamLeader());
	}

	/**
	 * test update
	 */
	@Test(expected = EntityNotFoundException.class)
	public void deleteNotVisible() throws Exception {
		em.clear();
		initSpringSecurityContext("mlavoine");
		resource.delete(testProject.getId());
	}

	@Test
	public void delete() throws Exception {
		final long initCount = repository.count();
		em.clear();
		initSpringSecurityContext("fdaugan");
		resource.delete(testProject.getId());
		em.flush();
		em.clear();
		Assert.assertEquals(initCount - 1, repository.count());
	}
}
