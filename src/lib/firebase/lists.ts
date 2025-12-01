import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  QuerySnapshot,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";

export type TodoList = {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  order: number;
};

const getListsCollection = (userId: string) => {
  return collection(db, "users", userId, "lists");
};

export const subscribeToLists = (
  userId: string,
  callback: (lists: TodoList[]) => void,
): (() => void) => {
  const listsRef = getListsCollection(userId);
  const q = query(listsRef, orderBy("order", "asc"));

  return onSnapshot(q, (snapshot: QuerySnapshot) => {
    const lists: TodoList[] = [];
    snapshot.forEach((doc) => {
      lists.push({ id: doc.id, ...doc.data() } as TodoList);
    });
    callback(lists);
  });
};

export const addList = async (userId: string, list: Omit<TodoList, "id">): Promise<string> => {
  const listsRef = getListsCollection(userId);
  const docRef = await addDoc(listsRef, list);
  return docRef.id;
};

export const updateList = async (userId: string, listId: string, updates: Partial<TodoList>): Promise<void> => {
  const listRef = doc(db, "users", userId, "lists", listId);
  await updateDoc(listRef, updates);
};

export const deleteList = async (userId: string, listId: string): Promise<void> => {
  // First, delete all todos in this list
  const todosRef = collection(db, "users", userId, "lists", listId, "todos");
  const todosSnapshot = await getDocs(todosRef);
  
  const batch = writeBatch(db);
  todosSnapshot.forEach((todoDoc) => {
    const todoRef = doc(db, "users", userId, "lists", listId, "todos", todoDoc.id);
    batch.delete(todoRef);
  });
  
  // Then delete the list itself
  const listRef = doc(db, "users", userId, "lists", listId);
  batch.delete(listRef);
  
  await batch.commit();
};

export const reorderLists = async (userId: string, lists: TodoList[]): Promise<void> => {
  const batch = writeBatch(db);
  lists.forEach((list, index) => {
    const listRef = doc(db, "users", userId, "lists", list.id);
    batch.update(listRef, { order: index });
  });
  await batch.commit();
};

