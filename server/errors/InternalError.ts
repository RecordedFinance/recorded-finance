import type { UnauthorizedErrorCode } from "./UnauthorizedError";
import { HttpStatusCode } from "../helpers/HttpStatusCode";

export type ErrorCode =
	| UnauthorizedErrorCode
	| "account-conflict"
	| "bad-gateway"
	| "bad-method"
	| "not-found"
	| "not-implemented"
	| "storage-quota-exceeded"
	| "too-many-requests"
	| "totp-conflict"
	| "totp-secret-missing"
	| "unknown"
	| "user-quota-exceeded";

export class InternalError extends Error {
	/** The HTTP status that should be reported to the caller. */
	public readonly status: HttpStatusCode;

	/** `false` if we should log the error internally. */
	public readonly harmless: boolean;

	/** Headers that should be sent along with the error. */
	public readonly headers: ReadonlyMap<string, string | number | ReadonlyArray<string>>;

	/** A semantic reason for the error that should be forwarded to clients. */
	public readonly code: ErrorCode;

	constructor({
		message,
		status = HttpStatusCode.INTERNAL_SERVER_ERROR,
		code,
		headers = new Map(),
		harmless = false,
	}: {
		message?: string;
		status?: number;
		code: ErrorCode;
		headers?: Map<string, string | number | ReadonlyArray<string>>;
		harmless?: boolean;
	}) {
		super(message ?? code);
		this.status = status;
		this.code = code;
		this.headers = headers;
		this.harmless = harmless;
		this.name = "InternalError";
	}

	toString(): string {
		const headers: Record<string, string> = {};
		this.headers.forEach((value, key) => {
			headers[key] = value.toString();
		});
		return JSON.stringify({
			name: this.name,
			message: this.message,
			code: this.code,
			status: this.status,
			harmless: this.harmless,
			headers,
		});
	}
}
