"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { subscribeToBrief, saveBrief } from "@/lib/firebase/brief";

export default function BriefPage() {
  const { user } = useAuth();
  const [intro, setIntro] = useState("");
  const [whoYouAre, setWhoYouAre] = useState("");
  const [whatYouWant, setWhatYouWant] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Subscribe to brief from Firebase
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToBrief(user.uid, (brief) => {
      if (brief) {
        setIntro(brief.intro || "");
        setWhoYouAre(brief.whoYouAre || "");
        setWhatYouWant(brief.whatYouWant || "");
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await saveBrief(user.uid, {
        intro,
        whoYouAre,
        whatYouWant,
      });
    } catch (error) {
      console.error("Error saving brief:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-auto bg-gradient-to-b from-slate-50 to-white px-4 py-10 text-slate-900 dark:from-slate-900 dark:to-slate-950 dark:text-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Personal Brief</CardTitle>
            <CardDescription>
              Define who you are, what you want to achieve, and your personal introduction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="intro" className="text-sm font-medium">
                Introduction
              </label>
              <Textarea
                id="intro"
                value={intro}
                onChange={(event) => setIntro(event.target.value)}
                placeholder="Write a brief introduction about yourself..."
                className="min-h-[120px] text-base"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="whoYouAre" className="text-sm font-medium">
                Who You Are
              </label>
              <Textarea
                id="whoYouAre"
                value={whoYouAre}
                onChange={(event) => setWhoYouAre(event.target.value)}
                placeholder="Describe who you are, your values, your personality..."
                className="min-h-[150px] text-base"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="whatYouWant" className="text-sm font-medium">
                What You Want to Achieve
              </label>
              <Textarea
                id="whatYouWant"
                value={whatYouWant}
                onChange={(event) => setWhatYouWant(event.target.value)}
                placeholder="Describe your aspirations, goals, and what you want to achieve in life..."
                className="min-h-[150px] text-base"
              />
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
              <Save className="size-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

