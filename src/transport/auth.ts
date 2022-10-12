import type { AccountableDB, DocumentReference } from "./db";
import type { KeyMaterial } from "./cryption";
import type { MFAValidation } from "./schemas";
import { AccountableError } from "./errors";
import { doc, db, getDoc, setDoc, deleteDoc } from "./db";
import { t } from "../i18n";
import {
	authJoin,
	authLeave,
	authLogIn,
	authLogOut,
	authRefreshSession,
	authUpdateAccountId,
	authUpdatePassword,
	deleteAt,
	getFrom,
	postTo,
	totpSecret,
	totpValidate,
	urlForApi,
} from "./api-types/index.js";

function authRef(uid: string): DocumentReference<KeyMaterial> {
	return doc<KeyMaterial>(db, "keys", uid);
}

export async function getAuthMaterial(uid: string): Promise<KeyMaterial | null> {
	const snap = await getDoc(authRef(uid));
	return snap.data() ?? null;
}

export async function setAuthMaterial(uid: string, data: KeyMaterial): Promise<void> {
	await setDoc(authRef(uid), data);
}

export async function deleteAuthMaterial(uid: string): Promise<void> {
	await deleteDoc(authRef(uid));
}

export interface User {
	/** The account ID of the user. */
	readonly accountId: string;

	/** The user's unique ID. Not alterable without creating a new account. */
	readonly uid: string;

	/** The user's registered 2FA methods. */
	readonly mfa: ReadonlyArray<MFAValidation>;

	/**
	 * The cipher key that the server says should be used to decrypt PubNub messages, or `null` if the server does not use PubNub.
	 */
	readonly pubnubCipherKey: string | null;
}

export interface UserCredential {
	/** The user authenticated by this credential. */
	user: User;
}

/**
 * Creates a new user account associated with the specified account ID and password.
 *
 * @remarks
 * On successful creation of the user account, this user will also be signed in to your application.
 *
 * User account creation can fail if the account already exists or the password is invalid.
 *
 * Note: The account ID acts as a unique identifier for the user. This function will create a new user account and set the initial user password.
 *
 * @param db The {@link AccountableDB} instance.
 * @param account The user's account ID.
 * @param password The user's chosen password.
 */
export async function createUserWithAccountIdAndPassword(
	db: AccountableDB,
	account: string,
	password: string
): Promise<UserCredential> {
	if (!account)
		throw new TypeError(t("error.sanity.empty-param", { values: { name: "accountID" } }));
	if (!password)
		throw new TypeError(t("error.sanity.empty-param", { values: { name: "password" } }));

	const join = urlForApi(db, authJoin());
	const {
		pubnub_token, //
		pubnub_cipher_key,
		uid,
		usedSpace,
		totalSpace,
	} = await postTo(join, { account, password });
	if (pubnub_token === undefined || pubnub_cipher_key === undefined || uid === undefined)
		throw new TypeError(t("error.server.missing-access-token"));

	if (usedSpace !== undefined && totalSpace !== undefined) {
		db.setUserStats({ usedSpace, totalSpace });
	}

	const pubnubCipherKey = pubnub_cipher_key;
	const user: User = { accountId: account, uid, mfa: [], pubnubCipherKey };
	db.setUser(user, pubnub_token);
	return { user };
}

/**
 * Signs out the current user.
 *
 * @param db The {@link AccountableDB} instance.
 *
 * @throws a `NetworkError` if something goes wrong with the request.
 */
export async function signOut(db: AccountableDB): Promise<void> {
	const logout = urlForApi(db, authLogOut());
	await postTo(logout, {});
	db.clearUser();
}

/**
 * Asynchronously signs in using an account ID and password.
 *
 * @remarks
 * Fails with an error if the account ID and password do not match.
 *
 * Note: The
 * account ID serves as a unique identifier for the user, and the password is used to access
 * the user's account in your Accountable instance. See also: {@link createUserWithAccountIdAndPassword}.
 *
 * @param db The {@link AccountableDB} instance.
 * @param account The user's account ID.
 * @param password The user's password.
 *
 * @throws a `NetworkError` if something goes wrong with the request.
 */
export async function signInWithAccountIdAndPassword(
	db: AccountableDB,
	account: string,
	password: string
): Promise<UserCredential> {
	if (!account)
		throw new TypeError(t("error.sanity.empty-param", { values: { name: "accountID" } }));
	if (!password)
		throw new TypeError(t("error.sanity.empty-param", { values: { name: "password" } }));

	const login = urlForApi(db, authLogIn());
	const {
		pubnub_token, //
		pubnub_cipher_key,
		uid,
		usedSpace,
		totalSpace,
		validate,
	} = await postTo(login, { account, password });
	if (pubnub_token === undefined || pubnub_cipher_key === undefined || uid === undefined)
		throw new TypeError(t("error.server.missing-access-token"));

	db.clearUser(); // clear the previous user
	if (usedSpace !== undefined && totalSpace !== undefined) {
		db.setUserStats({ usedSpace, totalSpace });
	}

	const mfa: Array<MFAValidation> = [];
	if (validate === "totp") mfa.push("totp");

	const pubnubCipherKey = pubnub_cipher_key;
	const user: User = { accountId: account, uid, mfa, pubnubCipherKey };
	db.setUser(user, pubnub_token);
	return { user };
}

/**
 * Begins enrolling the user in TOTP 2FA. Must call {@link verifySessionWithTOTP}
 * in order to confirm the enrollment and start requiring TOTP with new logins.
 *
 * @param db The {@link AccountableDB} instance.
 *
 * @returns a Promise that resolves with the user's new TOTP secret. Present this
 * to the user for later validation.
 */
