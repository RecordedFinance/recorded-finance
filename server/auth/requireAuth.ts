import type { JsonWebTokenError } from "jsonwebtoken";
import type { MFAOption, User } from "../database/schemas.js";
import type { Request, RequestHandler } from "express";
import { assertSchema, jwtPayload } from "../database/schemas.js";
import { asyncWrapper } from "../asyncWrapper.js";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../errors/index.js";
import { blacklistHasJwt, jwtTokenFromRequest, verifyJwt } from "./jwt.js";
import { Context } from "./Context.js";
import { findUserWithProperties } from "../database/io.js";
import { StructError } from "superstruct";

interface Metadata {
	user: User;
	validatedWithMfa: Array<MFAOption>;
}

async function userWithUid(uid: string): Promise<User | null> {
	// Find first user whose UID matches
	return await findUserWithProperties({ uid });
}

/**
 * Retrieves user metadata from the request headers and session cookies in the request.
 */
export async function metadataFromRequest(
	req: Pick<Request, "session" | "headers">
): Promise<Metadata> {
	const token = jwtTokenFromRequest(req);
	if (token === null) {
		console.debug("Request has no JWT");
		throw new UnauthorizedError("missing-token");
	}
	if (blacklistHasJwt(token)) {
		console.debug("Request has a blacklisted JWT");
		throw new UnauthorizedError("expired-token");
	}

	const payload = await verifyJwt(token).catch((error: JsonWebTokenError) => {
		console.debug(`JWT failed to verify because ${error.message}`);
		throw new UnauthorizedError("expired-token");
	});

	try {
		assertSchema(payload, jwtPayload);
	} catch (error) {
		if (error instanceof StructError) {
			console.debug(`JWT payload failed to verify: ${error.message}`);
		} else {
			console.debug(`JWT payload failed to verify: ${JSON.stringify(error)}`);
		}
		throw new BadRequestError("Invalid JWT payload");
	}

	const uid = payload.uid;
	const validatedWithMfa = payload.validatedWithMfa;
	// TODO: If the JWT is more than x minutes old (but not expired), leave validatedWithMfa empty. This would ensure that sensitive operations require the user to re-validate

	// NOTE: We need a full user-fetch here so we know we're working with a real user.
	// You might be tempted to slim this down to just passing the UID through, but don't.
	const user = await userWithUid(uid);
	if (!user) throw new NotFoundError();

	return { user, validatedWithMfa };
}

/** A handler that makes sure the calling user is authorized to access the requested resource. */
export const requireAuth: RequestHandler = asyncWrapper(async (req, res, next) => {
	const metadata = await metadataFromRequest(req);
	const uid = metadata.user.uid;

	Context.bind(req, { uid }); // This reference drops when the request is done
	next();
});
