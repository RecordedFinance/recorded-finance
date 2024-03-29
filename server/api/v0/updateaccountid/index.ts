import { apiHandler, dispatchRequests } from "../../../helpers/apiHandler";
import { BadRequestError } from "../../../errors/BadRequestError";
import { compare } from "../../../auth/generators";
import { generateTOTPSecretURI, verifyTOTP } from "../../../auth/totp";
import { is, optional, type } from "superstruct";
import { respondSuccess } from "../../../responses";
import { nonemptyLargeString, nonemptyString, totpToken } from "../../../database/schemas";
import { UnauthorizedError } from "../../../errors/UnauthorizedError";
import { upsertUser } from "../../../database/write";
import { userWithAccountId } from "../../../database/read";

export const POST = apiHandler("POST", async (req, res) => {
	const reqBody = type({
		account: nonemptyString,
		newaccount: nonemptyString,
		password: nonemptyLargeString,
		token: optional(totpToken),
	});

	if (!is(req.body, reqBody)) {
		throw new BadRequestError("Improper parameter types");
	}

	// Ask for full credentials, so we aren't leaning on a repeatable token
	const givenAccountId = req.body.account; // TODO: Get this from auth state instead
	const newGivenAccountId = req.body.newaccount;
	const givenPassword = req.body.password;

	// ** Get credentials
	const storedUser = await userWithAccountId(givenAccountId);
	if (!storedUser) {
		throw new UnauthorizedError("wrong-credentials");
	}

	// ** Verify old credentials
	const isPasswordGood = await compare(givenPassword, storedUser.passwordHash);
	if (!isPasswordGood) {
		throw new UnauthorizedError("wrong-credentials");
	}

	// ** Verify MFA
	if (
		typeof storedUser.totpSeed === "string" &&
		storedUser.requiredAddtlAuth?.includes("totp") === true
	) {
		// TOTP is required
		const token = req.body.token;

		if (typeof token !== "string" || token === "")
			throw new UnauthorizedError("missing-mfa-credentials");

		const secret = generateTOTPSecretURI(storedUser.currentAccountId, storedUser.totpSeed);
		const isValid = verifyTOTP(token, secret);
		if (!isValid) throw new UnauthorizedError("wrong-mfa-credentials");
	}

	// ** Store new credentials
	await upsertUser({
		currentAccountId: newGivenAccountId,
		mfaRecoverySeed: storedUser.mfaRecoverySeed ?? null,
		passwordHash: storedUser.passwordHash,
		passwordSalt: storedUser.passwordSalt,
		pubnubCipherKey: storedUser.pubnubCipherKey,
		requiredAddtlAuth: storedUser.requiredAddtlAuth ?? [],
		totpSeed: storedUser.totpSeed ?? null,
		uid: storedUser.uid,
	});

	// TODO: Invalidate the old jwt, send a new one
	respondSuccess(res);
});

export default dispatchRequests({ POST });
