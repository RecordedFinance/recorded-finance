<script lang="ts">
	import type { Dinero } from "dinero.js";
	import { _ } from "svelte-i18n";
	import { createEventDispatcher } from "svelte";
	import { dinero } from "dinero.js";
	import { intlFormat } from "../../transformers";
	import { USD } from "@dinero.js/currencies";
	import { zeroDinero } from "../../helpers/dineroHelpers";
	import ActionButton from "../buttons/ActionButton.svelte";
	import TextField from "./TextField.svelte";

	const dispatch = createEventDispatcher<{ input: Dinero<number> }>();

	export let label: string | null = null;
	export let value: Dinero<number> = zeroDinero;

	let isIncome = false;

	$: zeroValue = intlFormat(zeroDinero, "standard");
	$: presentableValue = intlFormat(value, "standard");

	function onInput(event: Event) {
		const input = event.target as HTMLInputElement | null;
		const rawValue = input?.value ?? "";
		updateValue(rawValue);
	}

	function updateValue(rawValueString: string) {
		const numbersOnly = rawValueString.replace(/\D/gu, "");
		let rawValue = Number.parseInt(numbersOnly, 10);
		if (!isIncome) {
			rawValue = -rawValue;
		}
		if (Number.isNaN(rawValue) || rawValueString === "") {
			dispatch("input", value);
		} else {
			dispatch("input", dinero({ amount: rawValue, currency: USD }));
		}
	}

	function onClick(event: Event) {
		event.preventDefault();
		isIncome = !isIncome;
	}

	$: (true || isIncome) && updateValue(presentableValue);
</script>

<label class="currency-input__container {$$props.class}">
	<TextField
		class="currency-input"
		{label}
		value={presentableValue}
		maxlength={18}
		placeholder={zeroValue}
		on:input={onInput}
	/>
	<ActionButton class="negate" on:click={onClick}
		>{$_("currency.positive-or-negative")}</ActionButton
	>
</label>

<style type="text/scss">
	@use "styles/colors" as *;

	.currency-input {
		&__container {
			position: relative;

			.negate {
				position: absolute;
				right: 2pt;
				bottom: 19%;
				font-size: 100%;
				min-height: 1em;
				min-width: 2em;
				height: 2em;
				border-radius: 4pt;

				@media (hover: hover) {
					&:hover {
						background: color($gray4);
					}

					&:hover:disabled {
						background: none;
					}
				}
			}
		}
	}
</style>