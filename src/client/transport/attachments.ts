import type {
	CollectionReference,
	DocumentReference,
	QueryDocumentSnapshot,
} from "firebase/firestore";
import type { StorageReference } from "firebase/storage";
import type { AttachmentRecordParams } from "../model/Attachment";
import type { EPackage, HashStore } from "./cryption";
import { Attachment } from "../model/Attachment";
import { db, storage, recordFromSnapshot } from "./db";
import { encrypt, decrypt } from "./cryption";
import { FirebaseError } from "@firebase/util";
import { ref, uploadString, deleteObject, getDownloadURL } from "firebase/storage";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { dataUrlFromFile, getDataAtUrl } from "./getDataAtUrl";

interface AttachmentRecordPackageMetadata {
	objectType: "Attachment";
}
type AttachmentRecordPackage = EPackage<AttachmentRecordPackageMetadata>;

export function attachmentsCollection(uid: string): CollectionReference<AttachmentRecordPackage> {
	const path = `users/${uid}/attachments`;
	return collection(db, path) as CollectionReference<AttachmentRecordPackage>;
}

function attachmentRef(
	uid: string,
	attachment: Attachment
): DocumentReference<AttachmentRecordPackage> {
	const path = `users/${uid}/attachments/${attachment.id}`;
	return doc(db, path) as DocumentReference<AttachmentRecordPackage>;
}

function attachmentStorageRef(storagePath: string): StorageReference {
	return ref(storage, storagePath);
}

export async function embeddableDataForFile(dek: HashStore, file: Attachment): Promise<string> {
	const storageRef = attachmentStorageRef(file.storagePath);
	const downloadUrl = await getDownloadURL(storageRef);
	const encryptedData = await getDataAtUrl(downloadUrl);
	const pkg = JSON.parse(encryptedData) as { ciphertext: string };
	if (!("ciphertext" in pkg)) {
		throw new TypeError("Improperly formatted payload.");
	}

	const imageData = decrypt(pkg, dek);
	if (typeof imageData !== "string") {
		throw new TypeError(`Expected string output. Got ${typeof imageData}`);
	}
	return imageData;
}

export function attachmentFromSnapshot(
	doc: QueryDocumentSnapshot<AttachmentRecordPackage>,
	dek: HashStore
): Attachment {
	const { id, record } = recordFromSnapshot(doc, dek, Attachment.isRecord);
	const storagePath = record.storagePath;
	return new Attachment(id, storagePath, record);
}

export async function createAttachment(
	uid: string,
	file: File,
	record: Omit<AttachmentRecordParams, "storagePath">,
	dek: HashStore
): Promise<Attachment> {
	const meta: AttachmentRecordPackageMetadata = {
		objectType: "Attachment",
	};
	const imageData = await dataUrlFromFile(file);
	const fileToUpload = JSON.stringify(encrypt(imageData, {}, dek));

	const ref = doc(attachmentsCollection(uid)); // generates unique document ID
	const storageName = doc(attachmentsCollection(uid)); // generates unique file name

	const storagePath = `users/${uid}/attachments/${storageName.id}.json`;
	const storageRef = attachmentStorageRef(storagePath);
	await uploadString(storageRef, fileToUpload, "raw"); // Store the attachment

	const recordToSave = record as typeof record & { storagePath?: string };
	recordToSave.storagePath = storagePath;
	const pkg = encrypt(recordToSave, meta, dek);
	await setDoc(ref, pkg); // Save the record

	return new Attachment(ref.id, storagePath, recordToSave);
}

export async function updateAttachment(
	uid: string,
	file: File | null,
	attachment: Attachment,
	dek: HashStore
): Promise<void> {
	const meta: AttachmentRecordPackageMetadata = {
		objectType: "Attachment",
	};

	const record: AttachmentRecordParams = attachment.toRecord();
	const pkg = encrypt(record, meta, dek);
	await setDoc(attachmentRef(uid, attachment), pkg);

	if (file) {
		// delete the old file
		const storageRef = attachmentStorageRef(attachment.storagePath);
		await deleteObject(storageRef);

		// store the new file
		const imageData = await dataUrlFromFile(file);
		const fileToUpload = JSON.stringify(encrypt(imageData, {}, dek));

		await uploadString(storageRef, fileToUpload, "raw");
	}
}

export async function deleteAttachment(uid: string, attachment: Attachment): Promise<void> {
	// Delete the storage blob
	try {
		const storageRef = attachmentStorageRef(attachment.storagePath);
		await deleteObject(storageRef);
	} catch (error: unknown) {
		if (error instanceof FirebaseError && error.code === "storage/object-not-found") {
			// File not found? Already deleted lol
		} else {
			throw error;
		}
	}

	// Delete the metadata entry
	await deleteDoc(attachmentRef(uid, attachment));
}