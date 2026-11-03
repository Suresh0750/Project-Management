'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, Lock, LoaderCircle } from 'lucide-react';
import { PriorityBadge } from '@/components/projects/project-badges';
import { useToast } from '@/components/ui/toast-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { useUpdateTaskStatus } from '@/features/tasks/hooks';
import {
  isOverdue,
  TASK_STATUS_LABEL,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from '@/types/task';
import { formatCalendarDate } from '@/utils/format';
import { cn } from '@/utils/cn';

type Columns = Record<TaskStatus, Task[]>;

function groupByStatus(tasks: Task[]): Columns {
  const columns: Columns = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], COMPLETED: [] };
  for (const task of tasks) columns[task.status].push(task);
  return columns;
}

function isStatus(id: string | number): id is TaskStatus {
  return TASK_STATUSES.some((status) => status === id);
}

function findContainer(columns: Columns, id: string | number): TaskStatus | undefined {
  if (isStatus(id)) return id;
  return TASK_STATUSES.find((status) => columns[status].some((task) => task.id === id));
}

function CardBody({ task, href, saving }: { task: Task; href?: string; saving?: boolean }) {
  const overdue = isOverdue(task);
  const title = href ? (
    <Link href={href} className="hover:underline">
      {task.title}
    </Link>
  ) : (
    task.title
  );

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium">{title}</p>
        {saving && (
          <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" aria-label="Saving" />
        )}
        {!task.permissions.canChangeStatus && !saving && (
          <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="You cannot move this task" />
        )}
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">{task.project.name}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs',
              overdue ? 'font-medium text-danger' : 'text-muted-foreground',
            )}
          >
            <CalendarDays className="size-3" aria-hidden="true" />
            {formatCalendarDate(task.dueDate)}
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-xs text-muted-foreground">
        {task.assignee ? task.assignee.name : 'Unassigned'}
      </p>
    </>
  );
}

function SortableCard({ task, href, saving }: { task: Task; href: string; saving: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !task.permissions.canChangeStatus || saving,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-lg border border-border bg-surface p-3 shadow-sm',
        task.permissions.canChangeStatus && !saving && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      {...attributes}
      {...listeners}
    >
      <CardBody task={task} href={href} saving={saving} />
    </li>
  );
}

function Column({
  status,
  tasks,
  basePath,
  savingId,
}: {
  status: TaskStatus;
  tasks: Task[];
  basePath: string;
  savingId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      aria-label={`${TASK_STATUS_LABEL[status]}, ${tasks.length} tasks`}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-xl border bg-surface-muted/60 lg:w-auto',
        isOver ? 'border-primary' : 'border-border',
      )}
    >
      <header className="flex items-center justify-between px-3 py-2.5">
        <h3 className="text-sm font-semibold">{TASK_STATUS_LABEL[status]}</h3>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="min-h-24 flex-1 space-y-2 px-2 pb-2">
          {tasks.map((task) => (
            <SortableCard
              key={task.id}
              task={task}
              href={`${basePath}/${task.id}`}
              saving={savingId === task.id}
            />
          ))}
          {tasks.length === 0 && (
            <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              No tasks
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}

export function KanbanBoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto lg:grid lg:grid-cols-4" aria-busy="true" aria-label="Loading board">
      {TASK_STATUSES.map((status) => (
        <div key={status} className="w-72 shrink-0 space-y-2 rounded-xl border border-border p-3 lg:w-auto">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
}

interface KanbanBoardProps {
  tasks: Task[];
  /** Route prefix for task links, e.g. "/manager/tasks". */
  basePath: string;
}

export function KanbanBoard({ tasks, basePath }: KanbanBoardProps) {
  const toast = useToast();
  const updateStatus = useUpdateTaskStatus();

  // Local copy drives the optimistic UI; it re-syncs whenever fresh server data arrives.
  const [prevTasks, setPrevTasks] = useState(tasks);
  const [columns, setColumns] = useState(() => groupByStatus(tasks));
  if (tasks !== prevTasks) {
    setPrevTasks(tasks);
    setColumns(groupByStatus(tasks));
  }

  const [activeId, setActiveId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const origin = useRef<{ status: TaskStatus; index: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeTask = activeId
    ? TASK_STATUSES.flatMap((status) => columns[status]).find((task) => task.id === activeId)
    : undefined;

  const handleDragStart = ({ active }: DragStartEvent) => {
    const status = findContainer(columns, active.id);
    if (!status) return;
    setActiveId(String(active.id));
    origin.current = { status, index: columns[status].findIndex((task) => task.id === active.id) };
  };

  // Move the card into the hovered column as soon as it crosses over.
  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = findContainer(columns, active.id);
    const to = findContainer(columns, over.id);
    if (!from || !to || from === to) return;

    setColumns((current) => {
      const moving = current[from].find((task) => task.id === active.id);
      if (!moving) return current;
      const overIndex = current[to].findIndex((task) => task.id === over.id);
      const insertAt = overIndex >= 0 ? overIndex : current[to].length;
      return {
        ...current,
        [from]: current[from].filter((task) => task.id !== active.id),
        [to]: [
          ...current[to].slice(0, insertAt),
          { ...moving, status: to },
          ...current[to].slice(insertAt),
        ],
      };
    });
  };

  const rollback = () => setColumns(groupByStatus(tasks));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    const start = origin.current;
    origin.current = null;
    if (!over || !start) {
      rollback();
      return;
    }

    const container = findContainer(columns, active.id);
    if (!container) {
      rollback();
      return;
    }

    let next = columns;
    if (findContainer(columns, over.id) === container && over.id !== active.id) {
      const list = columns[container];
      const from = list.findIndex((task) => task.id === active.id);
      const to = list.findIndex((task) => task.id === over.id);
      if (from >= 0 && to >= 0 && from !== to) {
        next = { ...columns, [container]: arrayMove(list, from, to) };
        setColumns(next);
      }
    }

    const finalList = next[container];
    const index = finalList.findIndex((task) => task.id === active.id);
    if (container === start.status && index === start.index) return; // dropped where it started

    const taskId = String(active.id);
    setSavingId(taskId);
    updateStatus.mutate(
      { id: taskId, status: container, beforeTaskId: finalList[index + 1]?.id ?? null },
      {
        onSuccess: () => toast.success(`Moved to ${TASK_STATUS_LABEL[container]}`),
        onError: (error) => {
          rollback();
          toast.error(error.message);
        },
        onSettled: () => setSavingId(null),
      },
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        origin.current = null;
        rollback();
      }}
    >
      <div
        className="flex items-start gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible"
        aria-busy={savingId !== null}
      >
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={columns[status]}
            basePath={basePath}
            savingId={savingId}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 rounded-lg border border-primary bg-surface p-3 shadow-lg">
            <CardBody task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
      <p className="sr-only" aria-live="polite">
        {savingId ? 'Saving task position' : ''}
      </p>
    </DndContext>
  );
}
