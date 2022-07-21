import type { Dinero } from "dinero.js";
import { getLocaleFromNavigator } from "svelte-i18n";
import { toFormat } from "dinero.js";

type NegativeStyle = "accounting" | "standard";

export function intlFormat(
	dinero: Dinero<number>,
	negativeStyle: NegativeStyle = "accounting"
): string {
	return toFormat(dinero, ({ amount, currency }) => {
		const locale = getLocaleFromNavigator();
		const formatter = new Intl.NumberFormat(locale ?? undefined, {
			style: "currency",
			currency: currency.code,
			currencySign: negativeStyle,
		});
		return formatter.format(amount);
	});
}
