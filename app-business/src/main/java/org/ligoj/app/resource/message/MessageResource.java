package org.ligoj.app.resource.message;

import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.function.BiFunction;
import java.util.function.Function;

import javax.transaction.Transactional;
import javax.ws.rs.DELETE;
import javax.ws.rs.ForbiddenException;
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

import org.ligoj.app.dao.MessageReadRepository;
import org.ligoj.app.dao.MessageRepository;
import org.ligoj.app.iam.IUserRepository;
import org.ligoj.app.iam.IamProvider;
import org.ligoj.app.model.Message;
import org.ligoj.app.model.MessageRead;
import org.ligoj.app.model.MessageTargetType;
import org.ligoj.app.plugin.id.resource.CompanyResource;
import org.ligoj.app.plugin.id.resource.GroupLdapResource;
import org.ligoj.app.plugin.id.resource.UserLdapResource;
import org.ligoj.app.resource.node.NodeResource;
import org.ligoj.app.resource.project.BasicProjectVo;
import org.ligoj.app.resource.project.ProjectResource;
import org.ligoj.bootstrap.core.AuditedBean;
import org.ligoj.bootstrap.core.INamableBean;
import org.ligoj.bootstrap.core.json.PaginationJson;
import org.ligoj.bootstrap.core.json.TableItem;
import org.ligoj.bootstrap.core.json.datatable.DataTableAttributes;
import org.ligoj.bootstrap.core.resource.BusinessException;
import org.ligoj.bootstrap.core.security.SecurityHelper;
import org.ligoj.bootstrap.core.validation.ValidationJsonException;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

/**
 * {@link Message} resource.
 */
@Path("/message")
@Service
@Slf4j
@Transactional
@Produces(MediaType.APPLICATION_JSON)
public class MessageResource implements InitializingBean {

	@Autowired
	private MessageRepository repository;

	@Autowired
	private SecurityHelper securityHelper;

	@Autowired
	private PaginationJson paginationJson;

	@Autowired
	private IamProvider iamProvider;

	@Autowired
	private UserLdapResource userLdapResource;

	@Autowired
	private CompanyResource companyLdapResource;

	@Autowired
	private ProjectResource projectResource;

	@Autowired
	private NodeResource nodeResource;

	@Autowired
	private GroupLdapResource groupLdapResource;

	@Autowired
	private MessageReadRepository messageReadRepository;

	/**
	 * Configuration of checker function for a given {@link MessageTargetType}
	 */
	private Map<MessageTargetType, Function<String, INamableBean<?>>> checker = new EnumMap<>(MessageTargetType.class);

	/**
	 * Ordered columns.
	 */
	protected static final Map<String, String> ORM_MAPPING = new HashMap<>();

	static {
		ORM_MAPPING.put("createdDate", "createdDate");
		ORM_MAPPING.put("value", "value");
		ORM_MAPPING.put("target", "target");
		ORM_MAPPING.put("targetType", "targetType");
		ORM_MAPPING.put("id", "id");
	}

	/**
	 * Delete a {@link Message} from its identifier.
	 *
	 * @param id
	 *            Message's identifier.
	 */
	@DELETE
	@Path("{id}")
	public void delete(@PathParam("id") final int id) {

		// Force the user cache to be loaded
		getUser().findAll();

		repository.findAll(securityHelper.getLogin(), null, new PageRequest(0, 20));
		if (repository.deleteVisible(id, securityHelper.getLogin()) != 1) {
			// Message not found or not visible. Whatever, return an exception
			throw new ValidationJsonException("id", BusinessException.KEY_UNKNOW_ID, "0", "message", "1", id);
		}
	}

	/**
	 * Update the message
	 *
	 * @param message
	 *            The message to save.
	 */
	@PUT
	public void update(final Message message) {
		saveOrUpdate(message);
	}

	/**
	 * Create a new message.
	 *
	 * @param message
	 *            The message to save.
	 * @return The identifier of created message.
	 */
	@POST
	public int create(final Message message) {
		return saveOrUpdate(message).getId();
	}

	/**
	 * Save or update a message. All properties are checked.
	 *
	 * @param message
	 *            The message to create or update.
	 * @return The current or new identifier.
	 */
	private Message saveOrUpdate(final Message message) {
		// Check the target and normalize it
		message.setTarget(checkRights(message.getTargetType(), message.getTarget()));

		// Basic XSS protection
		if (!message.getValue().replaceAll("(<\\s*script|(src|href)\\s*=\\s*['\"](//|[^'\"]+:))", "").equals(message.getValue())) {
			// XSS attempt, report it
			log.warn("XSS attempt from {} with message {}", securityHelper.getLogin(), message.getValue());
			throw new ForbiddenException();
		}

		// Target is valid, persist the message
		return repository.saveAndFlush(message);
	}

	/**
	 * Check the current user can perform an update or a creation on the given configuration.
	 *
	 * @param targetType
	 *            The message type.
	 * @param target
	 *            The target configuration : group, node, ...
	 * @return The normalized and validated target.
	 */
	private String checkRights(final MessageTargetType targetType, final String target) {
		// Force the user cache to be loaded
		getUser().findAll();

		// Check and normalize
		final INamableBean<?> targetEntity = checker.get(targetType).apply(target);
		return targetEntity instanceof BasicProjectVo ? ((BasicProjectVo) targetEntity).getPkey() : (String) targetEntity.getId();
	}

