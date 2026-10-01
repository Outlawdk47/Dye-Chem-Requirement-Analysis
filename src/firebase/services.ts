import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './config';
import type { DatasetMeta, NormalizedRecord, CalculationSettings, SavedScenario } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Upload original file to Firebase Storage
export async function uploadExcelToStorage(file: File, datasetId: string): Promise<string> {
  try {
    const storageRef = ref(storage, `datasets/${datasetId}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.warn('Storage upload encountered error (continuing with local reference):', error);
    return `local://datasets/${datasetId}/${encodeURIComponent(file.name)}`;
  }
}

// 2. Datasets CRUD
export async function saveDatasetMeta(dataset: DatasetMeta): Promise<void> {
  const path = `datasets/${dataset.id}`;
  try {
    await setDoc(doc(db, 'datasets', dataset.id), {
      ...dataset,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getDatasetsList(): Promise<DatasetMeta[]> {
  const path = 'datasets';
  try {
    const q = query(collection(db, 'datasets'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    } as DatasetMeta));
  } catch (err) {
    if (err instanceof Error && (err.message.includes('offline') || err.message.includes('client is offline'))) {
      console.warn('Firestore is offline. Returning empty datasets list.');
      return [];
    }
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function getDatasetById(datasetId: string): Promise<DatasetMeta | null> {
  const path = `datasets/${datasetId}`;
  try {
    const docSnap = await getDoc(doc(db, 'datasets', datasetId));
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as DatasetMeta;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function updateDatasetStatus(datasetId: string, status: 'uploaded' | 'analyzed' | 'archived'): Promise<void> {
  const path = `datasets/${datasetId}`;
  try {
    await updateDoc(doc(db, 'datasets', datasetId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteDataset(datasetId: string): Promise<void> {
  const path = `datasets/${datasetId}`;
  try {
    await deleteDoc(doc(db, 'datasets', datasetId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 3. Normalized Records Batch Storage & Retrieval
export async function saveNormalizedRecords(
  datasetId: string,
  records: NormalizedRecord[]
): Promise<void> {
  const BATCH_SIZE = 400;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = records.slice(i, i + BATCH_SIZE);
    chunk.forEach((rec, idx) => {
      const recId = rec.id || `rec_${i + idx}`;
      const recRef = doc(db, 'datasets', datasetId, 'records', recId);
      batch.set(recRef, { ...rec, id: recId, datasetId });
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `datasets/${datasetId}/records`);
    }
  }
}

export async function getDatasetRecords(datasetId: string): Promise<NormalizedRecord[]> {
  const path = `datasets/${datasetId}/records`;
  try {
    const colRef = collection(db, 'datasets', datasetId, 'records');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    } as NormalizedRecord));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// 4. Settings
export async function saveUserSettings(userId: string, settings: CalculationSettings): Promise<void> {
  const path = `settings/${userId}`;
  try {
    await setDoc(doc(db, 'settings', userId), {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserSettings(userId: string): Promise<CalculationSettings | null> {
  const path = `settings/${userId}`;
  try {
    const docSnap = await getDoc(doc(db, 'settings', userId));
    if (docSnap.exists()) {
      return docSnap.data() as CalculationSettings;
    }
    return null;
  } catch (err) {
    if (err instanceof Error && (err.message.includes('offline') || err.message.includes('client is offline'))) {
      console.warn('Firestore is offline. Returning null for user settings.');
      return null;
    }
    handleFirestoreError(err, OperationType.GET, path);
  }
}

// 5. Scenarios
export async function saveScenario(scenario: SavedScenario): Promise<void> {
  const path = `scenarios/${scenario.id}`;
  try {
    await setDoc(doc(db, 'scenarios', scenario.id), scenario);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getScenarios(): Promise<SavedScenario[]> {
  const path = 'scenarios';
  try {
    const snap = await getDocs(collection(db, 'scenarios'));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as SavedScenario));
  } catch (err) {
    if (err instanceof Error && (err.message.includes('offline') || err.message.includes('client is offline'))) {
      console.warn('Firestore is offline. Returning empty scenarios.');
      return [];
    }
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function deleteScenario(scenarioId: string): Promise<void> {
  const path = `scenarios/${scenarioId}`;
  try {
    await deleteDoc(doc(db, 'scenarios', scenarioId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
