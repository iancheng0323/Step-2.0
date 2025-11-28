"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Edit2, Plus, Trash2 } from "lucide-react";

type GoalStatus = "not-started" | "in-progress" | "completed" | "on-hold";

type GoalCategory = "career" | "health" | "relationships" | "personal-growth" | "finance" | "hobbies" | "other";

type Goal = {
  id: string;
  name: string;
  description: string;
  status: GoalStatus;
  category: GoalCategory | null;
  createdAt: number;
};

const STORAGE_KEY = "goals-webapp";

const GOAL_CATEGORIES: Array<{ value: GoalCategory; label: string }> = [
  { value: "career", label: "Career" },
  { value: "health", label: "Health" },
  { value: "relationships", label: "Relationships" },
  { value: "personal-growth", label: "Personal Growth" },
  { value: "finance", label: "Finance" },
  { value: "hobbies", label: "Hobbies" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS: Array<{ value: GoalStatus; label: string; color: string }> = [
  { value: "not-started", label: "Not Started", color: "bg-slate-200 text-slate-700" },
  { value: "in-progress", label: "In Progress", color: "bg-blue-200 text-blue-700" },
  { value: "completed", label: "Completed", color: "bg-green-200 text-green-700" },
  { value: "on-hold", label: "On Hold", color: "bg-yellow-200 text-yellow-700" },
];

const STATUS_LOOKUP = STATUS_OPTIONS.reduce<Record<GoalStatus, (typeof STATUS_OPTIONS)[number]>>(
  (acc, option) => {
    acc[option.value] = option;
    return acc;
  },
  {} as Record<GoalStatus, (typeof STATUS_OPTIONS)[number]>,
);

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [newGoalCategory, setNewGoalCategory] = useState<GoalCategory | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Goal[];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGoals(parsed);
    } catch {
      // ignore bad payloads
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals]);

  const addGoal = useCallback(() => {
    const trimmed = newGoalName.trim();
    if (!trimmed) return;
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      name: trimmed,
      description: newGoalDescription.trim(),
      status: "not-started",
      category: newGoalCategory,
      createdAt: Date.now(),
    };
    setGoals((prev) => [...prev, newGoal]);
    setNewGoalName("");
    setNewGoalDescription("");
    setNewGoalCategory(null);
  }, [newGoalName, newGoalDescription, newGoalCategory]);

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals((prev) => prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal)));
  };

  const removeGoal = (id: string) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
  };

  const startEditing = (goal: Goal) => {
    setEditingId(goal.id);
    setNewGoalName(goal.name);
    setNewGoalDescription(goal.description);
    setNewGoalCategory(goal.category);
  };

  const saveEditing = () => {
    if (!editingId) return;
    const trimmed = newGoalName.trim();
    if (!trimmed) {
      cancelEditing();
      return;
    }
    updateGoal(editingId, {
      name: trimmed,
      description: newGoalDescription.trim(),
      category: newGoalCategory,
    });
    cancelEditing();
  };

  const cancelEditing = () => {
    setEditingId(null);
    setNewGoalName("");
    setNewGoalDescription("");
    setNewGoalCategory(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      action();
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (editingId) cancelEditing();
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-auto bg-gradient-to-b from-slate-50 to-white px-4 py-10 text-slate-900 dark:from-slate-900 dark:to-slate-950 dark:text-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Goal Management</CardTitle>
            <CardDescription>Create and track your goals across different life areas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Input
                value={newGoalName}
                onChange={(event) => setNewGoalName(event.target.value)}
                onKeyDown={(event) => handleKeyDown(event, addGoal)}
                placeholder="Goal name"
                className="text-base"
              />
              <Input
                value={newGoalDescription}
                onChange={(event) => setNewGoalDescription(event.target.value)}
                onKeyDown={(event) => handleKeyDown(event, addGoal)}
                placeholder="Description (optional)"
                className="text-base"
              />
              <Select
                value={newGoalCategory || "none"}
                onValueChange={(value) => setNewGoalCategory(value === "none" ? null : (value as GoalCategory))}
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {GOAL_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addGoal} disabled={!newGoalName.trim()} className="w-full gap-2">
                <Plus className="size-4" />
                Add Goal
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Goal Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {GOAL_CATEGORIES.map((category) => {
                const count = goals.filter((g) => g.category === category.value).length;
                return (
                  <Button
                    key={category.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {category.label}
                    {count > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                        {count}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {goals.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No goals yet. Create your first goal above.
              </CardContent>
            </Card>
          ) : (
            goals.map((goal) => {
              const statusConfig = STATUS_LOOKUP[goal.status];
              const isEditing = editingId === goal.id;
              return (
                <Card key={goal.id}>
                  <CardContent className="p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <Input
                          value={newGoalName}
                          onChange={(event) => setNewGoalName(event.target.value)}
                          onKeyDown={(event) => handleKeyDown(event, saveEditing)}
                          placeholder="Goal name"
                          className="text-base font-medium"
                          autoFocus
                        />
                        <Input
                          value={newGoalDescription}
                          onChange={(event) => setNewGoalDescription(event.target.value)}
                          onKeyDown={(event) => handleKeyDown(event, saveEditing)}
                          placeholder="Description (optional)"
                          className="text-base"
                        />
                        <Select
                          value={newGoalCategory || "none"}
                          onValueChange={(value) => setNewGoalCategory(value === "none" ? null : (value as GoalCategory))}
                        >
                          <SelectTrigger className="text-base">
                            <SelectValue placeholder="Category (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No category</SelectItem>
                            {GOAL_CATEGORIES.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button onClick={saveEditing} size="sm">
                            Save
                          </Button>
                          <Button onClick={cancelEditing} variant="outline" size="sm">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <h3 className="text-lg font-semibold">{goal.name}</h3>
                          {goal.description && (
                            <p className="text-sm text-muted-foreground">{goal.description}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                                statusConfig.color,
                              )}
                            >
                              {statusConfig.label}
                            </span>
                            {goal.category && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {GOAL_CATEGORIES.find((c) => c.value === goal.category)?.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Status</span>
                                <span className="text-xs">⋯</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel className="text-xs text-muted-foreground">
                                Status
                              </DropdownMenuLabel>
                              {STATUS_OPTIONS.map((option) => (
                                <DropdownMenuItem
                                  key={option.value}
                                  onClick={() => updateGoal(goal.id, { status: option.value })}
                                  className="text-sm"
                                >
                                  {option.label}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuLabel className="text-xs text-muted-foreground">
                                Category
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => updateGoal(goal.id, { category: null })}
                                className="text-sm"
                              >
                                No category
                              </DropdownMenuItem>
                              {GOAL_CATEGORIES.map((category) => (
                                <DropdownMenuItem
                                  key={category.value}
                                  onClick={() => updateGoal(goal.id, { category: category.value })}
                                  className="text-sm"
                                >
                                  {category.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(goal)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="size-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGoal(goal.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

