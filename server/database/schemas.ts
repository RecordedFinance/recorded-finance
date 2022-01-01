import Joi from "joi";
import "joi-extract-type";

function isValidForSchema(data: unknown, schema: Joi.AnySchema): boolean {
	const { error } = schema.validate(data);
	return !error;
}

const mongoObject = Joi.object({
	_id: Joi.string().required(),
	uid: Joi.string().required(),
});
export type MongoObject = Joi.extractType<typeof mongoObject>;

const user = mongoObject.keys({
	currentAccountId: Joi.string().required(),
	passwordHash: Joi.string().required(),
	passwordSalt: Joi.string().required(),
});
export type User = Joi.extractType<typeof user>;

export type Primitive = string | number | boolean | undefined | null;

/**
 * An object whose properties may only be primitive values.
 */
export type DocumentData<T> = {
	[K in keyof T]: Primitive;
};

const dataItem = mongoObject.keys({
	ciphertext: Joi.string().required(),
	objectType: Joi.string().required(),
});
export type DataItem = Joi.extractType<typeof dataItem>;

export function isDataItem(tbd: unknown): tbd is DataItem {
	return isValidForSchema(tbd, dataItem);
}

const keys = mongoObject.keys({
	dekMaterial: Joi.string().required(),
	passSalt: Joi.string().required(),
	oldDekMaterial: Joi.string(),
	oldPassSalt: Joi.string(),
});
export type Keys = Joi.extractType<typeof keys>;

export function isKeys(tbd: unknown): tbd is Keys {
	return isValidForSchema(tbd, keys);
}

export type AnyDataItem = DataItem | Keys | User;

export type CollectionID =
	| "accounts"
	| "attachments"
	| "keys"
	| "locations"
	| "tags"
	| "transactions"
	| "users";

const allCollectionIds: ReadonlySet<CollectionID> = new Set([
	"accounts",
	"attachments",
	"keys",
	"locations",
	"tags",
	"transactions",
	"users",
]);

export function isCollectionId(tbd: string): tbd is CollectionID {
	return allCollectionIds.has(tbd as CollectionID);
}
