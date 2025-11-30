import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./config";

export type PersonalBrief = {
  intro: string;
  whoYouAre: string;
  whatYouWant: string;
};

const getBriefDoc = (userId: string) => {
  return doc(db, "users", userId, "data", "brief");
};

export const subscribeToBrief = (
  userId: string,
  callback: (brief: PersonalBrief | null) => void,
): (() => void) => {
  const briefRef = getBriefDoc(userId);
  return onSnapshot(briefRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as PersonalBrief);
    } else {
      callback(null);
    }
  });
};

export const saveBrief = async (userId: string, brief: PersonalBrief): Promise<void> => {
  const briefRef = getBriefDoc(userId);
  await setDoc(briefRef, brief, { merge: true });
};

export const getBrief = async (userId: string): Promise<PersonalBrief | null> => {
  const briefRef = getBriefDoc(userId);
  const snapshot = await getDoc(briefRef);
  if (snapshot.exists()) {
    return snapshot.data() as PersonalBrief;
  }
  return null;
};

