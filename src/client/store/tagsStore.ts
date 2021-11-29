import type { Tag, TagRecordParams } from "../model/Tag";
import type { HashStore } from "../transport";
import type { TagSchema } from "../model/DatabaseSchema";
import type { Unsubscribe } from "firebase/auth";
import { defineStore } from "pinia";
import { getDocs } from "firebase/firestore";
import { useAuthStore } from "./authStore";
import {
	createTag,
	deriveDEK,
	updateTag,
	deleteTag,
	tagFromSnapshot,
	tagsCollection,
	watchAllRecords,
} from "../transport";

export type TagsDownloadable = Array<TagRecordParams & { id: string }>;

export const useTagsStore = defineStore("tags", {
	state: () => ({
		items: {} as Dictionary<Tag>, // Tag.id -> Tag
		loadError: null as Error | null,
		tagsWatcher: null as Unsubscribe | null,
	}),
	getters: {
		allTags(state): Array<Tag> {
			return Object.values(state.items);
		},
	},
	actions: {
		clearCache() {
			if (this.tagsWatcher) {
				this.tagsWatcher();
				this.tagsWatcher = null;
			}
			this.items = {};
			this.loadError = null;
			console.log("tagsStore: cache cleared");
		},
		watchTags(force: boolean = false) {
			if (this.tagsWatcher && !force) return;

			if (this.tagsWatcher) {
				this.tagsWatcher();
				this.tagsWatcher = null;
			}

			const authStore = useAuthStore();
			const uid = authStore.uid;
			const pKey = authStore.pKey as HashStore | null;
			if (pKey === null) throw new Error("No decryption key");
			if (uid === null) throw new Error("Sign in first");

			const collection = tagsCollection(uid);
			this.tagsWatcher = watchAllRecords(
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
								this.items[change.doc.id] = tagFromSnapshot(change.doc, dek);
								break;
						}
					});
				},
				error => {
					this.loadError = error;
				}
			);
		},
		async createTag(record: TagRecordParams): Promise<Tag> {
			// If a tag already exists with this name, return that one instead
			const extantTag = this.allTags.find(tag => tag.name === record.name);
			if (extantTag) return extantTag;

			// Otherwise, go ahead and make one
			const authStore = useAuthStore();
			const uid = authStore.uid;
			const pKey = authStore.pKey as HashStore | null;
			if (pKey === null) throw new Error("No decryption key");
			if (uid === null) throw new Error("Sign in first");

			const { dekMaterial } = await authStore.getDekMaterial();
			const dek = deriveDEK(pKey, dekMaterial);
			return await createTag(uid, record, dek);
		},
		async updateTag(tag: Tag): Promise<void> {
			const authStore = useAuthStore();
			const uid = authStore.uid;
			const pKey = authStore.pKey as HashStore | null;
			if (pKey === null) throw new Error("No decryption key");
			if (uid === null) throw new Error("Sign in first");

			const { dekMaterial } = await authStore.getDekMaterial();
			const dek = deriveDEK(pKey, dekMaterial);
			await updateTag(uid, tag, dek);
		},
		async deleteTag(this: void, tag: Tag): Promise<void> {
			const authStore = useAuthStore();
			const uid = authStore.uid;
			if (uid === null) throw new Error("Sign in first");

			await deleteTag(uid, tag);
		},
		async deleteAllTags(): Promise<void> {
			await Promise.all(this.allTags.map(this.deleteTag));
		},
		async getAllTagsAsJson(): Promise<TagsDownloadable> {
			const authStore = useAuthStore();
			const uid = authStore.uid;
			const pKey = authStore.pKey as HashStore | null;
			if (pKey === null) throw new Error("No decryption key");
			if (uid === null) throw new Error("Sign in first");

			const { dekMaterial } = await authStore.getDekMaterial();
			const dek = deriveDEK(pKey, dekMaterial);

			const collection = tagsCollection(uid);
			const snap = await getDocs(collection);
			const tags: TagsDownloadable = snap.docs
				.map(doc => tagFromSnapshot(doc, dek))
				.map(t => ({
					id: t.id,
					...t.toRecord(),
				}));
			return tags;
		},
		async importTag(tagToImport: TagSchema): Promise<void> {
			const storedTag = this.items[tagToImport.id] ?? null;
			if (storedTag) {
				// If duplicate, overwrite the one we have
				const newTag = storedTag.updatedWith(tagToImport);
				await this.updateTag(newTag);
			} else {
				// If new, create a new tag
				const params: TagRecordParams = {
					...tagToImport,
				};
				await this.createTag(params);
			}
		},
		async importTags(data: Array<TagSchema>): Promise<void> {
			for (const tagToImport of data) {
				await this.importTag(tagToImport);
			}
		},
	},
});