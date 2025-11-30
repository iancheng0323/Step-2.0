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
} from "firebase/firestore";
import { db } from "./config";

export type GoalStatus = "not-started" | "in-progress" | "completed" | "on-hold";
export type GoalCategory = "career" | "health" | "relationships" | "personal-growth" | "finance" | "hobbies" | "other";

export type Goal = {
  id: string;
  name: string;
  description: string;
  status: GoalStatus;
  category: GoalCategory | null;
  createdAt: number;
};

const getGoalsCollection = (userId: string) => {
  return collection(db, "users", userId, "goals");
};

export const subscribeToGoals = (
  userId: string,
  callback: (goals: Goal[]) => void,
): (() => void) => {
  const goalsRef = getGoalsCollection(userId);
  const q = query(goalsRef, orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot: QuerySnapshot) => {
    const goals: Goal[] = [];
    snapshot.forEach((doc) => {
      goals.push({ id: doc.id, ...doc.data() } as Goal);
    });
    callback(goals);
  });
};

export const addGoal = async (userId: string, goal: Omit<Goal, "id">): Promise<string> => {
  const goalsRef = getGoalsCollection(userId);
  const docRef = await addDoc(goalsRef, goal);
  return docRef.id;
};

export const updateGoal = async (userId: string, goalId: string, updates: Partial<Goal>): Promise<void> => {
  const goalRef = doc(db, "users", userId, "goals", goalId);
  await updateDoc(goalRef, updates);
};

export const deleteGoal = async (userId: string, goalId: string): Promise<void> => {
  const goalRef = doc(db, "users", userId, "goals", goalId);
  await deleteDoc(goalRef);
};

