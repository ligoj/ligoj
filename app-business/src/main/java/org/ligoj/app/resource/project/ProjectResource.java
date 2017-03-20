package org.ligoj.app.resource.project;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.transaction.Transactional;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.UriInfo;

import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import org.ligoj.bootstrap.core.DescribedBean;
import org.ligoj.bootstrap.core.json.PaginationJson;
import org.ligoj.bootstrap.core.json.TableItem;
import org.ligoj.bootstrap.core.json.datatable.DataTableAttributes;
import org.ligoj.bootstrap.core.resource.BusinessException;
import org.ligoj.bootstrap.core.security.SecurityHelper;
import org.ligoj.bootstrap.core.validation.ValidationJsonException;
import org.ligoj.app.dao.ProjectRepository;
import org.ligoj.app.dao.SubscriptionRepository;
import org.ligoj.app.ldap.resource.UserLdapResource;
import org.ligoj.app.model.Project;
import org.ligoj.app.model.Subscription;
import org.ligoj.app.resource.node.EventVo;
import org.ligoj.app.resource.subscription.SubscriptionResource;

/**
 * {@link Project} resource.
 */
@Path("/project")
@Service
@Transactional
@Produces(MediaType.APPLICATION_JSON)
public class ProjectResource {

	@Autowired
	private ProjectRepository repository;

	@Autowired
	private SecurityHelper securityHelper;

	@Autowired
	private PaginationJson paginationJson;

	@Autowired
	private SubscriptionRepository subscriptionRepository;

	@Autowired
	private SubscriptionResource subscriptionResource;

	/**
	 * Ordered columns.
	 */
	private static final Map<String, String> ORDERED_COLUMNS = new HashMap<>();

	static {
		ORDERED_COLUMNS.put("id", "id");
		ORDERED_COLUMNS.put("description", "description");
		ORDERED_COLUMNS.put("createdDate", "createdDate");
		ORDERED_COLUMNS.put("teamLeader", "teamLeader");

		// This mapping does not works for native spring-data "findAll"
		ORDERED_COLUMNS.put("name", "name");
		ORDERED_COLUMNS.put("nbSubscriptions", "COUNT(s)");
	}

	/**
	 * Converter from {@link Project} to {@link ProjectVo} with the associated subscriptions.
	 * 
	 * @param project
	 *            Entity to convert.
	 * @return The project description with subscriptions.
	 */
	public ProjectVo toVo(final Project project) {
		// Get subscriptions
		final List<Object[]> subscriptionsResultSet = subscriptionRepository.findAllWithValuesSecureByProject(project.getId());
		final boolean manageSubscriptions = null != repository.isManageSubscription(project.getId(), securityHelper.getLogin());

		// Get subscriptions status
		final Map<Integer, EventVo> subscriptionStatus = subscriptionResource.getStatusByProject(project.getId());

		// Convert users, project and subscriptions
		final ProjectVo projectVo = new ToVoConverter(subscriptionsResultSet, subscriptionStatus).apply(project);
		projectVo.setManageSubscriptions(manageSubscriptions);
		return projectVo;
	}

	/**
	 * Converter from {@link Project} to {@link ProjectLightVo} with subscription count.
	 * 
	 * @param resultset
	 *            Entity to convert and the associated subscription count.
	 * @return The project description with subscription counter.
	 */
	public static ProjectLightVo toVoLightCount(final Object[] resultset) { // NOSONAR -- varargs
		final ProjectLightVo vo = toVoLight((Project) resultset[0]);
		vo.setNbSubscriptions(((Long) resultset[1]).intValue());
		return vo;
	}

	/**
	 * Converter from {@link Project} to {@link ProjectLightVo} without subscription count.
	 * 
	 * @param entity
	 *            Entity to convert.
	 * @return The project description without subscription counter.
	 */
	public static ProjectLightVo toVoLight(final Project entity) {

		// Convert users, project and subscriptions
		final ProjectLightVo vo = new ProjectLightVo();
		vo.copyAuditData(entity, UserLdapResource.TO_LDAP_CONVERTER);
		DescribedBean.copy(entity, vo);
		vo.setPkey(entity.getPkey());
		vo.setTeamLeader(UserLdapResource.TO_LDAP_CONVERTER.apply(entity.getTeamLeader()));
		return vo;
	}

