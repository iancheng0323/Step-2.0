"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  LogOut, 
  Settings, 
  Plus, 
  Trash2, 
  List,
  FileText,
  ChevronRight,
} from "lucide-react";
import {
  subscribeToLists,
  addList,
  deleteList,
  reorderLists,
  type TodoList,
} from "@/lib/firebase/lists";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [lists, setLists] = useState<TodoList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag activates
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Subscribe to lists
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToLists(user.uid, (fetchedLists) => {
      setLists(fetchedLists);
      // Don't auto-redirect - let the URL determine the state
    });

    return () => unsubscribe();
  }, [user]);

  // Get listId from URL
  useEffect(() => {
    if (pathname === "/") {
      const params = new URLSearchParams(window.location.search);
      const listId = params.get("listId");
      if (listId) {
        setSelectedListId(listId);
      } else {
        // If no listId in URL, clear selectedListId (user is on home page)
        setSelectedListId(null);
      }
    }
  }, [pathname, searchParams]);

  const handleCreateList = async () => {
    if (!user || !newListName.trim()) return;

    const maxOrder = lists.length > 0 ? Math.max(...lists.map(l => l.order ?? 0)) : -1;
    await addList(user.uid, {
      name: newListName.trim(),
      description: newListDescription.trim(),
      createdAt: Date.now(),
      order: maxOrder + 1,
    });

    setNewListName("");
    setNewListDescription("");
    setIsCreateDialogOpen(false);
  };

  const handleDeleteList = async () => {
    if (!user || !listToDelete) return;

    await deleteList(user.uid, listToDelete);
    setIsDeleteDialogOpen(false);
    setListToDelete(null);

    // If we deleted the selected list, navigate to first available list or home
    if (listToDelete === selectedListId) {
      const remainingLists = lists.filter(l => l.id !== listToDelete);
      if (remainingLists.length > 0) {
        const firstListId = remainingLists[0].id;
        setSelectedListId(firstListId);
        router.push(`/?listId=${firstListId}`);
      } else {
        setSelectedListId(null);
        router.push("/");
      }
    }
  };

  const handleListClick = (listId: string) => {
    setSelectedListId(listId);
    router.push(`/?listId=${listId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, listId: string) => {
    e.stopPropagation();
    setListToDelete(listId);
    setIsDeleteDialogOpen(true);
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!user) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = lists.findIndex((list) => list.id === active.id);
      const newIndex = lists.findIndex((list) => list.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedLists = arrayMove(lists, oldIndex, newIndex);
      await reorderLists(user.uid, reorderedLists);
    },
    [user, lists],
  );

  return (
    <>
      <div className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-800">
          <h1 className="text-lg font-semibold">Life Planner</h1>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              // Navigate to home page without any list selected
              setSelectedListId(null);
              router.push("/");
            }}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/" && !searchParams.get("listId")
                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50",
            )}
          >
            <Home className="size-5" />
            Home
          </Link>
          
          <div className="my-2 border-t border-slate-200 dark:border-slate-800" />
          
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Lists
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={lists.map((list) => list.id)}
              strategy={verticalListSortingStrategy}
            >
              {lists.map((list) => {
                const currentListId = searchParams.get("listId");
                const isActive = pathname === "/" && currentListId === list.id;
                return (
                  <SortableListItem
                    key={list.id}
                    list={list}
                    isActive={isActive}
                    onListClick={handleListClick}
                    onDeleteClick={handleDeleteClick}
                  />
                );
              })}
            </SortableContext>
          </DndContext>

          {lists.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              No lists yet. Create one to get started.
            </div>
          )}
        </nav>
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-2 flex items-center justify-between px-3">
            <div className="text-xs text-muted-foreground">
              {user?.email}
            </div>
            <DropdownMenu open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Settings className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/brief" className="flex items-center gap-2">
                    <FileText className="size-4" />
                    Personal Brief
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full justify-start gap-2 text-sm"
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Create List Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
            <DialogDescription>
              Create a new list to organize your todos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="list-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="list-name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Enter list name"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newListName.trim()) {
                    handleCreateList();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="list-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="list-description"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Enter list description (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewListName("");
                setNewListDescription("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateList} disabled={!newListName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete List</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this list? This action cannot be undone and will also delete all todos in this list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setListToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteList}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type SortableListItemProps = {
  list: TodoList;
  isActive: boolean;
  onListClick: (listId: string) => void;
  onDeleteClick: (e: React.MouseEvent, listId: string) => void;
};

function SortableListItem({
  list,
  isActive,
  onListClick,
  onDeleteClick,
}: SortableListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Only handle click if not dragging (activation constraint prevents drag on simple click)
        if (!isDragging) {
          onListClick(list.id);
        }
      }}
      className={cn(
        "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
        isActive
          ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50",
        isDragging && "opacity-50 z-50 cursor-grabbing",
      )}
    >
      <List className="size-4 flex-shrink-0" />
      <span className="flex-1 truncate">{list.name || "Unnamed List"}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick(e, list.id);
        }}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
}

