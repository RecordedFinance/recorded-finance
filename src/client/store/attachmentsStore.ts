import type { Attachment, AttachmentRecordParams } from "../model/Attachment";
import type { AttachmentSchema } from "../model/DatabaseSchema";
import type { HashStore } from "../transport";
import type { Unsubscribe } from "firebase/auth";
import type JSZip from "jszip";
import { defineStore } from "pinia";
import { getDocs } from "firebase/firestore";
import { stores } from "./stores";
import { useAuthStore } from "./authStore";
import {
	attachmentsCollection,
	createAttachment,
	deleteAttachment,
	deriveDEK,
	embeddableDataForFile,
	updateAttachment,
	attachmentFromSnapshot,
	watchAllRecords,
} from "../transport";

export type AttachmentsDownloadable = Array<AttachmentRecordParams & { id: string }>;

export const useAttachmentsStore = defineStore("attachments", {
	state: () => ({
		items: {} as Dictionary<Attachment>, // Attachment.id -> Attachment
		files: {} as Dictionary<string>, // Attachment.id -> image data URL
		loadError: null as Error | null,
		attachmentsWatcher: null as Unsubscribe | null,
	}),
	getters: {
		allAttachments(state): Array<Attachment> {
			return Object.values(state.items);
		},
	},
	actions: {
		clearCache() {
			if (this.attachmentsWatcher) {
				this.attachmentsWatcher();
				this.attachmentsWatcher = null;
			}
			this.files = {};
			this.items = {};
			this.loadError = null;
			console.log("attachmentsStore: cache cleared");
		},
		watchAttachments(force: boolean = false) {
			if (this.attachmentsWatcher && !force) return;

			if (this.attachmentsWatcher) {
				this.attachmentsWatcher();
				this.attachmentsWatcher = null;
			}

			const authStore = useAuthStore();
			const uid = authStore.uid;
			const pKey = authStore.pKey as HashStore | null;
			if (pKey === null) throw new Error("No decryption key");
			if (uid === null) throw new Error("Sign in first");

			const collection = attachmentsCollection(uid);
			this.attachmentsWatcher = watchAllRecords(
				collection,
				async snap => {
					this.loadError = null;
					const authStore = useAuthStore();
					const { dekMaterial } = await authStore.getDekMaterial();
					const dek = deriveDEK(pKey, dekMaterial);

					snap.docChanges().forEach(change => {
						switch (change.type) {
							case "removed":
								delete this.items[change.doc.id];
								break;

							case "added":
							case "modified":
								this.items[change.doc.id] = attachmentFromSnapshot(change.doc, dek);
								break;
						}
					});
				},
				error => {
					this.loadError = error;
				}
			);
		},
		async createAttachment(
			record: Omit<AttachmentRecordParams, "storagePath">,
			file: File
		): Promise<Attachment> {
			const authStore = useAuthStore();
			const uid = authStore.uid;
			const pKey = authStore.pKey as HashStore | null;
			if (pKey === null) throw new Error("No decryption key");
			if (uid === null) throw new Error("Sign in first");

			const { dekMaterial } = await authStore.getDekMaterial();
			const dek = deriveDEK(pKey, dekMaterial);
			return await createAttachment(uid, file, record, dek);
		},
		async updateAttachment(attachment: Attachment, file?: File): Promise<void> {
			const authStore = useAuthStore();
			const uid = authStore.uid;
			const pKey = authStore.pKey as HashStore | null;
			if (pKey === null) throw new Error("No decryption key");
			if (uid === null) throw new Error("Sign in first");

			const { dekMaterial } = await authStore.getDekMaterial();
			const dek = deriveDEK(pKey, dekMaterial);
			await updateAttachment(uid, file ?? null, attachment, dek);
		},
		async deleteAttachment(this: void, attachment: Attachment): Promise<void> {
			const authStore = useAuthStore();
			const uid = authStore.uid;
			if (uid === null) throw new Error("Sign in first");

			const { useTransactionsStore } = await import("./transactionsStore");
			const transactions = useTransactionsStore();

			// Remove this attachment from any transactions which reference it
			await Promise.all(
				transactions.allTransactions
					.filter(t => t.attachmentIds.includes(attachment.id))
					.map(t => transactions.removeAttachmentFromTransaction(attachment.id, t))
			);
			await deleteAttachment(uid, attachment);
		},
		async deleteAllAttachments(): Promise<void> {
			await Promise.all(this.allAttachments.map(this.deleteAttachment));
		},
		async imageDataFromFile(file: Attachment, shouldCache: boolean = true): Promise<string> {
			// If we already have the thing, don't redownload
			const extantData = this.files[file.id];
			if (extantData !== undefined && extantData) return extantData;

			const authStore = useAuthStore();
			const uid = authStore.uid;
			const pKey = authStore.pKey as HashStore | null;
			if (pKey === null) throw new Error("No decryption key");
			if (uid === null) throw new Error("Sign in first");

			const { dekMaterial } = await authStore.getDekMaterial();
			const dek = deriveDEK(pKey, dekMaterial);
			const imageData = await embeddableDataForFile(dek, file);

			if (shouldCache) {
				// Cache the data URL and its file
				this.files[file.id] = imageData;
			}

			return imageData;
		},
		async getAllAttachmentsAsJson(): Promise<AttachmentsDownloadable> {
			const authStore = useAuthStore();
			const uid = authStore.uid;
			const pKey = authStore.pKey as HashStore | null;
			if (pKey === null) throw new Error("No decryption key");
			if (uid === null) throw new Error("Sign in first");

			const { dekMaterial } = await authStore.getDekMaterial();
			const dek = deriveDEK(pKey, dekMaterial);

			const collection = attachmentsCollection(uid);
			const snap = await getDocs(collection);
			const attachments: AttachmentsDownloadable = snap.docs
				.map(doc => attachmentFromSnapshot(doc, dek))
				.map(t => ({
					id: t.id,
					...t.toRecord(),
				}));
			return attachments;
		},
		async importAttachment(attachmentToImport: AttachmentSchema, zip: JSZip | null): Promise<void> {
			// FIXME: Import leaves broken references
			// TODO: Add a way to fix broken references as users find them

			const storedAttachment = this.items[attachmentToImport.id];

			const path = `accountable/storage/${attachmentToImport.storagePath.split(".")[0] as string}/${
				attachmentToImport.title
			}`;
			const fileRef = zip?.files[path] ?? null;

			const blobToImport = (await fileRef?.async("blob")) ?? null;
			if (!blobToImport) return;
			const fileToImport = new File([blobToImport], attachmentToImport.title.trim(), {
				type: attachmentToImport.type?.trim(),
			});

			if (storedAttachment) {
				// If duplicate, overwrite the one we have
				const newAttachment = storedAttachment.updatedWith(attachmentToImport);
				await this.updateAttachment(newAttachment, fileToImport);
			} else {
				// If new, create a new attachment
				const params: AttachmentRecordParams = {
					...attachmentToImport,
					title: attachmentToImport.title.trim(),
					type: attachmentToImport.type?.trim() ?? "unknown",
					notes: attachmentToImport.notes?.trim() ?? null,
				};
				const newAttachment = await this.createAttachment(params, fileToImport);

				const { transactions } = await stores();
				// Assume we've imported all transactions,
				// but don't assume we have them cached yet
				await transactions.getAllTransactions();

				for (const transaction of transactions.allTransactions) {
					if (!transaction.attachmentIds.includes(attachmentToImport.id)) continue;

					// Update the transaction with new attachment ID
					transaction.removeAttachmentId(attachmentToImport.id);
					transaction.addAttachmentId(newAttachment.id);
					await transactions.updateTransaction(transaction);
				}
			}
		},
		async importAttachments(data: Array<AttachmentSchema>, zip: JSZip | null): Promise<void> {
			for (const attachmentToImport of data) {
				await this.importAttachment(attachmentToImport, zip);
			}
		},
	},
});