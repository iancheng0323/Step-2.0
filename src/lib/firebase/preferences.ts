import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./config";

export type UserPreferences = {
  showCompleted: boolean;
};

const getPreferencesDoc = (userId: string) => {
  return doc(db, "users", userId, "data", "preferences");
};

export const subscribeToPreferences = (
  userId: string,
  callback: (preferences: UserPreferences | null) => void,
): (() => void) => {
  const preferencesRef = getPreferencesDoc(userId);
  return onSnapshot(preferencesRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as UserPreferences);
    } else {
      callback(null);
    }
  });
};

export const savePreferences = async (userId: string, preferences: UserPreferences): Promise<void> => {
  const preferencesRef = getPreferencesDoc(userId);
  await setDoc(preferencesRef, preferences, { merge: true });
};

export const getPreferences = async (userId: string): Promise<UserPreferences | null> => {
  const preferencesRef = getPreferencesDoc(userId);
  const snapshot = await getDoc(preferencesRef);
  if (snapshot.exists()) {
    return snapshot.data() as UserPreferences;
  }
  return null;
};

