package org.ligoj.app.resource.node;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import javax.transaction.Transactional;
import javax.ws.rs.NotFoundException;
import javax.ws.rs.core.UriInfo;

import org.apache.cxf.jaxrs.impl.MetadataMap;
import org.junit.Assert;
import org.junit.Before;
import org.junit.FixMethodOrder;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.MethodSorters;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import org.ligoj.bootstrap.AbstractJpaTest;
import org.ligoj.bootstrap.core.json.TableItem;
import org.ligoj.app.dao.DelegateNodeRepository;
import org.ligoj.app.model.DelegateNode;
import org.ligoj.app.model.Node;
import org.ligoj.app.model.Parameter;
import org.ligoj.app.model.ParameterValue;
import org.ligoj.app.model.Project;
import org.ligoj.app.model.ReceiverType;
import org.ligoj.app.model.Subscription;

/**
 * Test class of {@link DelegateNodeResource}
 */
@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration(locations = "classpath:/META-INF/spring/application-context-test.xml")
@Rollback
@Transactional
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
public class DelegateNodeResourceTest extends AbstractJpaTest {

	@Autowired
	private DelegateNodeRepository repository;

	@Autowired
	private DelegateNodeResource resource;

	@Before
	public void prepare() throws IOException {
		persistEntities("csv/app-test",
				new Class[] { Node.class, Parameter.class, Project.class, Subscription.class, ParameterValue.class, DelegateNode.class },
				StandardCharsets.UTF_8.name());
	}

	@Test(expected = NotFoundException.class)
	public void createNotExistsUser() {
		initSpringSecurityContext("any");
		final DelegateNode delegate = new DelegateNode();
		delegate.setNode("service");
		delegate.setReceiver("user1");
		resource.create(delegate);
	}

	@Test(expected = NotFoundException.class)
	public void createNoRightAtThisLevel() {
		initSpringSecurityContext("user1");
		final DelegateNode delegate = new DelegateNode();
		delegate.setNode("service:build");
		delegate.setReceiver("user1");
		resource.create(delegate);
	}

	@Test(expected = NotFoundException.class)
	public void createNoRightAtThisLevel2() {
		initSpringSecurityContext("user1");
		final DelegateNode delegate = new DelegateNode();
		delegate.setNode("");
		delegate.setReceiver("user1");
		resource.create(delegate);
	}

	@Test
	public void createExactNode() {
		initSpringSecurityContext("user1");
		final DelegateNode delegate = new DelegateNode();
		delegate.setNode("service:build:jenkins");
		delegate.setReceiver("user1");
		org.junit.Assert.assertTrue(resource.create(delegate) > 0);
	}

	@Test
	public void createSubNode() {
		initSpringSecurityContext("user1");
		final DelegateNode delegate = new DelegateNode();
		delegate.setNode("service:build:jenkins:dig");
		delegate.setReceiver("user1");
		org.junit.Assert.assertTrue(resource.create(delegate) > 0);
	}

	@Test
	public void createSubNodeMaxiRight() {
		initSpringSecurityContext("user1");
		final DelegateNode delegate = new DelegateNode();
		delegate.setNode("service:build:jenkins:dig");
		delegate.setCanAdmin(true);
		delegate.setCanWrite(true);
		delegate.setCanSubscribe(true);
		delegate.setReceiver("user1");
		Assert.assertTrue(resource.create(delegate) > 0);
	}

	@Test(expected = NotFoundException.class)
	public void createWriteNotAdmin() {

		// Add a special right on for a node
		final DelegateNode delegate = new DelegateNode();
		delegate.setNode("service:build:jenkins");
		delegate.setReceiver("user2");
		delegate.setCanWrite(true);
		repository.saveAndFlush(delegate);

		initSpringSecurityContext("user2");
		final DelegateNode newDelegate = new DelegateNode();
		newDelegate.setNode("service:build:jenkins:dig");
		newDelegate.setReceiver("user2");
		resource.create(newDelegate);
	}

	@Test(expected = javax.ws.rs.NotFoundException.class)
	public void createGrantRefused() {

		// Add a special right on for a node
		final DelegateNode delegate = new DelegateNode();
		delegate.setNode("service:build:jenkins");
		delegate.setReceiver("user2");
		delegate.setCanAdmin(true);
		repository.saveAndFlush(delegate);

		initSpringSecurityContext("user2");
		final DelegateNode newDelegate = new DelegateNode();
		newDelegate.setNode("service:build:jenkins:dig");
		newDelegate.setReceiver("user2");
		newDelegate.setCanWrite(true);
		resource.create(newDelegate);
	}

	@Test
	public void createSubNodeMiniRight() {

		// Add a special right on for a node
		final DelegateNode delegate = new DelegateNode();
		delegate.setNode("service:build:jenkins");
		delegate.setReceiver("user2");
		delegate.setCanAdmin(true);
		repository.saveAndFlush(delegate);

		initSpringSecurityContext("user2");
		final DelegateNode newDelegate = new DelegateNode();
		newDelegate.setNode("service:build:jenkins:dig");
		newDelegate.setReceiver("user2");
		newDelegate.setCanAdmin(true);
		Assert.assertTrue(resource.create(newDelegate) > 0);
	}

