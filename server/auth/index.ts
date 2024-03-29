import { asyncWrapper } from "../asyncWrapper";
import { Router } from "express";
import { throttle } from "./throttle";

import * as join from "../api/v0/join";
import * as login from "../api/v0/login";
import * as totpSecret from "../api/v0/totp/secret";
import * as totpValidate from "../api/v0/totp/validate";
import * as session from "../api/v0/session";
import * as logout from "../api/v0/logout";
import * as leave from "../api/v0/leave";
import * as updatepassword from "../api/v0/updatepassword";
import * as updateaccountid from "../api/v0/updateaccountid";

// TODO: Implement WebAuthn (and test passkey support!)

/**
 * Routes and middleware for a basic authentication flow. Installs a
 * `context` property on the request object that includes the caller's
 * authorized user ID.
 *
 * @see https://thecodebarbarian.com/oauth-with-node-js-and-express.html
 */
export function auth(): Router {
	return Router()
		.all("/join", throttle(), asyncWrapper(join.POST))
		.all("/login", throttle(), asyncWrapper(login.POST))
		.get("/totp/secret", /* throttle(), */ asyncWrapper(totpSecret.GET))
		.all("/totp/secret", throttle(), asyncWrapper(totpSecret.DELETE))
		.all("/totp/validate", throttle(), asyncWrapper(totpValidate.POST))
		.all("/session", /* throttle(), */ asyncWrapper(session.GET))
		.all("/logout", throttle(), asyncWrapper(logout.POST))
		.all("/leave", throttle(), asyncWrapper(leave.POST))
		.all("/updatepassword", throttle(), asyncWrapper(updatepassword.POST))
		.all("/updateaccountid", throttle(), asyncWrapper(updateaccountid.POST));
}
