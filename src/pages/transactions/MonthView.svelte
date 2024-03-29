<script lang="ts">
	import { _ } from "../../i18n";
	import { accounts, isLoadingTransactions, transactionsForAccountByMonth } from "../../store";
	import AddRecordListItem from "../accounts/AddRecordListItem.svelte";
	import List from "../../components/List.svelte";
	import ListItem from "../../components/ListItem.svelte";
	import Spinner from "../../components/Spinner.svelte";
	import TransactionCreateModal from "./TransactionCreateModal.svelte";
	import TransactionListItem from "./TransactionListItem.svelte";

	export let accountId: string;
	export let rawMonth: string;

	let isEditingTransaction = false;

	$: month =
		// Perhaps validate with regex? Would have to match the locale tho
		decodeURIComponent(rawMonth);

	$: monthTransactions =
		month === null || !month ? [] : ($transactionsForAccountByMonth[accountId] ?? {})[month] ?? [];

	$: account = $accounts[accountId] ?? null;

	function startCreatingTransaction(event: CustomEvent<MouseEvent> | CustomEvent<KeyboardEvent>) {
		if ("key" in event.detail && event.detail.key !== " ") return;
		isEditingTransaction = true;
	}

	function finishCreatingTransaction() {
		isEditingTransaction = false;
	}
</script>

<main class="content">
	<div class="heading">
		<div class="month-title">
			<h1>{month}</h1>
		</div>
	</div>

	{#if month}
		<List>
			<li>
				<AddRecordListItem
					on:keydown={startCreatingTransaction}
					on:click={startCreatingTransaction}
				/>
			</li>
			{#if $isLoadingTransactions}
				<li>
					<ListItem title={$_("common.loading-in-progress")}>
						<Spinner slot="icon" />
					</ListItem>
				</li>
			{/if}
			{#each monthTransactions as transaction (transaction.id)}
				<li class="transaction">
					<TransactionListItem {transaction} />
				</li>
			{/each}
			<li>
				<p class="footer">
					{#if monthTransactions?.length === 1}
						{$_("transactions.count.transaction")}
					{:else}
						{$_("transactions.count.transactions", {
							values: { n: monthTransactions?.length ?? 0 },
						})}
					{/if}
				</p>
			</li>
		</List>
	{:else}
		<p>{$_("months.does-not-match-pattern", { values: { month } })}</p>
	{/if}
</main>

{#if account}
	<TransactionCreateModal
		{account}
		isOpen={isEditingTransaction}
		closeModal={finishCreatingTransaction}
	/>
{/if}

<style lang="scss">
	@use "styles/colors" as *;

	.heading {
		display: flex;
		flex-flow: row nowrap;
		align-items: baseline;
		max-width: 36em;
		margin: 1em auto;

		> .month-title {
			display: flex;
			flex-flow: row nowrap;
			align-items: center;

			> h1 {
				margin: 0;
			}
		}
	}
</style>
