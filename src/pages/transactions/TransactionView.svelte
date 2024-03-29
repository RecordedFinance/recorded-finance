<script lang="ts">
	import type { Tag as TagObject, TagRecordParams } from "../../model/Tag";
	import type { Attachment } from "../../model/Attachment";
	import { _, locale } from "../../i18n";
	import { accountPath } from "../../router/routes";
	import { addTagToTransaction, addAttachmentToTransaction } from "../../model/Transaction";
	import { isNegative } from "dinero.js";
	import { link, useNavigate } from "svelte-navigator";
	import { logger } from "../../logger";
	import { toCurrency, toTimestamp } from "../../transformers";
	import ConfirmDestroyFile from "../attachments/ConfirmDestroyFile.svelte";
	import EditButton from "../../components/buttons/EditButton.svelte";
	import FileInput from "../attachments/FileInput.svelte";
	import FileListItem from "../attachments/FileListItem.svelte";
	import FileReattach from "../attachments/FileReattach.svelte";
	import I18N from "../../components/I18N.svelte";
	import List from "../../components/List.svelte";
	import LocationIcon from "../../icons/Location.svelte";
	import LocationView from "../locations/LocationView.svelte";
	import Modal from "../../components/Modal.svelte";
	import NopLink from "../../components/NopLink.svelte";
	import TagList from "../../pages/tags/TagList.svelte";
	import TransactionEdit from "./TransactionEdit.svelte";
	import {
		accounts,
		attachments,
		createAttachmentFromFile,
		createTag as _createTag,
		deleteAttachment,
		deleteTagIfUnreferenced,
		handleError,
		locations,
		removeAttachmentFromTransaction,
		removeTagFromTransaction,
		transactionsForAccount,
		updateTransaction,
	} from "../../store";

	export let accountId: string;
	export let transactionId: string;

	const navigate = useNavigate();

	let fileToDelete: Attachment | null = null;
	let isViewingLocation = false;
	let brokenReferenceToFix: string | null = null;

	$: theseTransactions = $transactionsForAccount[accountId] ?? {};

	$: numberOfTransactions = Object.keys(theseTransactions).length;
	$: account = $accounts[accountId];
	$: transaction = theseTransactions[transactionId];
	$: locationId = transaction?.locationId ?? null;
	$: location = locationId !== null ? $locations[locationId] ?? null : null;

	$: timestamp = transaction ? toTimestamp($locale.code, transaction.createdAt) : "";

	$: accountRoute = accountPath(accountId);

	function goBack() {
		navigate(-1);
	}

	async function createTag(params: CustomEvent<TagRecordParams>) {
		if (!transaction) return;
		const newTag = await _createTag(params.detail);
		addTagToTransaction(transaction, newTag);
		await updateTransaction(transaction);
	}

	function modifyTag(tag: CustomEvent<TagObject>) {
		logger.debug("modify", tag.detail);
	}

	async function removeTag(tag: CustomEvent<TagObject>) {
		if (!transaction) return;
		await removeTagFromTransaction(tag.detail, transaction);
		await deleteTagIfUnreferenced(tag.detail); // removing the tag won't automatically do this, for efficiency's sake, so we do it here
	}

	function askToDeleteFile(file: CustomEvent<Attachment>): void {
		fileToDelete = file.detail;
	}

	async function confirmDeleteFile(file: CustomEvent<Attachment>): Promise<void> {
		if (!transaction) return;
		try {
			await deleteAttachment(file.detail);
		} catch (error) {
			handleError(error);
		} finally {
			fileToDelete = null;
		}
	}

	function openReferenceFixer(fileId: string): void {
		brokenReferenceToFix = fileId;
	}

	function closeReferenceFixer(): void {
		brokenReferenceToFix = null;
	}

	async function deleteFileReference({ detail: fileId }: CustomEvent<string>): Promise<void> {
		if (!transaction) return;
		try {
			await removeAttachmentFromTransaction(fileId, transaction);
		} catch (error) {
			handleError(error);
		} finally {
			fileToDelete = null;
		}
	}

	function cancelDeleteFile(): void {
		fileToDelete = null;
	}

	async function onFileReceived(event: CustomEvent<File | null>): Promise<void> {
		const file = event.detail;
		if (!transaction || !file) return;

		try {
			const attachment = await createAttachmentFromFile(file);
			addAttachmentToTransaction(transaction, attachment);
			await updateTransaction(transaction);
		} catch (error) {
			handleError(error);
		}
	}
</script>

