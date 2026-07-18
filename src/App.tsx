import { useState } from 'react';
import { TickerHost } from './features/TickerHost';
import { ProjectsSidebar } from './features/projects/ProjectsSidebar';
import { Board } from './features/board/Board';
import { CalendarView } from './features/calendar/CalendarView';
import { TodoDetail } from './features/todo-detail/TodoDetail';
import { store } from './store/storeInstance';
import styles from './App.module.css';

function App() {
  const projects = store((s) => s.projects);
  const todos = store((s) => s.todos);
  const activeView = store((s) => s.ui.activeView);
  const setActiveView = store((s) => s.setActiveView);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [openTodoId, setOpenTodoId] = useState<string | null>(null);

  const selectedProject =
    selectedProjectId === null
      ? null
      : projects.find((p) => p.id === selectedProjectId) ?? null;

  // Close the detail panel if its todo no longer exists.
  const openTodoExists = openTodoId !== null && todos.some((t) => t.id === openTodoId);
  const activeTodoId = openTodoExists ? openTodoId : null;

  return (
    <div className={styles.shell}>
      <header className={styles.banner} role="banner">
        <h1 className={styles.title}>Orderly</h1>
        <span className={styles.filterLabel}>
          {selectedProject === null ? 'All projects' : selectedProject.name}
        </span>
        <div className={styles.viewSwitch} role="group" aria-label="View">
          <button
            type="button"
            className={styles.viewButton}
            aria-pressed={activeView === 'board'}
            data-active={activeView === 'board' || undefined}
            onClick={() => setActiveView('board')}
          >
            Board
          </button>
          <button
            type="button"
            className={styles.viewButton}
            aria-pressed={activeView === 'calendar'}
            data-active={activeView === 'calendar' || undefined}
            onClick={() => setActiveView('calendar')}
          >
            Calendar
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <ProjectsSidebar
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
        />

        <main className={styles.main}>
          {activeView === 'board' ? (
            <section className={styles.boardRegion} aria-label="Board" role="region">
              <Board filterProjectId={selectedProjectId} onOpenTodo={setOpenTodoId} />
            </section>
          ) : (
            <section className={styles.boardRegion} aria-label="Calendar" role="region">
              <CalendarView onOpenTodo={setOpenTodoId} />
            </section>
          )}
        </main>

        {activeTodoId !== null && (
          <TodoDetail todoId={activeTodoId} onClose={() => setOpenTodoId(null)} />
        )}
      </div>

      <TickerHost />
    </div>
  );
}

export default App;