export async function enrollTotp(db: AccountableDB): Promise<string> {
	if (!db.currentUser) throw new AccountableError("auth/unauthenticated");

	const enroll = urlForApi(db, totpSecret());
	const { secret } = await getFrom(enroll);

	if (secret === undefined) throw new TypeError("Expected secret from server, but got nothing"); // TODO: I18N

	return secret;
}

/**
 * Disables the user's TOTP requirement, and deletes the server's stored TOTP secret.
 */
export async function unenrollTotp(
	db: AccountableDB,
	password: string,
	token: string
): Promise<void> {
	if (!password)
		throw new TypeError(t("error.sanity.empty-param", { values: { name: "password" } }));
	if (!token) throw new TypeError(t("error.sanity.empty-param", { values: { name: "token" } }));

	const unenroll = urlForApi(db, totpSecret());
	await deleteAt(unenroll, { password, token });
}

/**
 * Asynchronously validates the current session using the given TOTP.
 *
 * @param db The {@link AccountableDB} instance.
 * @param token The current TOTP, to be validated against the user's
 * server-stored secrets.
 *
 * @returns a Promise that resolves with the user's credentials and,
 * if this is the user's first time validating a token, a special
 * recovery token that the user should save to use in case they lose
 * their authenticator.
 */
export async function verifySessionWithTOTP(
	db: AccountableDB,
	token: string
): Promise<[recoveryToken: string | null, credential: UserCredential]> {
	if (!token) throw new TypeError(t("error.sanity.empty-param", { values: { name: "token" } }));
	if (!db.currentUser) throw new AccountableError("auth/unauthenticated");

	const validate = urlForApi(db, totpValidate());
	const {
		pubnub_token, //
		pubnub_cipher_key,
		recovery_token,
		uid,
		usedSpace,
		totalSpace,
	} = await postTo(validate, { token });
	if (pubnub_token === undefined || pubnub_cipher_key === undefined || uid === undefined)
		throw new TypeError(t("error.server.missing-access-token"));

	if (usedSpace !== undefined && totalSpace !== undefined) {
		db.setUserStats({ usedSpace, totalSpace });
	}

	const pubnubCipherKey = pubnub_cipher_key;
	const user = { ...db.currentUser, pubnubCipherKey };
	db.setUser(user, pubnub_token);

	const credential: UserCredential = { user };
	const recovery = recovery_token ?? null;
	return [recovery, credential];
}

/**
 * Asynchronously refreshes the login token
 *
 * @param db The {@link AccountableDB} instance.
 *
 * @throws a `NetworkError` if something goes wrong with the request.
 */
export async function refreshSession(db: AccountableDB): Promise<UserCredential> {
	const session = urlForApi(db, authRefreshSession());
	const {
		account,
		pubnub_token,
		pubnub_cipher_key,
		uid,
		usedSpace,
		totalSpace,
		requiredAddtlAuth,
	} = await getFrom(session);
	if (
		account === undefined ||
		pubnub_token === undefined ||
		pubnub_cipher_key === undefined ||
		uid === undefined
	)
		throw new TypeError(t("error.server.missing-access-token"));

	if (usedSpace !== undefined && totalSpace !== undefined) {
		db.setUserStats({ usedSpace, totalSpace });
	}

	const mfa: Array<MFAValidation> = [];
	for (const auth of new Set(requiredAddtlAuth ?? [])) {
		if (auth === "totp") mfa.push(auth);
	}

	const pubnubCipherKey = pubnub_cipher_key;
	const user: User = { accountId: account, uid, mfa, pubnubCipherKey };
	db.setUser(user, pubnub_token);
	return { user };
}

/**
 * Deletes and signs out the user.
 *
 * @param db The {@link AccountableDB} instance.
 * @param user The user.
 * @param password The user's chosen password.
 *
 * @throws a `NetworkError` if something goes wrong with the request.
 */
export async function deleteUser(db: AccountableDB, user: User, password: string): Promise<void> {
	if (!password)
		throw new TypeError(t("error.sanity.empty-param", { values: { name: "password" } }));

	const leave = urlForApi(db, authLeave());
	if (db.currentUser?.uid === user.uid) {
		db.clearUser();
	}
	await postTo(leave, {
		account: user.accountId,
		password,
	});
}

/**
 * Updates the user's account ID.
 *
 * @param user The user.
 * @param newAccountId The new account ID.
 * @param password The user's chosen password.
 *
 * @throws a `NetworkError` if something goes wrong with the request.
 */
export async function updateAccountId(
	user: User,
	newAccountId: string,
	password: string
): Promise<void> {
	if (!newAccountId)
		throw new TypeError(t("error.sanity.empty-param", { values: { name: "accountID" } }));
	if (!password)
		throw new TypeError(t("error.sanity.empty-param", { values: { name: "password" } }));

	const updateaccountid = urlForApi(db, authUpdateAccountId());
	await postTo(updateaccountid, {
		account: user.accountId,
		newaccount: newAccountId,
		password,
	});
}

/**
 * Updates the user's password.
 *
 * @param db The {@link AccountableDB} instance.
 * @param user The user.
 * @param oldPassword The old password.
 * @param newPassword The new password.
 *
 * @throws a `NetworkError` if something goes wrong with the request.
 */
export async function updatePassword(
	db: AccountableDB,
	user: User,
	oldPassword: string,
	newPassword: string
): Promise<void> {
	if (!oldPassword)
		throw new TypeError(t("error.sanity.empty-param", { values: { name: "oldPassword" } }));
	if (!newPassword)
		throw new TypeError(t("error.sanity.empty-param", { values: { name: "newPassword" } }));

	const updatepassword = urlForApi(db, authUpdatePassword());
	await postTo(updatepassword, {
		account: user.accountId,
		password: oldPassword,
		newpassword: newPassword,
	});
}
