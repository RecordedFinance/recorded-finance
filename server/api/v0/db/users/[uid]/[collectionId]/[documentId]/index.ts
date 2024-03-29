import type { User } from "../../../../../../../database/schemas";
import { apiHandler, dispatchRequests } from "../../../../../../../helpers/apiHandler";
import { BadRequestError } from "../../../../../../../errors/BadRequestError";
import { CollectionReference, DocumentReference } from "../../../../../../../database/references";
import { deleteDocument, setDocument } from "../../../../../../../database/write";
import { fetchDbDoc as getDocument, statsForUser } from "../../../../../../../database/read";
import { isCollectionId, isDataItem, isUserKeys } from "../../../../../../../database/schemas";
import { logger } from "../../../../../../../logger";
import { NotFoundError } from "../../../../../../../errors/NotFoundError";
import { pathSegments } from "../../../../../../../helpers/pathSegments";
import { requireAuth } from "../../../../../../../auth/requireAuth";
import { respondData, respondSuccess } from "../../../../../../../responses";

function collectionRef(user: User, req: APIRequest): CollectionReference | null {
	const { collectionId } = pathSegments(req, "collectionId");
	if (!isCollectionId(collectionId)) return null;

	return new CollectionReference(user, collectionId);
}

function documentRef(user: User, req: APIRequest): DocumentReference | null {
	const { documentId } = pathSegments(req, "documentId");
	const collection = collectionRef(user, req);
	if (!collection) return null;

	return new DocumentReference(collection, documentId);
}

export const GET = apiHandler("GET", async (req, res) => {
	const { documentId } = pathSegments(req, "documentId");
	if (documentId === ".websocket") {
		logger.debug(
			`Received GET request for a document called '.websocket'. Why are we here? It seems likely that the user intended to start a WebSocket session, but by accident they requested the WebSocket document.`
		);
		// We'll proceed, since the unknown document will be considered empty anyhow
	}

	const user = await requireAuth(req, res, true);

	const ref = documentRef(user, req);
	// logger.debug(`Handling GET for document at ${ref?.path ?? "null"}`);
	if (!ref) throw new NotFoundError();

	const doc = await getDocument(ref);
	const data = doc.data;
	// logger.debug(`Found item: ${JSON.stringify(data, undefined, "  ")}`);
	respondData(res, data);
});

export const POST = apiHandler("POST", async (req, res) => {
	const user = await requireAuth(req, res, true);
	const uid = user.uid;

	const ref = documentRef(user, req);
	if (!ref) throw new BadRequestError(); // Unknown collection. The client should know what collections we support.

	const providedData = req.body as unknown;
	if (!isDataItem(providedData) && !isUserKeys(providedData)) throw new BadRequestError();

	await setDocument(ref, providedData);
	const { totalSpace, usedSpace } = await statsForUser(uid);
	respondSuccess(res, { totalSpace, usedSpace });
});

export const DELETE = apiHandler("DELETE", async (req, res) => {
	const user = await requireAuth(req, res, true);
	const uid = user.uid;

	const ref = documentRef(user, req);
	if (!ref) {
		// Unknown collection? Call the document gone!
		const { totalSpace, usedSpace } = await statsForUser(uid);
		return respondSuccess(res, { totalSpace, usedSpace });
	}

	// Delete the referenced database entry
	await deleteDocument(ref);

	const { totalSpace, usedSpace } = await statsForUser(uid);

	respondSuccess(res, { totalSpace, usedSpace });
});

export default dispatchRequests({ GET, DELETE, POST });