	@Test
	public void updateNoChange() {

		// Add a special right on for a node
		final DelegateNode delegate = new DelegateNode();
		delegate.setNode("service:build:jenkins");
		delegate.setReceiver("user2");
		delegate.setCanAdmin(true);
		repository.saveAndFlush(delegate);

		initSpringSecurityContext("user2");
		final DelegateNode newDelegate = new DelegateNode();
		newDelegate.setNode("service:build:jenkins");
		newDelegate.setReceiver("user2");
		newDelegate.setCanAdmin(true);
		resource.update(newDelegate);
	}

	@Test
	public void updateSubNodeReduceRight() {

		// Add a special right on for a node
		final DelegateNode delegate = new DelegateNode();
		delegate.setNode("service:build:jenkins");
		delegate.setReceiver("user2");
		delegate.setCanAdmin(true);
		repository.saveAndFlush(delegate);

		initSpringSecurityContext("user2");
		final DelegateNode newDelegate = new DelegateNode();
		newDelegate.setNode("service:build:jenkins");
		newDelegate.setReceiver("user2");
		resource.update(newDelegate);
	}

	@Test
	public void deleteSubNode() {
		final int user1Delegate = repository.findBy("receiver", "user1").getId();
		resource.delete(user1Delegate);
		Assert.assertFalse(repository.exists(user1Delegate));
	}

	@Test
	public void deleteSameLevel() {
		final int user1Delegate = repository.findBy("receiver", "fdaugan").getId();
		resource.delete(user1Delegate);
		Assert.assertFalse(repository.exists(user1Delegate));
	}

	@Test(expected = NotFoundException.class)
	public void deleteNotRight() {
		final int user1Delegate = repository.findBy("receiver", "junit").getId();

		initSpringSecurityContext("user1");
		resource.delete(user1Delegate);
	}

	@Test
	public void findAllCriteriaUser() {
		final TableItem<DelegateNode> items = resource.findAll(newUriInfo(), "junit");
		Assert.assertEquals(1, items.getData().size());
		Assert.assertEquals(1, items.getRecordsFiltered());
		Assert.assertEquals(1, items.getRecordsTotal());
		final DelegateNode delegateNode = items.getData().get(0);
		Assert.assertEquals("junit", delegateNode.getReceiver());
		Assert.assertEquals(ReceiverType.USER, delegateNode.getReceiverType());
		Assert.assertEquals("service", delegateNode.getName());
		Assert.assertTrue(delegateNode.isCanAdmin());
		Assert.assertTrue(delegateNode.isCanWrite());
		Assert.assertTrue(delegateNode.isCanSubscribe());
	}

	@Test
	public void findAllCriteriaNode() {
		final TableItem<DelegateNode> items = resource.findAll(newUriInfo(), "jenkins");
		Assert.assertEquals(1, items.getData().size());
		Assert.assertEquals(1, items.getRecordsFiltered());
		Assert.assertEquals(1, items.getRecordsTotal());
		final DelegateNode delegateNode = items.getData().get(0);
		Assert.assertEquals("user1", delegateNode.getReceiver());
		Assert.assertEquals(ReceiverType.USER, delegateNode.getReceiverType());
		Assert.assertEquals("service:build:jenkins", delegateNode.getName());
		Assert.assertTrue(delegateNode.isCanAdmin());
		Assert.assertTrue(delegateNode.isCanWrite());
		Assert.assertTrue(delegateNode.isCanSubscribe());
	}

	@Test
	public void findAllNoCriteriaOrder() {
		final UriInfo uriInfo = Mockito.mock(UriInfo.class);
		Mockito.when(uriInfo.getQueryParameters()).thenReturn(new MetadataMap<>());
		uriInfo.getQueryParameters().add("draw", "1");
		uriInfo.getQueryParameters().add("start", "0");
		uriInfo.getQueryParameters().add("length", "10");
		uriInfo.getQueryParameters().add("columns[0][data]", "receiver");
		uriInfo.getQueryParameters().add("order[0][column]", "0");
		uriInfo.getQueryParameters().add("order[0][dir]", "desc");

		final TableItem<DelegateNode> items = resource.findAll(uriInfo, " ");
		Assert.assertEquals(3, items.getData().size());
		Assert.assertEquals(3, items.getRecordsFiltered());
		Assert.assertEquals(3, items.getRecordsTotal());
		final DelegateNode delegateNode = items.getData().get(1);
		Assert.assertEquals("junit", delegateNode.getReceiver());
		Assert.assertEquals(ReceiverType.USER, delegateNode.getReceiverType());
		Assert.assertEquals("service", delegateNode.getName());
		Assert.assertTrue(delegateNode.isCanAdmin());
		Assert.assertTrue(delegateNode.isCanWrite());
		Assert.assertTrue(delegateNode.isCanSubscribe());
	}

}
