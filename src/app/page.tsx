"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toggle } from "@/components/ui/toggle";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Flag, GripVertical, Plus, Sparkles, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useSearchParams } from "next/navigation";
import {
  subscribeToTodos,
  addTodo as addTodoToFirebase,
  updateTodo,
  deleteTodo as deleteTodoFromFirebase,
  reorderTodos,
  type Todo,
  type TodoColor,
} from "@/lib/firebase/todos";
import {
  subscribeToPreferences,
  savePreferences,
} from "@/lib/firebase/preferences";
import {
  subscribeToLists,
  updateList,
  type TodoList,
} from "@/lib/firebase/lists";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_COLOR: TodoColor = "none";

const COLOR_OPTIONS: Array<{
  value: TodoColor;
  label: string;
  dot: string;
  focusColor: string;
}> = [
  { value: "none", label: "No priority", dot: "bg-slate-300", focusColor: "border-slate-500" },
  { value: "red", label: "Priority 1", dot: "bg-red-500", focusColor: "border-red-500" },
  { value: "yellow", label: "Priority 2", dot: "bg-yellow-400", focusColor: "border-yellow-500" },
  { value: "blue", label: "Priority 3", dot: "bg-blue-500", focusColor: "border-blue-500" },
];

const COLOR_LOOKUP = COLOR_OPTIONS.reduce<Record<TodoColor | "green", (typeof COLOR_OPTIONS)[number]>>(
  (acc, option) => {
    acc[option.value] = option;
    return acc;
  },
  {
    // Fallback for existing todos with green color (no longer selectable)
    green: { value: "green" as TodoColor, label: "Priority 4", dot: "bg-green-500", focusColor: "border-green-500" },
  } as Record<TodoColor | "green", (typeof COLOR_OPTIONS)[number]>,
);


