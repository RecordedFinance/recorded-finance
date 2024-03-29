import type { User } from "../../../../../../database/schemas";
import { isCollectionId } from "../../../../../../database/schemas";
import { CollectionReference } from "../../../../../../database/references";
import { apiHandler, dispatchRequests } from "../../../../../../helpers/apiHandler";
import { deleteCollection } from "../../../../../../database/write";
import { fetchDbCollection as getCollection, statsForUser } from "../../../../../../database/read";
import { logger } from "../../../../../../logger";
import { NotFoundError } from "../../../../../../errors/NotFoundError";
import { pathSegments } from "../../../../../../helpers/pathSegments";
import { requireAuth } from "../../../../../../auth/requireAuth";
import { respondData, respondSuccess } from "../../../../../../responses";

function collectionRef(user: User, req: APIRequest): CollectionReference | null {
	const { collectionId } = pathSegments(req, "collectionId");
	if (!isCollectionId(collectionId)) return null;

	return new CollectionReference(user, collectionId);
}

export const GET = apiHandler("GET", async (req, res) => {
	const { collectionId } = pathSegments(req, "collectionId");
	if (collectionId === ".websocket") {
		logger.debug(
			`Received GET request for a collection called '.websocket'. Why are we here? It seems likely that the user intended to start a WebSocket session, but by accident they requested the WebSocket collection.`
		);
		// We'll proceed, since the unknown collection will result in a 404 anyhow
	}

	const user = await requireAuth(req, res, true);
	const ref = collectionRef(user, req);
	if (!ref) throw new NotFoundError();

	const items = await getCollection(ref);
	respondData(res, items);
});

export const DELETE = apiHandler("DELETE", async (req, res) => {
	const user = await requireAuth(req, res, true);
	const uid = user.uid;

	const ref = collectionRef(user, req);
	if (!ref) {
		// Unknown collection? Call it gone!
		const { totalSpace, usedSpace } = await statsForUser(uid);
		return respondSuccess(res, { totalSpace, usedSpace });
	}

	// Delete the referenced database entries
	await deleteCollection(ref);

	const { totalSpace, usedSpace } = await statsForUser(uid);

	respondSuccess(res, { totalSpace, usedSpace });
});

export default dispatchRequests({ GET, DELETE });