	/**
	 * Return all messages the given user could have written, and by criteria. The main difference with the function
	 * {@link #findMy(String, UriInfo)} is the messages returned includes the one the given user is not
	 * involved, or targeted.
	 * For sample, with this function, a user can see all messages from a group because this group is visible by this
	 * user.
	 * But with the other function {@link #findMy(String, UriInfo)} these messages will be returned
	 * because this user is not member of this group.
	 *
	 * @param criteria
	 *            The optional criteria to match : message content or target type, or target.
	 * @param uriInfo
	 *            filter data.
	 * @return Related messages, already read or not. Also there is an indicator on the message specifying the "new"
	 *         state.
	 */
	@GET
	public TableItem<MessageVo> findAll(@QueryParam(DataTableAttributes.SEARCH) final String criteria, @Context final UriInfo uriInfo) {
		return findAllProvider(uriInfo, (user, pageRequest) -> repository.findAll(user, criteria, pageRequest));
	}

	/**
	 * Return the amount of users targeted by the given configuration.
	 *
	 * @param targetType
	 *            The message type.
	 * @param target
	 *            The target configuration : group, node, ...
	 * @return The amount of users targeted by the given configuration.
	 */
	@GET
	@Path("audience/{targetType}/{target}")
	public int audience(@PathParam("targetType") final MessageTargetType targetType, @PathParam("target") final String target) {
		return repository.audience(targetType.name(), checkRights(targetType, target));
	}

	/**
	 * Return messages related to current user. Also update at the same time the cursor indicating the read messages.
	 *
	 * @param criteria
	 *            The optional criteria to match : message content or target type, or target.
	 * @param uriInfo
	 *            filter data.
	 * @return Related messages, already read or not. Also there is an indicator on the message specifying the "new"
	 *         state.
	 */
	@GET
	@Path("my")
	public TableItem<MessageVo> findMy(@QueryParam(DataTableAttributes.SEARCH) final String criteria, @Context final UriInfo uriInfo) {
		return findAllProvider(uriInfo, (user, pageRequest) -> repository.findMy(user, criteria, pageRequest));
	}

	/**
	 * Return messages related to current user. Also update at the same time the cursor indicating the read messages.
	 *
	 * @param uriInfo
	 *            filter data.
	 * @param function
	 *            Function providing the messages from a request and a user.
	 * @return Related messages, already read or not. Also there is an indicator on the message specifying the "new"
	 *         state.
	 */
	private TableItem<MessageVo> findAllProvider(final UriInfo uriInfo, final BiFunction<String, PageRequest, Page<Message>> function) {

		// Force the user cache to be loaded
		getUser().findAll();

		// Then query the messages
		final TableItem<MessageVo> messages = paginationJson.applyPagination(uriInfo,
				function.apply(securityHelper.getLogin(), paginationJson.getPageRequest(uriInfo, ORM_MAPPING, Collections.singleton("id"))), m -> {
					final MessageVo vo = new MessageVo();
					AuditedBean.copyAuditData(m, vo);
					vo.setId(m.getId());
					vo.setValue(m.getValue());
					vo.setTargetType(m.getTargetType());
					vo.setTarget(m.getTarget());

					// Get the details of the target
					fillTarget(m, vo);

					// Attach user information of the source of the message
					vo.setFrom(getUser().toUser(m.getCreatedBy()));
					return vo;
				});

		// Then update the read messages indicator
		final MessageRead messageRead = Optional.ofNullable(messageReadRepository.findOne(securityHelper.getLogin())).orElseGet(() -> {
			// First access
			final MessageRead m = new MessageRead();
			m.setId(securityHelper.getLogin());
			return m;
		});
		messageRead.setMessageId(Integer.max(messages.getData().stream().filter(m -> m.getId() > messageRead.getMessageId()).map(m -> {
			// Then update the unread state of new messages
			m.setUnread(true);
			return m.getId();
		}).max(Comparator.naturalOrder()).orElse(0), messageRead.getMessageId()));

		// Persist the state even if the user might has not read/seen the message
		messageReadRepository.save(messageRead);
		return messages;
	}

	/**
	 * Complete the target object depending on the target type of the given message.
	 */
	private void fillTarget(final Message message, final MessageVo vo) {
		switch (message.getTargetType()) {
		case PROJECT:
			vo.setProject(projectResource.findByPKey(message.getTarget()));
			break;
		case COMPANY:
			vo.setCompany(companyLdapResource.findByName(message.getTarget()));
			break;
		case GROUP:
			vo.setGroup(groupLdapResource.findByName(message.getTarget()));
			break;
		case NODE:
			vo.setNode(nodeResource.findByIdInternal(message.getTarget()));
			break;
		case USER:
		default:
			vo.setUser(getUser().toUser(message.getTarget()));
		}
	}

	/**
	 * Return amount of unread messages related to current user.
	 *
	 * @return Amount of unread messages related to current user.
	 */
	@GET
	@Path("count")
	public int countUnread() {

		// Force the user cache to be loaded
		getUser().findAll();

		return repository.countUnread(securityHelper.getLogin());
	}

	@Override
	public void afterPropertiesSet() throws Exception {
		checker.put(MessageTargetType.COMPANY, companyLdapResource::findByIdExpected);
		checker.put(MessageTargetType.GROUP, groupLdapResource::findByIdExpected);
		checker.put(MessageTargetType.PROJECT, projectResource::findByPKey);
		checker.put(MessageTargetType.NODE, nodeResource::findByIdExpected);
		checker.put(MessageTargetType.USER, userLdapResource::findById);
	}

	/**
	 * User repository provider.
	 *
	 * @return User repository provider.
	 */
	private IUserRepository getUser() {
		return iamProvider.getConfiguration().getUserRepository();
	}

}
