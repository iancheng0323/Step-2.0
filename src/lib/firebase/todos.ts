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

export type TodoColor = "none" | "red" | "green" | "yellow" | "blue";
export type GoalCategory = "career" | "health" | "relationships" | "personal-growth" | "finance" | "hobbies" | "other";

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  color: TodoColor;
  category: GoalCategory | null;
  createdAt: number;
  order: number;
};

const getTodosCollection = (userId: string) => {
  return collection(db, "users", userId, "todos");
};

export const subscribeToTodos = (
  userId: string,
  callback: (todos: Todo[]) => void,
): (() => void) => {
  const todosRef = getTodosCollection(userId);
  const q = query(todosRef, orderBy("order", "asc"));

  return onSnapshot(q, (snapshot: QuerySnapshot) => {
    const todos: Todo[] = [];
    snapshot.forEach((doc) => {
      todos.push({ id: doc.id, ...doc.data() } as Todo);
    });
    callback(todos);
  });
};

export const addTodo = async (userId: string, todo: Omit<Todo, "id">): Promise<string> => {
  const todosRef = getTodosCollection(userId);
  const docRef = await addDoc(todosRef, todo);
  return docRef.id;
};

export const updateTodo = async (userId: string, todoId: string, updates: Partial<Todo>): Promise<void> => {
  const todoRef = doc(db, "users", userId, "todos", todoId);
  await updateDoc(todoRef, updates);
};

export const deleteTodo = async (userId: string, todoId: string): Promise<void> => {
  const todoRef = doc(db, "users", userId, "todos", todoId);
  await deleteDoc(todoRef);
};

export const reorderTodos = async (userId: string, todos: Todo[]): Promise<void> => {
  const batch = writeBatch(db);
  todos.forEach((todo, index) => {
    const todoRef = doc(db, "users", userId, "todos", todo.id);
    batch.update(todoRef, { order: index });
  });
  await batch.commit();
};