	/**
	 * /**
	 * Converter from {@link ProjectEditionVo} to {@link Project}
	 */
	private static Project toEntity(final ProjectEditionVo vo) {
		final Project entity = new Project();
		// map project
		DescribedBean.copy(vo, entity);
		entity.setPkey(vo.getPkey());
		entity.setTeamLeader(vo.getTeamLeader());
		return entity;
	}

	/**
	 * Retrieve all project with pagination, and filtered. A visible project is attached to a visible group.
	 * 
	 * @param uriInfo
	 *            pagination data.
	 * @param criteria
	 *            the optional criteria to match.
	 * @return all elements with pagination.
	 */
	@GET
	public TableItem<ProjectLightVo> findAll(@Context final UriInfo uriInfo, @QueryParam(DataTableAttributes.SEARCH) final String criteria) {
		final Page<Object[]> findAll = repository.findAllLight(securityHelper.getLogin(), StringUtils.trimToNull(criteria),
				paginationJson.getPageRequest(uriInfo, ORDERED_COLUMNS));

		// apply pagination and prevent lazy initialization issue
		return paginationJson.applyPagination(uriInfo, findAll, ProjectResource::toVoLightCount);
	}

	/**
	 * Return a project with all subscription parameters and their status.
	 * 
	 * @param id
	 *            Project identifier.
	 * @return Found element. May not be <tt>null</tt>.
	 */
	@GET
	@Path("{id:\\d+}")
	public ProjectVo findById(@PathParam("id") final int id) {
		return Optional.ofNullable(repository.findOneVisible(id, securityHelper.getLogin())).map(this::toVo)
				.orElseThrow(() -> new ValidationJsonException("id", BusinessException.KEY_UNKNOW_ID, "0", "user", "1", id));
	}

	/**
	 * Return a project with all subscription parameters and their status.
	 * 
	 * @param pkey
	 *            Project pkey.
	 * @return Found element. May not be <tt>null</tt>.
	 */
	@GET
	@Path("{pkey:" + Project.PKEY_PATTERN + "}")
	public ProjectLightVo findByPKey(@PathParam("pkey") final String pkey) {
		return Optional.ofNullable(repository.findByPKey(pkey, securityHelper.getLogin())).map(ProjectResource::toVoLight)
				.orElseThrow(() -> new ValidationJsonException("pkey", BusinessException.KEY_UNKNOW_ID, "0", "project", "1", pkey));
	}

	/**
	 * Create project. Should be protected with RBAC.
	 * 
	 * @param vo
	 *            the object to create.
	 * @return the entity's identifier.
	 */
	@POST
	public int create(final ProjectEditionVo vo) {
		return repository.saveAndFlush(ProjectResource.toEntity(vo)).getId();
	}

	/**
	 * Update project. Should be protected with RBAC.
	 * 
	 * @param vo
	 *            the object to save.
	 */
	@PUT
	public void update(final ProjectEditionVo vo) {
		// pkey can't be updated if there is at least subscription.
		final Project project = repository.findOneExpected(vo.getId());
		final long nbSubscriptions = subscriptionRepository.countByProject(vo.getId());
		if (nbSubscriptions == 0) {
			project.setPkey(vo.getPkey());
		}

		DescribedBean.copy(vo, project);
		project.setTeamLeader(vo.getTeamLeader());
		repository.saveAndFlush(project);
	}

	/**
	 * Delete entity. Should be protected with RBAC.
	 * 
	 * @param id
	 *            the entity identifier.
	 */
	@DELETE
	@Path("{id:\\d+}")
	public void delete(@PathParam("id") final int id) throws Exception {
		for (final Subscription subscription : repository.findOneExpected(id).getSubscriptions()) {
			subscriptionResource.delete(subscription.getId());
		}
		repository.delete(id);
	}
}
