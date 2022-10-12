import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiHandler } from "../../../../helpers/apiHandler";
import {
	BadMethodError,
	BadRequestError,
	ConflictError,
	UnauthorizedError,
} from "../../../../errors";
import { compare, generateSecureToken } from "../../../../auth/generators";
import { generateTOTPSecretURI, verifyTOTP } from "../../../../auth/totp";
import { is, nonempty, string, type } from "superstruct";
import { metadataFromRequest } from "../../../../auth/requireAuth";
import { respondError, respondSuccess } from "../../../../responses";
import { upsertUser } from "../../../../database/io";

// MARK: - GET

export const GET = apiHandler("GET", async (req, res) => {
	// ** TOTP Registration

	const { user, validatedWithMfa } = await metadataFromRequest(req, res);
	const uid = user.uid;
	const accountId = user.currentAccountId;

	if (validatedWithMfa.includes("totp") || user.requiredAddtlAuth?.includes("totp") === true) {
		// We definitely have a secret, the user used it to get here!
		// Or the user already has TOTP enabled.
		// Either way, we should not regenerate the token. Throw a 409:
		throw new ConflictError("totp-conflict", "You already have TOTP authentication enabled");
	}

	// Generate and store the new secret
	const totpSeed = generateSecureToken(15);
	const secret = generateTOTPSecretURI(accountId, totpSeed);

	// We should not lock in the secret until the user hits /totp/validate with that secret.
	// Just set the secret, not the 2fa requirement
	await upsertUser({
		currentAccountId: accountId,
		mfaRecoverySeed: user.mfaRecoverySeed ?? null,
		passwordHash: user.passwordHash,
		passwordSalt: user.passwordSalt,
		pubnubCipherKey: user.pubnubCipherKey,
		requiredAddtlAuth: [], // TODO: Leave other 2FA alone
		totpSeed,
		uid,
	});

	respondSuccess(res, { secret });
});

// MARK: - DELETE

export const DELETE = apiHandler("DELETE", async (req, res) => {
	const reqBody = type({
		password: nonempty(string()),
		token: nonempty(string()),
	});
	if (!is(req.body, reqBody)) {
		throw new BadRequestError("Improper parameter types");
	}

	// ** TOTP Un-registration

	const { user /* validatedWithMfa */ } = await metadataFromRequest(req, res);
	const uid = user.uid;
	const accountId = user.currentAccountId;

	const givenPassword = req.body.password;
	const token = req.body.token;

	// If the user has no secret, treat the secret as deleted and return 200
	if (user.totpSeed === null || user.totpSeed === undefined || !user.totpSeed) {
		respondSuccess(res);
		return;
	}
	const secret = generateTOTPSecretURI(user.currentAccountId, user.totpSeed);

	// Validate the user's passphrase
	const isPasswordGood = await compare(givenPassword, user.passwordHash);
	if (!isPasswordGood) {
		throw new UnauthorizedError("wrong-credentials");
	}

	// Re-validate TOTP
	const isCodeGood = verifyTOTP(token, secret);
	if (isCodeGood) {
		respondSuccess(res);
	} else {
		throw new UnauthorizedError("wrong-mfa-credentials");
	}

	// Delete the secret and disable 2FA
	await upsertUser({
		currentAccountId: accountId,
		mfaRecoverySeed: user.mfaRecoverySeed ?? null,
		passwordHash: user.passwordHash,
		passwordSalt: user.passwordSalt,
		pubnubCipherKey: user.pubnubCipherKey,
		requiredAddtlAuth: [], // TODO: Leave other 2FA alone
		totpSeed: null,
		uid,
	});

	// TODO: Re-issue an auth token with updated validatedWithMfa information
	respondSuccess(res);
});

export default async (req: VercelRequest, res: VercelResponse): Promise<void> => {
	switch (req.method) {
		case "GET":
			await GET(req, res);
			break;
		case "DELETE":
			await DELETE(req, res);
			break;
		default:
			respondError(res, new BadMethodError());
			break;
	}
};
