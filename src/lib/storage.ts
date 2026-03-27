import { Product, Order } from '../types';
import { db, auth } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, query, where, limit } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const getProducts = async (): Promise<Product[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'products'));
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    return products;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'products');
    return [];
  }
};

export const saveProducts = async (products: Product[]) => {
  try {
    for (const product of products) {
      await setDoc(doc(db, 'products', product.id), product);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'products');
  }
};

export const saveProduct = async (product: Product) => {
  try {
    await setDoc(doc(db, 'products', product.id), product);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
  }
};

export const deleteProduct = async (productId: string) => {
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
  }
};

export const getOrders = async (): Promise<Order[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'orders'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'orders');
    return [];
  }
};

export const getOrderByDetails = async (orderNumber: string, phone: string): Promise<Order | null> => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('orderNumber', '==', orderNumber.toUpperCase()),
      where('customerPhone', '==', phone),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Order;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'orders/query');
    return null;
  }
};

export const saveOrder = async (order: Order) => {
  try {
    await setDoc(doc(db, 'orders', order.id), order);
    // Save to local history
    const history = JSON.parse(localStorage.getItem('opulence_order_history') || '[]');
    if (!history.includes(order.id)) {
      localStorage.setItem('opulence_order_history', JSON.stringify([...history, order.id]));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${order.id}`);
  }
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  try {
    await updateDoc(doc(db, 'orders', orderId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
  }
};

export const deleteOrder = async (orderId: string) => {
  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
  }
};

export const getDeliveryLocations = async (): Promise<any[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'delivery_locations'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'delivery_locations');
    return [];
  }
};

export const saveDeliveryLocations = async (locations: any[]) => {
  try {
    for (const loc of locations) {
      await setDoc(doc(db, 'delivery_locations', loc.id), loc);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'delivery_locations');
  }
};

export const deleteDeliveryLocation = async (locationId: string) => {
  try {
    await deleteDoc(doc(db, 'delivery_locations', locationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `delivery_locations/${locationId}`);
  }
};

export const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0
  }).format(price);
};
