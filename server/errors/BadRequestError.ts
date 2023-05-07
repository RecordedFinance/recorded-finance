import { HttpStatusCode } from "@/helpers/HttpStatusCode";
import { InternalError } from "./InternalError";

export class BadRequestError extends InternalError {
	constructor(message: string = "Invalid data") {
		super({ status: HttpStatusCode.BAD_REQUEST, message, harmless: true });
		this.name = "BadRequestError";
	}
}
