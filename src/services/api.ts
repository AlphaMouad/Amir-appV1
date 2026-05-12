import { collection, doc, query, where, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, onSnapshot, getDocFromServer, collectionGroup } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from './errorHandler';
import { Project, Travaux, Payment } from '../types';

export const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
};

// ─── Projects ────────────────────────────────────────────────────

export const getProjects = (userId: string, callback: (projects: Project[]) => void, errorCallback: (error: any) => void) => {
  const q = query(collection(db, 'projects'), where('ownerId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const projects: Project[] = snapshot.docs.map(doc => ({
      ...(doc.data() as any),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
    callback(projects);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'projects');
    errorCallback(error);
  });
};

export const addProject = async (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = doc(collection(db, 'projects'));
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'projects');
    throw error;
  }
};

export const updateProject = async (id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'ownerId'>>) => {
  try {
    await updateDoc(doc(db, 'projects', id), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
    throw error;
  }
};

export const deleteProject = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'projects', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `projects/${id}`);
    throw error;
  }
};

// ─── Travaux (stored as "trades" in Firestore for backward compat) ─────

export const getTravaux = (projectId: string, userId: string, callback: (travaux: Travaux[]) => void, errorCallback: (error: any) => void) => {
  const q = query(collection(db, `projects/${projectId}/trades`), where('ownerId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const travaux: Travaux[] = snapshot.docs.map(doc => {
      const d = doc.data() as any;
      return {
        id: doc.id,
        projectId: d.projectId || projectId,
        designation: d.designation || '',
        // New fields with backward compat
        budget: d.budget ?? d.amount ?? 0,
        totalClientAdvances: d.totalClientAdvances ?? d.totalAdvances ?? 0,
        totalMainDoeuvre: d.totalMainDoeuvre ?? 0,
        totalFourniture: d.totalFourniture ?? 0,
        createdAt: d.createdAt?.toDate(),
        updatedAt: d.updatedAt?.toDate(),
        ownerId: d.ownerId,
      };
    });
    callback(travaux);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/trades`);
    errorCallback(error);
  });
};

export const getAllTravaux = (userId: string, callback: (travaux: Travaux[]) => void, errorCallback: (error: any) => void) => {
  const q = query(collectionGroup(db, 'trades'), where('ownerId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const travaux: Travaux[] = snapshot.docs.map(doc => {
      const d = doc.data() as any;
      return {
        id: doc.id,
        projectId: d.projectId || '',
        designation: d.designation || '',
        budget: d.budget ?? d.amount ?? 0,
        totalClientAdvances: d.totalClientAdvances ?? d.totalAdvances ?? 0,
        totalMainDoeuvre: d.totalMainDoeuvre ?? 0,
        totalFourniture: d.totalFourniture ?? 0,
        createdAt: d.createdAt?.toDate(),
        updatedAt: d.updatedAt?.toDate(),
        ownerId: d.ownerId,
      };
    });
    callback(travaux);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `trades group`);
    errorCallback(error);
  });
};

export const addTravaux = async (projectId: string, data: { designation: string; budget: number; ownerId: string }) => {
  try {
    const path = `projects/${projectId}/trades`;
    const docRef = doc(collection(db, path));
    await setDoc(docRef, {
      designation: data.designation,
      budget: data.budget,
      // Also write as 'amount' for backward compat
      amount: data.budget,
      totalClientAdvances: 0,
      totalAdvances: 0,
      totalMainDoeuvre: 0,
      totalFourniture: 0,
      projectId,
      ownerId: data.ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/trades`);
    throw error;
  }
};

export const updateTravaux = async (projectId: string, travauxId: string, data: Partial<Record<string, any>>) => {
  try {
    await updateDoc(doc(db, `projects/${projectId}/trades`, travauxId), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/trades/${travauxId}`);
    throw error;
  }
};

// ─── Payments ────────────────────────────────────────────────────

export const getPayments = (projectId: string, tradeId: string, userId: string, callback: (payments: Payment[]) => void, errorCallback: (error: any) => void) => {
  const q = query(collection(db, `projects/${projectId}/trades/${tradeId}/payments`), where('ownerId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const payments: Payment[] = snapshot.docs.map(doc => {
      const d = doc.data() as any;
      return {
        ...(d as any),
        id: doc.id,
        // Backward compat: old 'advance' type → 'client_advance'
        type: d.type === 'advance' ? 'client_advance' : d.type,
        date: d.date?.toDate(),
        createdAt: d.createdAt?.toDate()
      };
    });
    callback(payments);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/trades/${tradeId}/payments`);
    errorCallback(error);
  });
};

export const getAllPayments = (userId: string, callback: (payments: Payment[]) => void, errorCallback: (error: any) => void) => {
  const q = query(collectionGroup(db, 'payments'), where('ownerId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const payments: Payment[] = snapshot.docs.map(doc => {
      const d = doc.data() as any;
      return {
        ...(d as any),
        id: doc.id,
        type: d.type === 'advance' ? 'client_advance' : d.type,
        date: d.date?.toDate(),
        createdAt: d.createdAt?.toDate()
      };
    });
    callback(payments);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'payments group');
    errorCallback(error);
  });
};

export const addPayment = async (
  projectId: string,
  tradeId: string,
  data: Omit<Payment, 'id' | 'projectId' | 'tradeId' | 'createdAt'>,
  receiptImageFile?: File | null
) => {
  try {
    const path = `projects/${projectId}/trades/${tradeId}/payments`;
    const docRef = doc(collection(db, path));

    let receiptUrl = undefined;
    if (receiptImageFile) {
      const imgbbApiKey = import.meta.env.VITE_IMGBB_API_KEY;
      if (!imgbbApiKey) throw new Error("VITE_IMGBB_API_KEY is not configured in Vercel Environment Variables.");

      const formData = new FormData();
      formData.append('image', receiptImageFile);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error("ImgBB Upload Failed. Check your API Key.");
      }

      const json = await response.json();
      receiptUrl = json.data.url;
    }

    await setDoc(docRef, {
      ...data,
      projectId,
      tradeId,
      ...(receiptUrl ? { receiptUrl } : {}),
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/trades/${tradeId}/payments`);
    throw error;
  }
};

// ─── Backward compat aliases ─────────────────────────────────────
export const getTrades = getTravaux;
export const getAllTrades = getAllTravaux;
export const addTrade = async (projectId: string, data: any) => {
  return addTravaux(projectId, {
    designation: data.designation,
    budget: data.amount || data.budget || 0,
    ownerId: data.ownerId,
  });
};
export const updateTrade = updateTravaux;