{#if transaction}
	<main class="content main">
		{#if transaction.title || location}
			<div class="heading">
				<h1>&quot;{transaction.title ?? location?.title}&quot;</h1>
				{#if account && transaction}
					<EditButton>
						<TransactionEdit
							slot="modal"
							let:onFinished
							{account}
							{transaction}
							on:deleted={goBack}
							on:finished={onFinished}
						/>
					</EditButton>
				{/if}
				<!-- TODO: Default to the transaction ID -->
			</div>
		{/if}

		<TagList
			tagIds={transaction.tagIds ?? []}
			on:create-tag={createTag}
			on:modify-tag={modifyTag}
			on:remove-tag={removeTag}
		/>

		<h3>{$_("common.details")}</h3>
		<!-- Amount -->
		<div class="key-value-pair" aria-label={$_("transactions.meta.amount-aria-label")}>
			<span class="key">{$_("transactions.meta.amount")}</span>
			<span class="value amount {isNegative(transaction.amount) ? 'negative' : ''}"
				>{toCurrency($locale.code, transaction.amount, "standard")}</span
			>
		</div>
		<!-- Timestamp -->
		<div class="key-value-pair" aria-label={$_("transactions.meta.timestamp-aria-label")}>
			<span class="key">{$_("transactions.meta.timestamp")}</span>
			<span class="value">{timestamp}</span>
		</div>
		<!-- Reconciliation -->
		<div class="key-value-pair" aria-label={$_("transactions.meta.reconciled-aria-label")}>
			<span class="key">{$_("transactions.meta.reconciled")}</span>
			<span class="value">{transaction.isReconciled ? $_("common.yes") : $_("common.no")}</span>
		</div>
		<!-- Account -->
		<div class="key-value-pair" aria-label={$_("transactions.meta.account-aria-label")}>
			<span class="key">{$_("transactions.meta.account")}</span>
			<a class="value" href={accountRoute} use:link>{account?.title ?? accountId}</a>
		</div>
		<!-- Notes -->
		{#if transaction.notes}
			<div class="key-value-pair" aria-label={$_("transactions.meta.notes-aria-label")}>
				<span class="key">{$_("transactions.meta.notes")}</span>
				<span class="value">&quot;{transaction.notes}&quot;</span>
			</div>
		{/if}
		<!-- Location -->
		{#if locationId}
			<div class="key-value-pair" aria-label={$_("transactions.meta.location-aria-label")}>
				<span class="key">{$_("transactions.meta.location")}</span>
				{#if location?.coordinate ?? location?.subtitle}
					<span class="value">
						<NopLink on:click={() => (isViewingLocation = true)}
							>{location?.title ?? locationId}
							{#if location?.coordinate}<LocationIcon />{/if}
						</NopLink>
					</span>
				{:else}
					<span class="value">&quot;{location?.title ?? locationId}&quot;</span>
				{/if}
				<Modal open={isViewingLocation} closeModal={() => (isViewingLocation = false)}>
					{#if location}
						<LocationView {location} />
					{/if}
				</Modal>
			</div>
		{/if}

		<h3>{$_("files.list.heading")}</h3>
		<List>
			{#each transaction.attachmentIds as fileId}
				<li>
					{#if $attachments[fileId]}
						<FileListItem
							{fileId}
							on:delete={askToDeleteFile}
							on:delete-reference={deleteFileReference}
						/>
					{:else}
						<FileListItem
							{fileId}
							on:keydown={e => {
								e.preventDefault();
								e.detail.preventDefault();
								if (e.detail.key === " ") {
									openReferenceFixer(fileId);
								}
							}}
							on:click={e => {
								e.preventDefault();
								e.detail.preventDefault();
								openReferenceFixer(fileId);
							}}
						/>
					{/if}
				</li>
			{/each}
		</List>
		<FileInput on:input={onFileReceived}>{$_("transactions.attach-file")}</FileInput>
	</main>
{:else}
	<main class="content main">
		<!-- We should never get here, but in case we do, for debugging: -->
		<h1>{$_("debug.something-is-wrong")}</h1>
		<p>{$_("debug.account-but-no-transaction")}</p>
		<p class="disclaimer">
			<I18N keypath="debug.transaction-id">
				<!-- id -->
				<em>{transactionId}</em>
			</I18N>
		</p>
		<p class="disclaimer"
			>{numberOfTransactions === 1
				? $_("debug.count-one-transaction")
				: $_("debug.count-all-transactions", { values: { n: numberOfTransactions } })}</p
		>
		<ul>
			{#each Object.entries(theseTransactions) as [id, txn] (id)}
				<li>
					<strong>{id}:&nbsp;</strong>
					<span>{txn.id}</span>
				</li>
			{/each}
		</ul>
	</main>
{/if}

<Modal open={brokenReferenceToFix !== null && !!transaction} closeModal={closeReferenceFixer}>
	{#if brokenReferenceToFix !== null && !!transaction}
		<FileReattach {transaction} fileId={brokenReferenceToFix} on:close={closeReferenceFixer} />
	{/if}
</Modal>

<ConfirmDestroyFile
	file={fileToDelete}
	isOpen={fileToDelete !== null}
	on:yes={confirmDeleteFile}
	on:no={cancelDeleteFile}
/>

<style lang="scss">
	@use "styles/colors" as *;

	.content.main {
		max-width: 400pt;
		margin: 0 auto;
		margin-bottom: 58pt;

		.heading {
			display: flex;
			flex-flow: row nowrap;
			max-width: 36em;
			margin: 1em auto;

			h1 {
				margin-left: 0;
				margin-right: 0;
			}

			:global(.edit-button) {
				position: relative;
				top: 8pt;
				margin: auto 0;
			}
		}

		.amount {
			&.negative {
				color: color($red);
			}
		}

		.key-value-pair {
			width: 100%;
			display: flex;
			flex-flow: row nowrap;
			justify-content: space-between;

			> .key {
				flex: 0 0 auto; // don't grow, take up only needed space
			}

			&::after {
				content: "";
				min-width: 0.5em;
				height: 1em;
				margin: 0 2pt;
				border-bottom: 1pt dotted color($label);
				flex: 1 0 auto; // Grow, don't shrink
				order: 1; // this goes in the middle
			}

			> .value {
				text-align: right;
				font-weight: bold;
				white-space: pre-wrap;
				max-width: 80%;
				flex: 0 0 auto; // don't grow, take up only needed space
				order: 2;
			}
		}
	}
</style>
