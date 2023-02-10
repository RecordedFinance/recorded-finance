import atob from "atob-lite";
import btoa from "btoa-lite";

/**
 * An object that stores a string value in base-64. Useful for
 * keeping secret values hard to read in plaintext memory.
 */
export class HashStore {
	private _hashedValue: string;

	constructor(value: string) {
		this._hashedValue = btoa(value);
	}

	/**
	 * Constructs a new hash store that contains the given encoded value.
	 */
	static fromHashed(hashedValue: string): HashStore {
		return new HashStore(atob(hashedValue));
	}

	/**
	 * Decodes the internal value and returns it.
	 */
	get value(): string {
		return atob(this._hashedValue);
	}

	/**
	 * Returns the encoded internal value.
	 */
	get hashedValue(): string {
		return this._hashedValue;
	}

	/**
	 * Overwrites the buffer with random data for _maximum paranoia_.
	 */
	destroy(): void {
		const length = this._hashedValue.length;
		let result = "";
		const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		const charactersLength = characters.length;
		for (let i = 0; i < length; i += 1) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		this._hashedValue = result;
	}

	toString(): string {
		return JSON.stringify({
			_hashedValue: this._hashedValue,
		});
	}
}
