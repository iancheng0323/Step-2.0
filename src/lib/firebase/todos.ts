import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
  onSnapshot,
  QuerySnapshot,
} from "firebase/firestore";
import { db } from "./config";
import type { User } from "firebase/auth";

export type TodoColor = "none" | "red" | "yellow" | "blue";
export type GoalCategory = "career" | "health" | "relationships" | "personal-growth" | "finance" | "hobbies" | "other";

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  color: TodoColor;
  category: GoalCategory | null;
  createdAt: number;
  order: number;
  listId: string | null; // null for default/legacy todos
};

const getTodosCollection = (userId: string, listId?: string) => {
  if (listId) {
    return collection(db, "users", userId, "lists", listId, "todos");
  }
  return collection(db, "users", userId, "todos");
};

// Function overloads for better TypeScript inference
export function subscribeToTodos(
  userId: string,
  callback: (todos: Todo[]) => void,
): () => void;
export function subscribeToTodos(
  userId: string,
  callback: (todos: Todo[]) => void,
  listId: string,
): () => void;
export function subscribeToTodos(
  userId: string,
  callback: (todos: Todo[]) => void,
  listId?: string,
): (() => void) {
  const todosRef = getTodosCollection(userId, listId);
  const q = query(todosRef, orderBy("order", "asc"));

  return onSnapshot(q, (snapshot: QuerySnapshot) => {
    const todos: Todo[] = [];
    snapshot.forEach((doc) => {
      todos.push({ id: doc.id, ...doc.data(), listId: listId || null } as Todo);
    });
    callback(todos);
  });
}

export const addTodo = async (userId: string, todo: Omit<Todo, "id">, listId?: string): Promise<string> => {
  const todosRef = getTodosCollection(userId, listId);
  const { listId: _, ...todoData } = todo; // Remove listId from todo data as it's in the path
  const docRef = await addDoc(todosRef, todoData);
  return docRef.id;
};

export const updateTodo = async (userId: string, todoId: string, updates: Partial<Todo>, listId?: string): Promise<void> => {
  const { listId: _, ...updateData } = updates; // Remove listId from updates
  if (listId) {
    const todoRef = doc(db, "users", userId, "lists", listId, "todos", todoId);
    await updateDoc(todoRef, updateData);
  } else {
    const todoRef = doc(db, "users", userId, "todos", todoId);
    await updateDoc(todoRef, updateData);
  }
};

export const deleteTodo = async (userId: string, todoId: string, listId?: string): Promise<void> => {
  if (listId) {
    const todoRef = doc(db, "users", userId, "lists", listId, "todos", todoId);
    await deleteDoc(todoRef);
  } else {
    const todoRef = doc(db, "users", userId, "todos", todoId);
    await deleteDoc(todoRef);
  }
};

export const reorderTodos = async (userId: string, todos: Todo[], listId?: string): Promise<void> => {
  const batch = writeBatch(db);
  todos.forEach((todo, index) => {
    if (listId) {
      const todoRef = doc(db, "users", userId, "lists", listId, "todos", todo.id);
      batch.update(todoRef, { order: index });
    } else {
      const todoRef = doc(db, "users", userId, "todos", todo.id);
      batch.update(todoRef, { order: index });
    }
  });
  await batch.commit();
};