export default function Home() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const listId = searchParams.get("listId");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [currentList, setCurrentList] = useState<TodoList | null>(null);
  const [isEditingListName, setIsEditingListName] = useState(false);
  const [isEditingListDescription, setIsEditingListDescription] = useState(false);
  const [editingListName, setEditingListName] = useState("");
  const [editingListDescription, setEditingListDescription] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [rewritingId, setRewritingId] = useState<string | null>(null);
  const [editingTexts, setEditingTexts] = useState<Record<string, string>>({});
  const [focusedTodoId, setFocusedTodoId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const listNameInputRef = useRef<HTMLInputElement | null>(null);
  const listDescriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Subscribe to current list
  useEffect(() => {
    if (!user || !listId) {
      setCurrentList(null);
      return;
    }

    const unsubscribe = subscribeToLists(user.uid, (lists) => {
      const list = lists.find(l => l.id === listId);
      setCurrentList(list || null);
      if (list) {
        setEditingListName(list.name);
        setEditingListDescription(list.description);
      }
    });

    return () => unsubscribe();
  }, [user, listId]);

  // Subscribe to todos from Firebase
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToTodos(user.uid, (fetchedTodos) => {
      setTodos(fetchedTodos);
      // Clear editing texts for todos that no longer exist or have been updated externally
      setEditingTexts(prev => {
        const newState = { ...prev };
        fetchedTodos.forEach(todo => {
          // If the todo text changed externally, clear our local edit
          if (newState[todo.id] && newState[todo.id] !== todo.text) {
            // Only clear if it's not the currently focused todo (user is still editing)
            if (focusedTodoId !== todo.id) {
              delete newState[todo.id];
            }
          }
        });
        // Remove entries for todos that no longer exist
        Object.keys(newState).forEach(id => {
          if (!fetchedTodos.find(t => t.id === id)) {
            delete newState[id];
          }
        });
        return newState;
      });
    }, listId || undefined);

    return () => unsubscribe();
  }, [user, listId, focusedTodoId]);

  // Subscribe to user preferences from Firebase
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToPreferences(user.uid, (preferences) => {
      if (preferences) {
        setShowCompleted(preferences.showCompleted);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!pendingFocusId) return;
    const frame = window.requestAnimationFrame(() => {
      const target = inputRefs.current[pendingFocusId];
      if (target) {
        target.focus();
        target.select();
        setPendingFocusId(null);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingFocusId, todos.length]);

  const addTodo = useCallback(async () => {
    if (!user) return;
    
    // Calculate the next order value (max order + 1, or 0 if no todos)
    const maxOrder = todos.length > 0 ? Math.max(...todos.map(t => t.order ?? 0)) : -1;
    
    const newEntry: Omit<Todo, "id"> = {
      text: "",
      done: false,
      color: DEFAULT_COLOR,
      category: null, // Keep for backward compatibility but not used in UI
      createdAt: Date.now(),
      order: maxOrder + 1,
      listId: listId || null,
    };
    
    const id = await addTodoToFirebase(user.uid, newEntry, listId || undefined);
    setPendingFocusId(id);
  }, [user, todos, listId]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        addTodo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addTodo]);

  const completedCount = useMemo(() => todos.filter((todo) => todo.done).length, [todos]);

  // Priority order: red=1, yellow=2, blue=3, none=4
  const getPriorityValue = (color: TodoColor): number => {
    switch (color) {
      case "red":
        return 1;
      case "yellow":
        return 2;
      case "blue":
        return 3;
      case "none":
        return 4;
      default:
        return 4;
    }
  };

  const visibleTodos = useMemo(
    () => (showCompleted ? todos : todos.filter((todo) => !todo.done)),
    [showCompleted, todos],
  );

  // One-time sort by priority
  const sortByPriority = useCallback(async () => {
    if (!user) return;
    
    const visibleTodosToSort = showCompleted ? todos : todos.filter((todo) => !todo.done);
    const hiddenTodos = showCompleted ? [] : todos.filter((todo) => todo.done);
    
    // Sort visible todos by priority
    const sortedVisible = [...visibleTodosToSort].sort((a, b) => {
      const priorityA = getPriorityValue(a.color);
      const priorityB = getPriorityValue(b.color);
      // If priorities are equal, maintain original order (by createdAt as tiebreaker)
      if (priorityA === priorityB) {
        return (a.createdAt || 0) - (b.createdAt || 0);
      }
      return priorityA - priorityB;
    });
    
    // Combine: sorted visible todos first, then hidden todos in their original order
    const allTodosReordered = [...sortedVisible, ...hiddenTodos];
    
    // Update order field for all todos to reflect the new sort
    await reorderTodos(user.uid, allTodosReordered, listId || undefined);
  }, [user, todos, showCompleted, listId]);

  // One-time sort by added time
  const sortByAddedTime = useCallback(async () => {
    if (!user) return;
    
    const visibleTodosToSort = showCompleted ? todos : todos.filter((todo) => !todo.done);
    const hiddenTodos = showCompleted ? [] : todos.filter((todo) => todo.done);
    
    // Sort visible todos by added time (newest first)
    const sortedVisible = [...visibleTodosToSort].sort((a, b) => {
      // Newest first (higher timestamp = more recent)
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    
    // Combine: sorted visible todos first, then hidden todos in their original order
    const allTodosReordered = [...sortedVisible, ...hiddenTodos];
    
    // Update order field for all todos to reflect the new sort
    await reorderTodos(user.uid, allTodosReordered, listId || undefined);
  }, [user, todos, showCompleted, listId]);

  const toggleTodo = async (id: string, nextChecked: boolean) => {
    if (!user) return;
    
    if (nextChecked) {
      // When marking as done, move it after the last undone item
      const undoneTodos = todos.filter(t => !t.done && t.id !== id);
      const maxUndoneOrder = undoneTodos.length > 0 
        ? Math.max(...undoneTodos.map(t => t.order ?? 0))
        : -1;
      
      await updateTodo(user.uid, id, { done: true, order: maxUndoneOrder + 1 }, listId || undefined);
    } else {
      // When marking as undone, keep current order (or move to end of undone items)
      // For now, we'll just update the done status
      await updateTodo(user.uid, id, { done: false }, listId || undefined);
    }
  };

  const updateTodoText = async (id: string, text: string) => {
    if (!user) return;
    await updateTodo(user.uid, id, { text }, listId || undefined);
  };

  // Save todo text to database
  const saveTodoText = useCallback(async (id: string, text: string) => {
    if (!user) return;
    const currentTodo = todos.find(t => t.id === id);
    // Only save if text has actually changed
    if (currentTodo && currentTodo.text !== text) {
      await updateTodo(user.uid, id, { text }, listId || undefined);
    }
  }, [user, todos, listId]);

  // Handle input change - update local state only
  const handleTextChange = (id: string, text: string) => {
    setEditingTexts(prev => ({ ...prev, [id]: text }));
  };

  // Handle blur - save to database
  const handleTextBlur = useCallback(async (id: string) => {
    const text = editingTexts[id] ?? todos.find(t => t.id === id)?.text ?? "";
    await saveTodoText(id, text);
    setEditingTexts(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
    setFocusedTodoId(null);
  }, [editingTexts, todos, saveTodoText]);

  // Handle focus - start auto-save interval
  const handleTextFocus = (id: string) => {
    setFocusedTodoId(id);
    // Initialize editing text if not already set
    const currentTodo = todos.find(t => t.id === id);
    if (currentTodo && editingTexts[id] === undefined) {
      setEditingTexts(prev => ({ ...prev, [id]: currentTodo.text }));
    }
  };

  // Auto-save every 3 seconds for focused todo
  useEffect(() => {
    if (focusedTodoId) {
      // Clear any existing interval
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
      
      // Set up new interval to save every 3 seconds
      saveIntervalRef.current = setInterval(() => {
        const currentTodo = todos.find(t => t.id === focusedTodoId);
        const text = editingTexts[focusedTodoId] ?? currentTodo?.text;
        if (text && currentTodo && text !== currentTodo.text) {
          saveTodoText(focusedTodoId, text);
        }
      }, 3000);

      return () => {
        if (saveIntervalRef.current) {
          clearInterval(saveIntervalRef.current);
          saveIntervalRef.current = null;
        }
      };
    } else {
      // Clear interval when no todo is focused
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    }
  }, [focusedTodoId, editingTexts, todos, saveTodoText]);

  const updateTodoColor = async (id: string, color: TodoColor) => {
    if (!user) return;
    await updateTodo(user.uid, id, { color }, listId || undefined);
  };

  const removeTodo = async (id: string) => {
    if (!user) return;
    await deleteTodoFromFirebase(user.uid, id, listId || undefined);
  };

  const rewriteTodo = async (id: string, currentText: string) => {
    if (!user || !currentText.trim() || rewritingId) return;
    
    setRewritingId(id);
    if (process.env.NODE_ENV === 'development') {
      console.log("🔄 Rewrite function called - using latest code version");
    }
    try {
      // Use the SDK from client-side (it knows the correct model names)
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key is not configured");
      }

      // Get the current todo to access priority (color)
      const currentTodo = todos.find(t => t.id === id);
      const priority = currentTodo?.color && currentTodo.color !== "none"
        ? (COLOR_LOOKUP[currentTodo.color]?.label || "No priority")
        : "No priority";

      // Fetch brief
      const briefResponse = await fetch(`/api/user-data/brief?userId=${user.uid}`)
        .then(res => res.json())
        .catch(() => ({ brief: null }));

      const brief = briefResponse.brief || { intro: "", whoYouAre: "", whatYouWant: "" };

      // Load prompt template from file
      const promptTemplate = await fetch('/api/prompts/rewrite-todo').then(res => res.text()).catch(() => null);
      
      // Replace all placeholders in the prompt
      let prompt = promptTemplate || `Rewrite the following todo item to be clear and concise. Keep the essential meaning but make it more direct and actionable. Consider the user's priorities and personal context when rewriting. Return only the rewritten text, nothing else.

Personal Context:
Introduction: {intro}
Who You Are: {whoYouAre}
What You Want to Achieve: {whatYouWant}

Todo Information:
Text: {text}
Priority: {priority}

Rewritten:`;

      prompt = prompt
        .replace(/{intro}/g, brief.intro || "Not provided")
        .replace(/{whoYouAre}/g, brief.whoYouAre || "Not provided")
        .replace(/{whatYouWant}/g, brief.whatYouWant || "Not provided")
        .replace(/{text}/g, currentText)
        .replace(/{priority}/g, priority);

      // Dynamically import the SDK to use it client-side
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Try different model names - SDK will use correct endpoint
      let rewrittenText: string | null = null;
      
      // Try models in order of preference - using Gemini 2.0 Flash-Lite as primary
      // Based on official documentation: https://ai.google.dev/gemini-api/docs/models?hl=zh-tw#gemini-2.0-flash-lite
      const modelsToTry = [
        "gemini-2.0-flash-lite",     // Primary: Gemini 2.0 Flash-Lite (fastest, most cost-effective)
        "gemini-2.0-flash-lite-001", // Stable version of 2.0 Flash-Lite
        "gemini-1.5-flash",          // Fallback: Gemini 1.5 Flash
        "gemini-1.5-pro",            // Fallback: Gemini 1.5 Pro
        "gemini-pro",                // Legacy fallback
      ];
      let lastError: Error | null = null;
      
      for (const modelName of modelsToTry) {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Trying model: ${modelName}...`);
          }
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          rewrittenText = response.text().trim();
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Success with model: ${modelName}`);
          }
          break;
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`❌ Model ${modelName} failed:`, e);
          }
          lastError = e instanceof Error ? e : new Error(String(e));
          continue;
        }
      }
      
      if (!rewrittenText) {
        throw lastError || new Error("All model attempts failed. Please check your API key and available models. The error suggests calling ListModels to see available models.");
      }

      await updateTodo(user.uid, id, { text: rewrittenText }, listId || undefined);
    } catch (error) {
      console.error("Failed to rewrite todo:", error);
      console.error("Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // You could add a toast notification here if you have one
      let errorMessage = "Failed to rewrite todo. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
        // Show more helpful messages
        if (error.message.includes("Network error") || error.message.includes("fetch failed")) {
          errorMessage = "Network error: Unable to connect to Gemini API. Please check your internet connection and try again.";
        } else if (error.message.includes("401") || error.message.includes("API_KEY")) {
          errorMessage = "Invalid API key. Please check your Gemini API key configuration.";
        }
      }
      alert(errorMessage);
    } finally {
      setRewritingId(null);
    }
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!user) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      
      const oldIndex = visibleTodos.findIndex((todo) => todo.id === active.id);
      const newIndex = visibleTodos.findIndex((todo) => todo.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      
      const reorderedTodos = arrayMove(visibleTodos, oldIndex, newIndex);
      await reorderTodos(user.uid, reorderedTodos, listId || undefined);
    },
    [user, visibleTodos, listId],
  );

  const handleInputKeyDown = useCallback(async (id: string, event: React.KeyboardEvent<HTMLInputElement>) => {
    // Don't handle Shift+Enter (used for adding new todos)
    if (event.shiftKey && event.key === "Enter") {
      return;
    }
    
    if (event.key === "Enter" || event.key === "Escape") {
      // Save before blurring
      const text = editingTexts[id] ?? todos.find(t => t.id === id)?.text ?? "";
      await saveTodoText(id, text);
      setEditingTexts(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      setFocusedTodoId(null);
      
      // Safely blur the input
      if (event.currentTarget) {
        event.currentTarget.blur();
      }
    }
  }, [editingTexts, todos, saveTodoText]);

  // Handle list name editing
  const handleListNameBlur = async () => {
    if (!user || !listId || !currentList) return;
    const newName = editingListName.trim();
    if (newName && newName !== currentList.name) {
      await updateList(user.uid, listId, { name: newName });
    } else {
      setEditingListName(currentList.name);
    }
    setIsEditingListName(false);
  };

  const handleListNameKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      await handleListNameBlur();
    } else if (e.key === "Escape") {
      setEditingListName(currentList?.name || "");
      setIsEditingListName(false);
    }
  };

  // Handle list description editing
  const handleListDescriptionBlur = async () => {
    if (!user || !listId || !currentList) return;
    const newDescription = editingListDescription.trim();
    if (newDescription !== currentList.description) {
      await updateList(user.uid, listId, { description: newDescription });
    } else {
      setEditingListDescription(currentList.description);
    }
    setIsEditingListDescription(false);
  };

  const handleListDescriptionKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setEditingListDescription(currentList?.description || "");
      setIsEditingListDescription(false);
    }
  };

  // Focus list name input when editing starts
  useEffect(() => {
    if (isEditingListName && listNameInputRef.current) {
      listNameInputRef.current.focus();
      listNameInputRef.current.select();
    }
  }, [isEditingListName]);

  // Focus list description input when editing starts
  useEffect(() => {
    if (isEditingListDescription && listDescriptionInputRef.current) {
      listDescriptionInputRef.current.focus();
    }
  }, [isEditingListDescription]);

  if (!listId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 py-10 text-slate-900 dark:from-slate-900 dark:to-slate-950 dark:text-slate-50">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">
                Welcome to Life Planner
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Your personal task management and life organization tool
              </p>
            </div>
            <div className="space-y-3 text-left max-w-lg mx-auto pt-4">
              <p className="text-base text-slate-700 dark:text-slate-300">
                Life Planner helps you organize your tasks, goals, and daily activities in a simple and intuitive way. 
                Create multiple lists to organize different aspects of your life, set priorities, and track your progress.
              </p>
              <p className="text-base text-slate-700 dark:text-slate-300">
                To get started, create a new list from the sidebar or select an existing list to view and manage your tasks.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-auto bg-gradient-to-b from-slate-50 to-white px-4 py-10 text-slate-900 dark:from-slate-900 dark:to-slate-950 dark:text-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                {isEditingListName ? (
                  <Input
                    ref={listNameInputRef}
                    value={editingListName}
                    onChange={(e) => setEditingListName(e.target.value)}
                    onBlur={handleListNameBlur}
                    onKeyDown={handleListNameKeyDown}
                    className="text-2xl font-semibold"
                    placeholder="List name"
                  />
                ) : (
                  <div
                    className="group flex items-center gap-2"
                    onClick={() => setIsEditingListName(true)}
                  >
                    <CardTitle className="text-2xl cursor-text">
                      {currentList?.name || "Unnamed List"}
                    </CardTitle>
                    <Pencil className="size-4 opacity-0 transition-opacity group-hover:opacity-50 text-muted-foreground" />
                  </div>
                )}
                {isEditingListDescription ? (
                  <Textarea
                    ref={listDescriptionInputRef}
                    value={editingListDescription}
                    onChange={(e) => setEditingListDescription(e.target.value)}
                    onBlur={handleListDescriptionBlur}
                    onKeyDown={handleListDescriptionKeyDown}
                    className="text-sm text-muted-foreground resize-none"
                    placeholder="List description (optional)"
                    rows={2}
                  />
                ) : (
                  <div
                    className="group flex items-center gap-2"
                    onClick={() => setIsEditingListDescription(true)}
                  >
                    <p className="text-sm text-muted-foreground cursor-text min-h-[2.5rem]">
                      {currentList?.description || "Click to add a description"}
                    </p>
                    <Pencil className="size-3 opacity-0 transition-opacity group-hover:opacity-50 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={sortByPriority}
                  className="text-sm"
                >
                  Sort by Priority
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={sortByAddedTime}
                  className="text-sm"
                >
                  Sort by Added Time
                </Button>
              </div>
              <Toggle
                pressed={!showCompleted}
                onPressedChange={async (pressed) => {
                  const newValue = !pressed;
                  setShowCompleted(newValue);
                  if (user) {
                    await savePreferences(user.uid, { showCompleted: newValue });
                  }
                }}
                aria-label="Hide completed tasks"
                className="gap-2 text-sm"
              >
                {showCompleted ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                {showCompleted ? "Showing done" : "Hidden done"}
              </Toggle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {todos.length === 0
                ? "Nothing on the board yet."
                : `${todos.length - completedCount} active • ${completedCount} done`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={visibleTodos.map((todo) => todo.id)}
                strategy={verticalListSortingStrategy}
              >
                {visibleTodos.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">
                    {todos.length === 0
                      ? "Click Add task to create your first item."
                      : "All done! Reveal completed items to review them."}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {visibleTodos.map((todo) => {
                      const colorConfig = COLOR_LOOKUP[todo.color] || COLOR_LOOKUP.none;
                      return (
                        <SortableTodo key={todo.id} id={todo.id}>
                          {({ attributes, listeners, setActivatorNodeRef, isDragging }) => (
                            <div
                              className={cn(
                                "group flex flex-col gap-1 px-4 py-3.5 transition",
                                "bg-white dark:bg-slate-900",
                                "hover:bg-slate-50 dark:hover:bg-slate-800",
                                todo.done && "opacity-60",
                                isDragging && "bg-slate-100 dark:bg-slate-800 shadow-md",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  ref={setActivatorNodeRef}
                                  {...attributes}
                                  {...listeners}
                                  className="cursor-pointer rounded p-1 text-slate-400 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                  aria-label="Drag to reorder"
                                >
                                  <GripVertical className="size-4" />
                                </button>
                                <Checkbox
                                  checked={todo.done}
                                  onCheckedChange={(checked) => toggleTodo(todo.id, checked === true)}
                                  aria-label={`Mark ${todo.text || "task"} as ${todo.done ? "todo" : "done"}`}
                                  className="cursor-pointer"
                                />
                                <div className="flex flex-1 items-center gap-2">
                                  <input
                                    ref={(node) => {
                                      inputRefs.current[todo.id] = node;
                                    }}
                                    value={editingTexts[todo.id] ?? todo.text}
                                    onChange={(event) => handleTextChange(todo.id, event.target.value)}
                                    onFocus={() => handleTextFocus(todo.id)}
                                    onBlur={() => handleTextBlur(todo.id)}
                                    onKeyDown={(event) => handleInputKeyDown(todo.id, event)}
                                    aria-label="Edit todo text"
                                    placeholder="Type to describe the task"
                                    className={cn(
                                      "flex-1 bg-transparent text-base outline-none transition",
                                      "border-b border-transparent",
                                      "hover:border-slate-300 dark:hover:border-slate-600",
                                      todo.done && "line-through text-muted-foreground",
                                    )}
                                  />
        </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                    >
                                      {todo.color !== "none" ? (
                                        <span
                                          className={cn("size-3.5 rounded-full", colorConfig.dot)}
                                          aria-label={`Priority: ${colorConfig.label}`}
                                        />
                                      ) : (
                                        <Flag className="size-4" />
                                      )}
                                      <span className="sr-only">Priority</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                                      Priority
                                    </DropdownMenuLabel>
                                    {COLOR_OPTIONS.map((option) => (
                                      <DropdownMenuItem
                                        key={option.value}
                                        onClick={() => updateTodoColor(todo.id, option.value)}
                                        className="gap-3 text-sm"
                                      >
                                        <span
                                          className={cn("size-3 rounded-full", option.dot)}
                                          aria-hidden
                                        />
                                        {option.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 opacity-0 transition group-hover:opacity-100"
                                    >
                                      <span className="sr-only">Options</span>
                                      <span className="text-xs">⋯</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                                      Actions
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                      onClick={() => rewriteTodo(todo.id, todo.text)}
                                      disabled={!todo.text.trim() || rewritingId === todo.id}
                                      className="text-sm"
                                    >
                                      <Sparkles className="mr-2 size-4" />
                                      {rewritingId === todo.id ? "Rewriting..." : "Rewrite with AI"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => removeTodo(todo.id)}
                                      className="text-sm text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 size-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          )}
                        </SortableTodo>
                      );
                    })}
                  </div>
                )}
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        <div className="pt-2">
          <Button
            type="button"
            onClick={addTodo}
            className="h-11 w-full gap-2 text-base"
          >
            <Plus className="size-4" />
            Add task
            <span className="text-xs text-muted-foreground">(Shift + Enter)</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

type SortableRenderProps = {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
  isDragging: boolean;
};

function SortableTodo({
  id,
  children,
}: {
  id: string;
  children: (props: SortableRenderProps) => React.ReactNode;
}) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners, setActivatorNodeRef, isDragging })}
    </div>
  );
}
