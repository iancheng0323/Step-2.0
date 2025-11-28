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
import { Eye, EyeOff, GripVertical, Palette, Plus, Trash2 } from "lucide-react";

type TodoColor = "none" | "red" | "green" | "yellow" | "blue";

type GoalCategory = "career" | "health" | "relationships" | "personal-growth" | "finance" | "hobbies" | "other";

type Todo = {
  id: string;
  text: string;
  done: boolean;
  color: TodoColor;
  category: GoalCategory | null;
  createdAt: number;
};

const STORAGE_KEY = "todolist-webapp";
const DEFAULT_COLOR: TodoColor = "none";

const COLOR_OPTIONS: Array<{
  value: TodoColor;
  label: string;
  dot: string;
  focusColor: string;
}> = [
  { value: "none", label: "No color", dot: "bg-slate-300", focusColor: "border-slate-500" },
  { value: "red", label: "Red", dot: "bg-red-500", focusColor: "border-red-500" },
  { value: "yellow", label: "Yellow", dot: "bg-yellow-400", focusColor: "border-yellow-500" },
  { value: "blue", label: "Blue", dot: "bg-blue-500", focusColor: "border-blue-500" },
  { value: "green", label: "Green", dot: "bg-green-500", focusColor: "border-green-500" },
];

const COLOR_LOOKUP = COLOR_OPTIONS.reduce<Record<TodoColor, (typeof COLOR_OPTIONS)[number]>>(
  (acc, option) => {
    acc[option.value] = option;
    return acc;
  },
  {} as Record<TodoColor, (typeof COLOR_OPTIONS)[number]>,
);

const GOAL_CATEGORIES: Array<{ value: GoalCategory; label: string }> = [
  { value: "career", label: "Career" },
  { value: "health", label: "Health" },
  { value: "relationships", label: "Relationships" },
  { value: "personal-growth", label: "Personal Growth" },
  { value: "finance", label: "Finance" },
  { value: "hobbies", label: "Hobbies" },
  { value: "other", label: "Other" },
];

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Todo[];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTodos(parsed);
    } catch {
      // ignore bad payloads
    }
  }, []);

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

  const addTodo = useCallback(() => {
    const id = crypto.randomUUID();
    const newEntry: Todo = {
      id,
      text: "",
      done: false,
      color: DEFAULT_COLOR,
      category: null,
      createdAt: Date.now(),
    };
    setTodos((prev) => [...prev, newEntry]);
    setShowCompleted(true);
    setPendingFocusId(id);
  }, [setShowCompleted]);

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

  const visibleTodos = useMemo(
    () => (showCompleted ? todos : todos.filter((todo) => !todo.done)),
    [showCompleted, todos],
  );

  const toggleTodo = (id: string, nextChecked: boolean) => {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, done: nextChecked } : todo)));
  };

  const updateTodoText = (id: string, text: string) => {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, text } : todo)));
  };

  const updateTodoColor = (id: string, color: TodoColor) => {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, color } : todo)));
  };

  const updateTodoCategory = (id: string, category: GoalCategory | null) => {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, category } : todo)));
  };

  const removeTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setTodos((prev) => {
        const oldIndex = prev.findIndex((todo) => todo.id === active.id);
        const newIndex = prev.findIndex((todo) => todo.id === over.id);
        if (oldIndex === -1 || newIndex === -1) {
          return prev;
        }
        return arrayMove(prev, oldIndex, newIndex);
      });
    },
    [setTodos],
  );

  const handleInputKeyDown = (id: string, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "Escape") {
      event.currentTarget.blur();
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-auto bg-gradient-to-b from-slate-50 to-white px-4 py-10 text-slate-900 dark:from-slate-900 dark:to-slate-950 dark:text-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-2xl">To‑Do List</CardTitle>
            <Toggle
              pressed={!showCompleted}
              onPressedChange={(pressed) => setShowCompleted(!pressed)}
              aria-label="Hide completed tasks"
              className="gap-2 text-sm"
            >
              {showCompleted ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              {showCompleted ? "Showing done" : "Hidden done"}
            </Toggle>
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
                      const colorConfig = COLOR_LOOKUP[todo.color];
                      const categoryLabel = todo.category
                        ? GOAL_CATEGORIES.find((c) => c.value === todo.category)?.label
                        : null;
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
                                    value={todo.text}
                                    onChange={(event) => updateTodoText(todo.id, event.target.value)}
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
                                      className="h-7 w-7 p-0 opacity-0 transition group-hover:opacity-100"
                                    >
                                      {todo.color !== "none" ? (
                                        <span
                                          className={cn("size-3.5 rounded-full", colorConfig.dot)}
                                          aria-label={`Color: ${colorConfig.label}`}
                                        />
                                      ) : (
                                        <Palette className="size-4" />
                                      )}
                                      <span className="sr-only">Color</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                                      Color
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
                                      Category
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                      onClick={() => updateTodoCategory(todo.id, null)}
                                      className="text-sm"
                                    >
                                      No category
                                    </DropdownMenuItem>
                                    {GOAL_CATEGORIES.map((category) => (
                                      <DropdownMenuItem
                                        key={category.value}
                                        onClick={() => updateTodoCategory(todo.id, category.value)}
                                        className="text-sm"
                                      >
                                        {category.label}
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                                      Actions
                                    </DropdownMenuLabel>
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
                              {categoryLabel && (
                                <div className="ml-11 flex items-center">
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    {categoryLabel}
                                  </span>
                                </div>
                              )}
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
