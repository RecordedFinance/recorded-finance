import type { AESCipherKey, Hash, Salt, TOTPSeed } from "../../database/schemas";
import type { compare as _compare } from "bcryptjs";
import type {
	generateSecureToken as _generateSecureToken,
	generateSalt as _generateSalt,
	generateHash as _generateHash,
	generateAESCipherKey as _generateAESCipherKey,
} from "../generators";
import { jest } from "@jest/globals";

export const compare = jest
	.fn<typeof _compare>()
	.mockImplementation((a: string, b: string) => Promise.resolve(a === b));

export const DEFAULT_MOCK_SECURE_TOKEN = "NOT_SECURE_TOKEN" as TOTPSeed;

export const generateSecureToken = jest
	.fn<typeof _generateSecureToken>()
	.mockReturnValue(DEFAULT_MOCK_SECURE_TOKEN);

export const DEFAULT_MOCK_SALT = "INSECURE_SALT" as Salt;

export const generateSalt = jest.fn<typeof _generateSalt>().mockResolvedValue(DEFAULT_MOCK_SALT);

export const DEFAULT_MOCK_HASH = "INSECURE_HASH" as Hash;

export const generateHash = jest.fn<typeof _generateHash>().mockResolvedValue(DEFAULT_MOCK_HASH);

export const DEFAULT_MOCK_AES_CIPHER_KEY = "INSECURE_CIPHER_KEY" as AESCipherKey;

export const generateAESCipherKey = jest
	.fn<typeof _generateAESCipherKey>()
	.mockResolvedValue(DEFAULT_MOCK_AES_CIPHER_KEY);
