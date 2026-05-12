import { collection, doc, query, where, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, onSnapshot, getDocFromServer, collectionGroup, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from './errorHandler';
import { Project, Trade, Payment } from '../types';

export const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
};

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

export const getTrades = (projectId: string, userId: string, callback: (trades: Trade[]) => void, errorCallback: (error: any) => void) => {
  const q = query(collection(db, `projects/${projectId}/trades`), where('ownerId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const trades: Trade[] = snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        ...data,
        id: doc.id,
        // Fallbacks for backward compatibility
        budget: data.budget ?? data.amount ?? 0,
        amount: data.budget ?? data.amount ?? 0,
        totalClientAdvances: data.totalClientAdvances ?? data.totalAdvances ?? 0,
        totalAdvances: data.totalClientAdvances ?? data.totalAdvances ?? 0,
        totalLaborExpenses: data.totalLaborExpenses ?? 0,
        totalMaterialExpenses: data.totalMaterialExpenses ?? 0,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      };
    });
    callback(trades);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/trades`);
    errorCallback(error);
  });
};

export const getAllTrades = (userId: string, callback: (trades: Trade[]) => void, errorCallback: (error: any) => void) => {
  const q = query(collectionGroup(db, 'trades'), where('ownerId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const trades: Trade[] = snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        ...data,
        id: doc.id,
        budget: data.budget ?? data.amount ?? 0,
        amount: data.budget ?? data.amount ?? 0,
        totalClientAdvances: data.totalClientAdvances ?? data.totalAdvances ?? 0,
        totalAdvances: data.totalClientAdvances ?? data.totalAdvances ?? 0,
        totalLaborExpenses: data.totalLaborExpenses ?? 0,
        totalMaterialExpenses: data.totalMaterialExpenses ?? 0,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      };
    });
    callback(trades);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `trades group`);
    errorCallback(error);
  });
};

export const addTrade = async (projectId: string, data: Omit<Trade, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
  try {
    const path = `projects/${projectId}/trades`;
    const docRef = doc(collection(db, path));
    await setDoc(docRef, {
      ...data,
      projectId,
      budget: data.budget ?? data.amount,
      amount: data.budget ?? data.amount,
      totalClientAdvances: 0,
      totalAdvances: 0,
      totalLaborExpenses: 0,
      totalMaterialExpenses: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/trades`);
    throw error;
  }
};

export const updateTrade = async (projectId: string, tradeId: string, data: Partial<Omit<Trade, 'id' | 'projectId' | 'createdAt' | 'ownerId'>>) => {
  try {
    const updateData: any = { ...data };
    if (data.budget !== undefined) updateData.amount = data.budget;
    if (data.totalClientAdvances !== undefined) updateData.totalAdvances = data.totalClientAdvances;

    await updateDoc(doc(db, `projects/${projectId}/trades`, tradeId), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/trades/${tradeId}`);
    throw error;
  }
};

export const getPayments = (projectId: string, tradeId: string, userId: string, callback: (payments: Payment[]) => void, errorCallback: (error: any) => void) => {
  const q = query(collection(db, `projects/${projectId}/trades/${tradeId}/payments`), where('ownerId', '==', userId), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const payments: Payment[] = snapshot.docs.map(doc => ({
      ...(doc.data() as any),
      id: doc.id,
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate()
    }));
    callback(payments);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/trades/${tradeId}/payments`);
    errorCallback(error);
  });
};

export const addPayment = async (projectId: string, tradeId: string, data: Omit<Payment, 'id' | 'projectId' | 'tradeId' | 'createdAt'>, receiptImageFile?: File | null) => {
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

    // Update trade totals
    const tradeRef = doc(db, `projects/${projectId}/trades`, tradeId);
    const updates: any = {};
    if (data.type === 'client_advance' || data.type === 'advance' || data.type === 'income') {
      updates.totalClientAdvances = increment(data.amount);
      updates.totalAdvances = increment(data.amount);
    } else if (data.type === 'labor_expense') {
      updates.totalLaborExpenses = increment(data.amount);
    } else if (data.type === 'material_expense' || data.type === 'expense') {
      updates.totalMaterialExpenses = increment(data.amount);
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(tradeRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/trades/${tradeId}/payments`);
    throw error;
  }
};
